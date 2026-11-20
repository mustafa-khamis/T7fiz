import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { validateEmail } from '../auth/auth-helpers.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmailField, TextField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { useMe } from '../account/MeProvider.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { ApplicationQueue } from '../applications/ApplicationQueue.jsx';
import styles from './AdminPage.module.css';
import { ReviewListSkeleton, AdminSkeleton } from './AdminSkeletons.jsx';
import { AuditTab, BillingTab, ReportsTab, SettingsTab, UsersTab } from './AdminTools.jsx';


// ---- Sheikh approvals --------------------------------------------------------
function GrantApprovalForm({ onGranted }) {
  const { t } = useI18n();
  const action = useMutation();
  const [granted, setGranted] = useState(null);
  const errorRef = useRef(null);
  useFocusWhen(errorRef, action.error);
  const { formRef, field, handleSubmit, setValue } = useForm({ initial: { email: '' }, validate: (v) => ({ email: validateEmail(v.email) }), t });

  const submit = handleSubmit(async ({ email }) => {
    const approval = await action.run('grant', (api) => api.post('/api/v1/admin/sheikh-approvals', { email: email.trim() }));
    if (approval) {
      setGranted(approval);
      setValue('email', '');
      onGranted(approval);
    }
  });

  return (
    <form ref={formRef} className={styles.grant} onSubmit={submit} noValidate>
      <h2 className={styles.sectionTitle}>{t('admin.approvals.grantTitle')}</h2>
      <p className={styles.muted}>{t('admin.approvals.grantHelp')}</p>
      {action.error && (
        <Alert ref={errorRef} tabIndex={-1} tone="danger">
          {errorMessage(t, action.error)}
        </Alert>
      )}
      {granted && <Alert tone="success">{t('admin.approvals.granted', { name: granted.sheikh.name })}</Alert>}
      <div className={styles.inline}>
        <EmailField label={t('admin.approvals.email')} autoComplete="off" {...field('email', { transformOnBlur: (value) => value.trim() })} />
        <Button type="submit" loading={action.busy === 'grant'}>
          {t('admin.approvals.grant')}
        </Button>
      </div>
    </form>
  );
}

function ApprovalCard({ approval, onChanged }) {
  const { t, formatters } = useI18n();
  const action = useMutation();
  const [managing, setManaging] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const transitions = approval.status === 'active' ? ['suspend', 'revoke'] : approval.status === 'suspended' ? ['reinstate', 'revoke'] : [];

  async function act(kind) {
    if (reason.trim().length < 5) {
      setReasonError(t('admin.reasonRequired'));
      return;
    }
    const updated = await action.run(kind, (api) => api.post(`/api/v1/sheikh-approvals/${approval.id}/${kind}`, { reason: reason.trim() }));
    if (updated) {
      setManaging(false);
      setReason('');
      onChanged(updated);
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{approval.sheikh.name}</h3>
        <StatusBadge status={approval.status} />
      </div>
      <p className={styles.meta}>
        {t(`auth.gender.${approval.sheikh.gender}`)} · {t('admin.since', { date: formatters.date(approval.createdAt) })}
        {approval.statusReason && ` · ${approval.statusReason}`}
      </p>
      {action.error && <Alert tone="danger">{errorMessage(t, action.error)}</Alert>}
      {transitions.length > 0 &&
        (managing ? (
          <div className={styles.manage}>
            <TextField
              label={t('admin.reason')}
              hint={t('admin.reasonHint')}
              value={reason}
              maxLength={1000}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              error={reasonError}
            />
            <div className={styles.cardActions}>
              {transitions.map((kind) => (
                <Button key={kind} size="sm" variant={kind === 'revoke' ? 'danger' : 'secondary'} loading={action.busy === kind} onClick={() => act(kind)}>
                  {t(`admin.approvals.${kind}`)}
                </Button>
              ))}
              <Button size="sm" variant="quiet" onClick={() => setManaging(false)}>
                {t('common.actions.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.cardActions}>
            <Button size="sm" variant="secondary" onClick={() => setManaging(true)}>
              {t('admin.approvals.manage')}
            </Button>
          </div>
        ))}
    </article>
  );
}

function ApprovalsTab() {
  const { t } = useI18n();
  const query = useApiQuery('/api/v1/admin/sheikh-approvals');
  const upsert = (approval) => query.setData((items) => [approval, ...(items ?? []).filter((item) => item.id !== approval.id)]);
  return (
    <div className={styles.tab}>
      <GrantApprovalForm onGranted={upsert} />
      <h2 className={styles.sectionTitle}>{t('admin.approvals.listTitle')}</h2>
      {query.status === 'loading' && <ReviewListSkeleton rows={2} />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' &&
        (query.data.length === 0 ? (
          <EmptyState title={t('admin.approvals.emptyTitle')} body={t('admin.approvals.emptyBody')} />
        ) : (
          <div className={styles.list}>
            {query.data.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} onChanged={upsert} />
            ))}
          </div>
        ))}
    </div>
  );
}

