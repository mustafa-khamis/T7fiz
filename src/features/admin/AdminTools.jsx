import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { formatMoney, parseMoney } from '../../lib/money.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { ReviewListSkeleton } from './AdminSkeletons.jsx';
import styles from './AdminPage.module.css';

const today = () => new Date().toISOString().slice(0, 10);

// ---- Users ---------------------------------------------------------------------------------
function UserCard({ user, onChanged }) {
  const { t, formatters } = useI18n();
  const mutation = useMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  async function setStatus(status) {
    if (status !== 'active' && reason.trim().length < 3) return setError(t('adminTools.reasonRequired'));
    setError(null);
    const body = status === 'active' ? { status } : { status, reason: reason.trim() };
    if (await mutation.run(status, (api) => api.post(`/api/v1/admin/users/${user.id}/status`, body))) {
      setOpen(false);
      setReason('');
      onChanged();
    }
  }

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{user.displayName ?? user.email}</h3>
        <StatusBadge status={user.accountStatus === 'deactivated' ? 'closed' : user.accountStatus} />
      </div>
      <p className={styles.meta}>
        <bdi dir="ltr">{user.email}</bdi>
        {' · '}
        {t(`adminTools.gender.${user.gender ?? 'unset'}`)}
        {' · '}
        {t('admin.since', { date: formatters.date(user.createdAt, { dateStyle: 'medium' }) })}
        {user.platformRoles.length > 0 && ` · ${user.platformRoles.map((r) => t(`adminTools.roles.${r}`)).join('، ')}`}
      </p>
      {user.statusReason && <p className={styles.description}>{user.statusReason}</p>}
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {user.accountStatus === 'active' ? (
        open ? (
          <div className={styles.manage}>
            <TextAreaField label={t('admin.reason')} hint={t('adminTools.statusReasonHint')} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} error={error} />
            <div className={styles.cardActions}>
              <Button size="sm" variant="danger" loading={mutation.busy === 'suspended'} onClick={() => setStatus('suspended')}>
                {t('adminTools.suspendAccount')}
              </Button>
              <Button size="sm" variant="secondary" loading={mutation.busy === 'deactivated'} onClick={() => setStatus('deactivated')}>
                {t('adminTools.deactivateAccount')}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setOpen(false)}>
                {t('common.actions.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.cardActions}>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              {t('adminTools.changeStatus')}
            </Button>
          </div>
        )
      ) : (
        <div className={styles.cardActions}>
          <Button size="sm" loading={mutation.busy === 'active'} onClick={() => setStatus('active')}>
            {t('adminTools.reactivate')}
          </Button>
        </div>
      )}
    </li>
  );
}