// ---- Reviews (institutions, independent main circles) -------------------------
function ReviewCard({ item, kind, onChanged }) {
  const { t, formatters } = useI18n();
  const action = useMutation();
  const [note, setNote] = useState('');
  const base = kind === 'institution' ? `/api/v1/admin/institutions/${item.id}/review` : `/api/v1/admin/main-circles/${item.id}/review`;
  const decisions = {
    pending_review: ['approve', 'reject'],
    active: ['suspend'],
    suspended: ['reinstate'],
  }[item.status] ?? [];

  async function decide(decision) {
    const updated = await action.run(decision, (api) => api.post(base, { decision, ...(note.trim() ? { note: note.trim() } : {}) }));
    if (updated) onChanged(updated);
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{item.name}</h3>
        <StatusBadge status={item.status} />
      </div>
      <p className={styles.meta}>
        {kind === 'institution'
          ? `${t(`admin.kind.${item.kind}`)} · ${t(`admin.audience.${item.audience}`)}`
          : t(`admin.circleGender.${item.gender}`)}
        {item.creatorName && ` · ${t('admin.by', { name: item.creatorName })}`} · {formatters.date(item.createdAt)}
      </p>
      {item.description && <p className={styles.description}>{item.description}</p>}
      {action.error && <Alert tone="danger">{errorMessage(t, action.error)}</Alert>}
      {decisions.length > 0 && (
        <div className={styles.manage}>
          <TextField label={t('admin.note')} optional value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} hint={t('admin.noteHint')} />
          <div className={styles.cardActions}>
            {decisions.map((decision) => (
              <Button
                key={decision}
                size="sm"
                variant={decision === 'approve' || decision === 'reinstate' ? 'primary' : decision === 'reject' ? 'danger' : 'secondary'}
                loading={action.busy === decision}
                disabled={Boolean(action.busy)}
                onClick={() => decide(decision)}
              >
                {t(`admin.decisions.${decision}`)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function ReviewTab({ kind, status, onStatus }) {
  const { t } = useI18n();
  const path = `/api/v1/admin/${kind === 'institution' ? 'institutions' : 'main-circles'}?status=${status}`;
  const query = useApiQuery(path);
  const replace = (updated) => query.setData((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  return (
    <div className={styles.tab}>
      <div className={styles.filters} role="group" aria-label={t('admin.filterLabel')}>
        {['pending_review', 'active', 'suspended', 'rejected'].map((value) => (
          <Button key={value} size="sm" variant={value === status ? 'primary' : 'secondary'} aria-pressed={value === status} onClick={() => onStatus(value)}>
            {t(`status.${value}`)}
          </Button>
        ))}
      </div>
      {query.status === 'loading' && <ReviewListSkeleton />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' &&
        (query.data.length === 0 ? (
          <EmptyState title={t(`admin.empty.${status}`)} body={status === 'pending_review' ? t('admin.empty.pendingBody') : null} />
        ) : (
          <div className={styles.list} aria-busy={query.refreshing || undefined}>
            {query.data.map((item) => (
              <ReviewCard key={item.id} item={item} kind={kind} onChanged={replace} />
            ))}
          </div>
        ))}
    </div>
  );
}

/** Platform administration: Sheikh approvals and reviews of institutions and independent circles. */
export function AdminPage() {
  const { status, me } = useMe();
  if (status !== 'ready') return <AdminSkeleton />;
  // The admin area is not advertised to others (the API refuses them regardless).
  if (!me.platformRoles.some((role) => role === 'platform_admin' || role === 'sheikh_reviewer')) return <NotFoundPage />;
  return <AdminConsole isAdmin={me.platformRoles.includes('platform_admin')} />;
}

function AdminConsole({ isAdmin }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('applications');
  const [statuses, setStatuses] = useState({ institution: 'pending_review', mainCircle: 'pending_review' });
  const pendingInstitutions = useApiQuery('/api/v1/admin/institutions?status=pending_review', { enabled: isAdmin });
  const pendingCircles = useApiQuery('/api/v1/admin/main-circles?status=pending_review', { enabled: isAdmin });
  const openReports = useApiQuery('/api/v1/admin/reports?status=open', { enabled: isAdmin });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('admin.title')}</h1>
        <p className={styles.muted}>{t('admin.subtitle')}</p>
      </header>
      <Tabs
        label={t('admin.title')}
        selected={tab}
        onSelect={setTab}
        tabs={[
          { id: 'applications', label: t('admin.tabs.applications') },
          { id: 'approvals', label: t('admin.tabs.approvals') },
          ...(isAdmin
            ? [
                { id: 'institutions', label: t('admin.tabs.institutions'), count: pendingInstitutions.data?.length ?? 0 },
                { id: 'circles', label: t('admin.tabs.circles'), count: pendingCircles.data?.length ?? 0 },
                { id: 'users', label: t('adminTools.tabs.users') },
                { id: 'billing', label: t('adminTools.tabs.billing') },
                { id: 'reports', label: t('adminTools.tabs.reports'), count: openReports.data?.length ?? 0 },
                { id: 'settings', label: t('adminTools.tabs.settings') },
                { id: 'audit', label: t('adminTools.tabs.audit') },
              ]
            : []),
        ]}
      >
        {tab === 'applications' && <ApplicationQueue path="/api/v1/admin/sheikh-applications" />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'institutions' && (
          <ReviewTab kind="institution" status={statuses.institution} onStatus={(value) => setStatuses((s) => ({ ...s, institution: value }))} />
        )}
        {tab === 'circles' && (
          <ReviewTab kind="mainCircle" status={statuses.mainCircle} onStatus={(value) => setStatuses((s) => ({ ...s, mainCircle: value }))} />
        )}
        {tab === 'users' && <UsersTab />}
        {tab === 'billing' && <BillingTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'audit' && <AuditTab />}
      </Tabs>
    </div>
  );
}