export function UsersTab() {
  const { t, formatters } = useI18n();
  const [draft, setDraft] = useState('');
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 });
  const params = new URLSearchParams({ page: String(filters.page), ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}) });
  const query = useApiQuery(`/api/v1/admin/users?${params}`);
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1;

  return (
    <div className={styles.tab}>
      <form
        className={styles.filters}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters((f) => ({ ...f, q: draft.trim(), page: 1 }));
        }}
      >
        <TextField label={t('adminTools.searchUsers')} type="search" optional value={draft} onChange={(e) => setDraft(e.target.value)} hint={t('adminTools.searchHint')} />
        <SelectField label={t('admin.filterLabel')} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">{t('adminTools.allStatuses')}</option>
          {['active', 'suspended', 'deactivated'].map((s) => (
            <option key={s} value={s}>
              {t(`adminTools.accountStatus.${s}`)}
            </option>
          ))}
        </SelectField>
      </form>
      {query.status === 'loading' && <ReviewListSkeleton />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.items.length === 0 && <EmptyState title={t('adminTools.noUsers')} />}
      {query.status === 'ready' && query.data.items.length > 0 && (
        <>
          <p className={styles.muted}>{t('adminTools.userCount', { count: query.data.total })}</p>
          <ul className={styles.list}>
            {query.data.items.map((u) => (
              <UserCard key={u.id} user={u} onChanged={query.reload} />
            ))}
          </ul>
          {pages > 1 && (
            <div className={styles.cardActions}>
              <Button size="sm" variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                {t('adminTools.previous')}
              </Button>
              <span className={styles.muted}>{t('adminTools.pageOf', { page: formatters.integer(filters.page), pages: formatters.integer(pages) })}</span>
              <Button size="sm" variant="secondary" disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                {t('adminTools.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Billing ---------------------------------------------------------------------------------
function PlanForm({ onSaved }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [form, setForm] = useState({ code: '', nameAr: '', nameEn: '', price: '', currency: 'USD' });
  const [errors, setErrors] = useState({});
  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  async function submit(event) {
    event.preventDefault();
    const currency = form.currency.trim().toUpperCase();
    const monthlyPriceMinor = parseMoney(form.price, currency);
    const next = {
      code: /^[a-z][a-z0-9_-]{1,39}$/.test(form.code) ? null : t('adminTools.codeHint'),
      nameAr: form.nameAr.trim().length >= 2 ? null : t('adminTools.nameRequired'),
      nameEn: form.nameEn.trim().length >= 2 ? null : t('adminTools.nameRequired'),
      currency: /^[A-Z]{3}$/.test(currency) ? null : t('adminTools.currencyHint'),
      price: Number.isNaN(monthlyPriceMinor) ? t('adminTools.amountInvalid') : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const body = { code: form.code, nameAr: form.nameAr.trim(), nameEn: form.nameEn.trim(), monthlyPriceMinor, currency };
    if (await mutation.run('plan', (api) => api.post('/api/v1/admin/plans', body))) {
      setForm({ code: '', nameAr: '', nameEn: '', price: '', currency });
      onSaved();
    }
  }

  return (
    <form className={styles.grant} onSubmit={submit} noValidate>
      <h3 className={styles.sectionTitle}>{t('adminTools.newPlan')}</h3>
      <p className={styles.muted}>{t('adminTools.planHelp')}</p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      <TextField label={t('adminTools.planCode')} value={form.code} onChange={set('code')} error={errors.code} hint={errors.code ? undefined : t('adminTools.codeHint')} dir="ltr" autoComplete="off" />
      <TextField label={t('adminTools.nameAr')} value={form.nameAr} onChange={set('nameAr')} error={errors.nameAr} dir="rtl" />
      <TextField label={t('adminTools.nameEn')} value={form.nameEn} onChange={set('nameEn')} error={errors.nameEn} dir="ltr" />
      <TextField label={t('adminTools.monthlyPrice')} inputMode="decimal" value={form.price} onChange={set('price')} error={errors.price} dir="ltr" />
      <TextField label={t('adminTools.currency')} value={form.currency} onChange={set('currency')} error={errors.currency} hint={errors.currency ? undefined : t('adminTools.currencyHint')} dir="ltr" maxLength={3} autoComplete="off" />
      <span>
        <Button type="submit" loading={mutation.busy === 'plan'}>
          {t('adminTools.savePlan')}
        </Button>
      </span>
    </form>
  );
}

function PaymentForm({ subscription, plan, onSaved }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const currency = plan?.currency ?? 'USD';
  const [form, setForm] = useState({ reference: '', paidOn: today(), amount: '', months: '1', note: '' });
  const [errors, setErrors] = useState({});
  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  async function submit(event) {
    event.preventDefault();
    const amountMinor = parseMoney(form.amount, currency);
    const months = Number(form.months);
    const next = {
      reference: form.reference.trim() ? null : t('adminTools.referenceRequired'),
      amount: Number.isNaN(amountMinor) || amountMinor <= 0 ? t('adminTools.amountInvalid') : null,
      months: Number.isInteger(months) && months >= 1 && months <= 36 ? null : t('adminTools.monthsHint'),
      paidOn: form.paidOn && form.paidOn <= today() ? null : t('adminTools.paidOnInvalid'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const body = { reference: form.reference.trim(), paidOn: form.paidOn, amountMinor, currency, months, ...(form.note.trim() ? { note: form.note.trim() } : {}) };
    if (await mutation.run('pay', (api) => api.post(`/api/v1/admin/subscriptions/${subscription.id}/payments`, body))) onSaved();
  }

  return (
    <form className={styles.manage} onSubmit={submit} noValidate>
      <Alert tone="info">{t('adminTools.manualNotice')}</Alert>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      <TextField label={t('adminTools.reference')} value={form.reference} onChange={set('reference')} error={errors.reference} hint={errors.reference ? undefined : t('adminTools.referenceHint')} dir="ltr" autoComplete="off" />
      <TextField label={t('adminTools.paidOn')} type="date" max={today()} value={form.paidOn} onChange={set('paidOn')} error={errors.paidOn} dir="ltr" />
      <TextField label={t('adminTools.amountIn', { currency })} inputMode="decimal" value={form.amount} onChange={set('amount')} error={errors.amount} dir="ltr" />
      <TextField label={t('adminTools.months')} inputMode="numeric" value={form.months} onChange={set('months')} error={errors.months} hint={errors.months ? undefined : t('adminTools.monthsHint')} dir="ltr" />
      <TextAreaField label={t('adminTools.paymentNote')} optional rows={2} maxLength={1000} value={form.note} onChange={set('note')} />
      <span>
        <Button type="submit" loading={mutation.busy === 'pay'}>
          {t('adminTools.recordPayment')}
        </Button>
      </span>
    </form>
  );
}

function SubscriptionCard({ subscription, plans, onChanged }) {
  const { t, formatters, locale } = useI18n();
  const [paying, setPaying] = useState(false);
  const mutation = useMutation();
  const plan = plans.find((p) => p.id === subscription.planId);
  const closed = ['expired', 'cancelled'].includes(subscription.status);
  const act = (action) => mutation.run(action, (api) => api.post(`/api/v1/admin/subscriptions/${subscription.id}/${action}`, {})).then((r) => r && onChanged());

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{subscription.institutionName}</h3>
        <StatusBadge status={subscription.status} />
      </div>
      <p className={styles.meta}>
        {plan ? `${plan.name[locale] ?? plan.name.ar} · ${formatMoney(plan.monthlyPriceMinor, plan.currency, formatters.tag)} / ${t('adminTools.month')}` : '—'}
        {subscription.currentPeriodEnd && ` · ${t('adminTools.paidUntil', { date: formatters.date(subscription.currentPeriodEnd, { dateStyle: 'medium' }) })}`}
        {subscription.graceUntil && ` · ${t('adminTools.graceUntil', { date: formatters.date(subscription.graceUntil, { dateStyle: 'medium' }) })}`}
        {subscription.cancelAtPeriodEnd && ` · ${t('adminTools.endsAtPeriodEnd')}`}
      </p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {paying && (
        <PaymentForm
          subscription={subscription}
          plan={plan}
          onSaved={() => {
            setPaying(false);
            onChanged();
          }}
        />
      )}
      {!closed && !paying && (
        <div className={styles.cardActions}>
          <Button size="sm" onClick={() => setPaying(true)}>
            {t('adminTools.recordPayment')}
          </Button>
          {subscription.cancelAtPeriodEnd ? (
            <Button size="sm" variant="secondary" loading={mutation.busy === 'resume'} onClick={() => act('resume')}>
              {t('adminTools.resume')}
            </Button>
          ) : (
            <Button size="sm" variant="quiet" loading={mutation.busy === 'cancel'} onClick={() => act('cancel')}>
              {t('adminTools.cancelSubscription')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export function BillingTab() {
  const { t, formatters, locale } = useI18n();
  const plans = useApiQuery('/api/v1/admin/plans');
  const subs = useApiQuery('/api/v1/admin/subscriptions');
  const institutions = useApiQuery('/api/v1/admin/institutions?status=active');
  const create = useMutation();
  const [choice, setChoice] = useState({ institutionId: '', planId: '' });
  const paidInstitutions = institutions.data?.filter((i) => i.kind === 'private_paid' && !subs.data?.some((s) => s.institutionId === i.id && !['expired', 'cancelled'].includes(s.status))) ?? [];
  const activePlans = plans.data?.filter((p) => p.active) ?? [];

  async function subscribe(event) {
    event.preventDefault();
    if (!choice.institutionId || !choice.planId) return;
    if (await create.run('sub', (api) => api.post('/api/v1/admin/subscriptions', choice))) {
      setChoice({ institutionId: '', planId: '' });
      subs.reload();
    }
  }

  return (
    <div className={styles.tab}>
      <h2 className={styles.sectionTitle}>{t('adminTools.subscriptions')}</h2>
      {subs.status === 'loading' && <ReviewListSkeleton />}
      {subs.status === 'error' && <LoadError error={subs.error} onRetry={subs.reload} />}
      {subs.status === 'ready' && subs.data.length === 0 && <EmptyState title={t('adminTools.noSubscriptions')} body={t('adminTools.noSubscriptionsBody')} />}
      {subs.status === 'ready' && subs.data.length > 0 && (
        <ul className={styles.list}>
          {subs.data.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} plans={plans.data ?? []} onChanged={subs.reload} />
          ))}
        </ul>
      )}

      {paidInstitutions.length > 0 && activePlans.length > 0 && (
        <form className={styles.grant} onSubmit={subscribe}>
          <h3 className={styles.sectionTitle}>{t('adminTools.newSubscription')}</h3>
          {create.error && <Alert tone="danger">{errorMessage(t, create.error)}</Alert>}
          <SelectField label={t('adminTools.institution')} value={choice.institutionId} onChange={(e) => setChoice({ ...choice, institutionId: e.target.value })}>
            <option value="" disabled>
              {t('adminTools.choose')}
            </option>
            {paidInstitutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('adminTools.plan')} value={choice.planId} onChange={(e) => setChoice({ ...choice, planId: e.target.value })}>
            <option value="" disabled>
              {t('adminTools.choose')}
            </option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name[locale] ?? p.name.ar} — {formatMoney(p.monthlyPriceMinor, p.currency, formatters.tag)}
              </option>
            ))}
          </SelectField>
          <span>
            <Button type="submit" variant="secondary" disabled={!choice.institutionId || !choice.planId} loading={create.busy === 'sub'}>
              {t('adminTools.createSubscription')}
            </Button>
          </span>
        </form>
      )}

      <h2 className={styles.sectionTitle}>{t('adminTools.plans')}</h2>
      {plans.status === 'ready' && activePlans.length === 0 && <p className={styles.muted}>{t('adminTools.noPlans')}</p>}
      {activePlans.length > 0 && (
        <ul className={styles.list}>
          {activePlans.map((p) => (
            <li key={p.id} className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>
                  {p.name.ar} · {p.name.en}
                </h3>
                <span className={styles.muted}>v{formatters.integer(p.version)}</span>
              </div>
              <p className={styles.meta}>
                <bdi dir="ltr">{p.code}</bdi> · {formatMoney(p.monthlyPriceMinor, p.currency, formatters.tag)} / {t('adminTools.month')}
              </p>
            </li>
          ))}
        </ul>
      )}
      <PlanForm onSaved={plans.reload} />
    </div>
  );
}

// ---- Reports ----------------------------------------------------------------------------------
function ReportCard({ report, onChanged }) {
  const { t, formatters } = useI18n();
  const mutation = useMutation();
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState(null);
  async function resolve(status) {
    if (resolution.trim().length < 3) return setError(t('adminTools.resolutionRequired'));
    setError(null);
    if (await mutation.run(status, (api) => api.post(`/api/v1/admin/reports/${report.id}/resolve`, { status, resolution: resolution.trim() }))) onChanged();
  }
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          {t(`adminTools.reasons.${report.reason}`)} · {t(`adminTools.targets.${report.targetType}`)}
        </h3>
        <StatusBadge status={report.status === 'open' ? 'pending' : report.status === 'actioned' ? 'completed' : 'closed'} />
      </div>
      <p className={styles.meta}>
        {report.reporter?.name && `${report.reporter.name} · `}
        {formatters.dateTime(report.createdAt)} · <bdi dir="ltr">{report.targetId}</bdi>
      </p>
      {report.details && (
        <p className={styles.description} dir="auto">
          {report.details}
        </p>
      )}
      {report.resolution && (
        <p className={styles.description} dir="auto">
          {report.resolution}
        </p>
      )}
      {report.status === 'open' && (
        <div className={styles.manage}>
          {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
          <TextAreaField label={t('adminTools.resolution')} hint={t('adminTools.resolutionHint')} rows={2} maxLength={2000} value={resolution} onChange={(e) => setResolution(e.target.value)} error={error} />
          <div className={styles.cardActions}>
            <Button size="sm" loading={mutation.busy === 'actioned'} onClick={() => resolve('actioned')}>
              {t('adminTools.actioned')}
            </Button>
            <Button size="sm" variant="secondary" loading={mutation.busy === 'dismissed'} onClick={() => resolve('dismissed')}>
              {t('adminTools.dismiss')}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ReportsTab() {
  const { t } = useI18n();
  const [status, setStatus] = useState('open');
  const query = useApiQuery(`/api/v1/admin/reports?status=${status}`);
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <SelectField label={t('admin.filterLabel')} value={status} onChange={(e) => setStatus(e.target.value)}>
          {['open', 'actioned', 'dismissed'].map((s) => (
            <option key={s} value={s}>
              {t(`adminTools.reportStatus.${s}`)}
            </option>
          ))}
        </SelectField>
      </div>
      {query.status === 'loading' && <ReviewListSkeleton />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.length === 0 && <EmptyState title={t('adminTools.noReports')} />}
      {query.status === 'ready' && query.data.length > 0 && (
        <ul className={styles.list}>
          {query.data.map((r) => (
            <ReportCard key={r.id} report={r} onChanged={query.reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Settings ------------------------------------------------------------------------------------
const NUMBER_SETTINGS = [
  ['maxCircleCapacity', 1, 500],
  ['defaultCircleCapacity', 1, 500],
  ['maxGuestsPerSession', 0, 100],
  ['guestGraceMinutes', 0, 240],
  ['recitationInviteTimeoutSeconds', 15, 900],
  ['revisionRequestTtlMinutes', 1, 1440],
  ['billingGraceDays', 0, 60],
  ['billingExpireDays', 1, 365],
];

function SettingsForm({ initial, onSaved }) {
  const { t, formatters } = useI18n();
  const mutation = useMutation();
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, typeof v === 'boolean' ? v : String(v)])));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaved(false);
    const next = {};
    const changes = {};
    for (const [key, min, max] of NUMBER_SETTINGS) {
      const n = Number(values[key]);
      if (!Number.isInteger(n) || n < min || n > max) next[key] = t('adminTools.between', { min: formatters.integer(min), max: formatters.integer(max) });
      else if (n !== initial[key]) changes[key] = n;
    }
    for (const key of ['guestsAllowed', 'guestRequiresApproval']) if (values[key] !== initial[key]) changes[key] = values[key];
    setErrors(next);
    if (Object.keys(next).length || Object.keys(changes).length === 0) return;
    const result = await mutation.run('save', (api) => api.patch('/api/v1/admin/settings', changes));
    if (result) {
      setSaved(true);
      onSaved(result);
    }
  }

  return (
    <form className={styles.grant} onSubmit={submit} noValidate>
      <p className={styles.muted}>{t('adminTools.settingsHelp')}</p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {saved && <Alert tone="success">{t('account.saved')}</Alert>}
      {NUMBER_SETTINGS.map(([key, min, max]) => (
        <TextField
          key={key}
          label={t(`adminTools.settings.${key}`)}
          inputMode="numeric"
          dir="ltr"
          value={values[key]}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          error={errors[key]}
          hint={errors[key] ? undefined : t('adminTools.between', { min: formatters.integer(min), max: formatters.integer(max) })}
        />
      ))}
      {['guestsAllowed', 'guestRequiresApproval'].map((key) => (
        <SelectField key={key} label={t(`adminTools.settings.${key}`)} value={values[key] ? 'yes' : 'no'} onChange={(e) => setValues({ ...values, [key]: e.target.value === 'yes' })}>
          <option value="yes">{t('adminTools.yes')}</option>
          <option value="no">{t('adminTools.no')}</option>
        </SelectField>
      ))}
      <span>
        <Button type="submit" loading={mutation.busy === 'save'}>
          {t('adminTools.saveSettings')}
        </Button>
      </span>
    </form>
  );
}

export function SettingsTab() {
  const query = useApiQuery('/api/v1/admin/settings');
  return (
    <div className={styles.tab}>
      {query.status === 'loading' && <ReviewListSkeleton rows={1} />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && <SettingsForm key={JSON.stringify(query.data)} initial={query.data} onSaved={query.setData} />}
    </div>
  );
}

// ---- Audit log ---------------------------------------------------------------------------------------
export function AuditTab() {
  const { t, formatters } = useI18n();
  const [entityType, setEntityType] = useState('');
  const query = useApiQuery(`/api/v1/admin/audit${entityType ? `?entityType=${entityType}` : ''}`);
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <SelectField label={t('adminTools.entityType')} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">{t('adminTools.allEntities')}</option>
          {['user', 'institution', 'main_circle', 'circle', 'membership', 'subscription', 'subscription_plan', 'report', 'platform_settings', 'session'].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
      </div>
      {query.status === 'loading' && <ReviewListSkeleton />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.length === 0 && <EmptyState title={t('adminTools.noAudit')} />}
      {query.status === 'ready' && query.data.length > 0 && (
        <ul className={styles.list}>
          {query.data.map((entry) => (
            <li key={entry.id} className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>
                  <bdi dir="ltr">{entry.action}</bdi>
                </h3>
                <time className={styles.muted} dateTime={entry.at}>
                  {formatters.dateTime(entry.at)}
                </time>
              </div>
              <p className={styles.meta}>
                {entry.actor?.name ?? t('adminTools.system')} · <bdi dir="ltr">{entry.entityType}{entry.entityId ? ` ${entry.entityId}` : ''}</bdi>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
