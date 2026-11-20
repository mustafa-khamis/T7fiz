import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { browserTimeZone } from '../../i18n/format.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { timeZoneOptions } from '../../lib/time-zones.js';
import { validateEmail } from '../auth/auth-helpers.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmailField, SelectField, TextField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { CircleCard } from '../circles/CircleCard.jsx';
import { ApplicationQueue } from '../applications/ApplicationQueue.jsx';
import styles from './Manage.module.css';
import { BillingSection } from './BillingSection.jsx';
import { ManageSkeleton } from './ManageSkeletons.jsx';

// ---- Shared pieces -------------------------------------------------------------
function TextArea({ label, hint, optional, value, onChange, maxLength = 2000, rows = 3, name }) {
  const { t } = useI18n();
  const id = `ta-${name}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> ({t('common.optional')})</span>}
      </label>
      <textarea id={id} name={name} className={styles.textarea} rows={rows} maxLength={maxLength} value={value} onChange={onChange} aria-describedby={hint ? `${id}-hint` : undefined} dir="auto" />
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

function TimeZoneField({ field, label }) {
  const zones = useMemo(() => timeZoneOptions(field.value), [field.value]);
  return (
    <SelectField label={label} dir="ltr" {...field}>
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll('_', ' ')}
        </option>
      ))}
    </SelectField>
  );
}

function FormError({ error }) {
  const { t } = useI18n();
  const ref = useRef(null);
  useFocusWhen(ref, error);
  if (!error) return null;
  return (
    <Alert ref={ref} tabIndex={-1} tone="danger">
      {errorMessage(t, error)}
    </Alert>
  );
}

function OrgCard({ to, title, meta, status }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Link to={to} className={styles.cardLink}>
            {title}
          </Link>
        </h3>
        <StatusBadge status={status} />
      </div>
      <p className={styles.meta}>{meta}</p>
    </article>
  );
}

// ---- Hub ------------------------------------------------------------------------
/** Everything the person runs: institutions, main circles, and how to start one. */
export function ManageHub() {
  const { t } = useI18n();
  const institutions = useApiQuery('/api/v1/me/institutions');
  const mainCircles = useApiQuery('/api/v1/me/main-circles');
  const approvals = useApiQuery('/api/v1/me/sheikh-approvals');
  const platformApproved = approvals.data?.some((a) => a.authorityType === 'platform' && a.status === 'active');
  const loading = institutions.status === 'loading' || mainCircles.status === 'loading' || approvals.status === 'loading';
  if (loading) return <ManageSkeleton />;

  const independent = mainCircles.data?.filter((m) => !m.institution) ?? [];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('manage.title')}</h1>
        <p className={styles.muted}>{t('manage.subtitle')}</p>
      </header>
      <div className={styles.actions}>
        <Button to="/institutions/new">{t('manage.newInstitution')}</Button>
        {platformApproved ? (
          <Button to="/main-circles/new" variant="secondary">
            {t('manage.newIndependent')}
          </Button>
        ) : null}
      </div>
      {!platformApproved && (
        <Alert
          tone="info"
          title={t('manage.independentLockedTitle')}
          action={
            <Button size="sm" variant="secondary" to="/apply">
              {t('manage.applyToTeach')}
            </Button>
          }
        >
          {t('manage.independentLocked')}
        </Alert>
      )}

      <section className={styles.section} aria-labelledby="my-institutions">
        <h2 id="my-institutions" className={styles.sectionTitle}>
          {t('manage.institutions')}
        </h2>
        {institutions.status === 'error' && <LoadError error={institutions.error} onRetry={institutions.reload} />}
        {institutions.status === 'ready' &&
          (institutions.data.length === 0 ? (
            <EmptyState title={t('manage.noInstitutions')} body={t('manage.noInstitutionsBody')} />
          ) : (
            <div className={styles.grid}>
              {institutions.data.map((inst) => (
                <OrgCard key={inst.id} to={`/institutions/${inst.id}`} title={inst.name} status={inst.status} meta={`${t(`admin.kind.${inst.kind}`)} · ${t(`manage.role.${inst.myRole ?? 'owner'}`)}`} />
              ))}
            </div>
          ))}
      </section>

      <section className={styles.section} aria-labelledby="my-main-circles">
        <h2 id="my-main-circles" className={styles.sectionTitle}>
          {t('manage.independentCircles')}
        </h2>
        {mainCircles.status === 'error' && <LoadError error={mainCircles.error} onRetry={mainCircles.reload} />}
        {mainCircles.status === 'ready' &&
          (independent.length === 0 ? (
            <EmptyState title={t('manage.noIndependent')} body={platformApproved ? t('manage.noIndependentBody') : null} />
          ) : (
            <div className={styles.grid}>
              {independent.map((main) => (
                <OrgCard key={main.id} to={`/main-circles/${main.id}`} title={main.name} status={main.status} meta={t(`admin.circleGender.${main.gender}`)} />
              ))}
            </div>
          ))}
      </section>
    </div>
  );
}

// ---- Create an institution ----------------------------------------------------------
export function NewInstitutionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const mutation = useMutation();
  const { formRef, field, handleSubmit, values, setValue } = useForm({
    initial: { kind: 'free', name: '', description: '', audience: 'both', timeZone: browserTimeZone() ?? 'UTC' },
    validate: (v) => ({ name: v.name.trim().length < 2 ? 'manage.validation.name' : null }),
    t,
  });
  const submit = handleSubmit(async (v) => {
    const created = await mutation.run('create', (api) =>
      api.post('/api/v1/institutions', { kind: v.kind, name: v.name.trim(), audience: v.audience, timeZone: v.timeZone, ...(v.description.trim() ? { description: v.description.trim() } : {}) }),
    );
    if (created) navigate(`/institutions/${created.id}`, { replace: true });
  });

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('manage.newInstitution')}</h1>
        <p className={styles.muted}>{t('manage.newInstitutionHelp')}</p>
      </header>
      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        <FormError error={mutation.error} />
        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>{t('manage.kind')}</legend>
          <div className={styles.choices}>
            {['free', 'private_paid'].map((kind) => (
              <label key={kind} className={styles.choice}>
                <input type="radio" name="kind" value={kind} checked={values.kind === kind} onChange={() => setValue('kind', kind)} />
                <span>
                  <strong>{t(`admin.kind.${kind}`)}</strong>
                  <span className={styles.hint}>{t(`manage.kindHelp.${kind}`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextField label={t('manage.institutionName')} maxLength={120} dir="auto" {...field('name')} />
        <TextArea name="description" label={t('manage.description')} optional value={values.description} onChange={(e) => setValue('description', e.target.value)} />
        <SelectField label={t('manage.audience')} hint={t('manage.audienceHelp')} {...field('audience')}>
          {['both', 'male', 'female'].map((audience) => (
            <option key={audience} value={audience}>
              {t(`manage.audienceOption.${audience}`)}
            </option>
          ))}
        </SelectField>
        <TimeZoneField label={t('account.timeZone')} field={field('timeZone')} />
        <p className={styles.hint}>{t('manage.reviewNotice')}</p>
        <div className={styles.actions}>
          <Button type="submit" loading={mutation.busy === 'create'}>
            {t('manage.submitInstitution')}
          </Button>
          <Button variant="quiet" to="/manage">
            {t('common.actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---- Create a main circle (independent or inside an institution) ---------------------------
// ---- Institution page -----------------------------------------------------------------
function GrantByEmail({ title, help, label, submitLabel, path, onDone, successKey, extra = {} }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [done, setDone] = useState(null);
  const { formRef, field, handleSubmit, setValue } = useForm({ initial: { email: '' }, validate: (v) => ({ email: validateEmail(v.email) }), t });
  const submit = handleSubmit(async ({ email }) => {
    const result = await mutation.run('send', (api) => api.post(path, { email: email.trim(), ...extra }));
    if (result) {
      setDone(email.trim());
      setValue('email', '');
      onDone?.(result);
    }
  });
  return (
    <form ref={formRef} className={styles.box} onSubmit={submit} noValidate>
      <h3 className={styles.boxTitle}>{title}</h3>
      <p className={styles.hint}>{help}</p>
      <FormError error={mutation.error} />
      {done && <Alert tone="success">{t(successKey, { email: done })}</Alert>}
      <EmailField label={label} autoComplete="off" {...field('email', { transformOnBlur: (value) => value.trim() })} />
      <div className={styles.actions}>
        <Button type="submit" size="sm" loading={mutation.busy === 'send'}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function InstitutionPage() {
  const { t } = useI18n();
  const { institutionId } = useParams();
  const query = useApiQuery(`/api/v1/institutions/${institutionId}`);
  const approvals = useApiQuery(`/api/v1/institutions/${institutionId}/sheikh-approvals`, { enabled: Boolean(query.data?.myRole) });
  if (query.status === 'loading') return <ManageSkeleton />;
  if (query.status === 'error' && query.error?.status === 404) return <NotFoundPage />;
  if (query.status === 'error') return <div className={styles.page}><LoadError error={query.error} onRetry={query.reload} /></div>;

  const inst = query.data;
  const manager = Boolean(inst.myRole);
  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to="/manage">{t('manage.title')}</Link>
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>{inst.name}</h1>
        <p className={styles.actions}>
          <StatusBadge status={inst.status} />
          <span className={styles.muted}>
            {t(`admin.kind.${inst.kind}`)} · {t(`admin.audience.${inst.audience}`)}
          </span>
        </p>
        {inst.description && <p>{inst.description}</p>}
      </header>
      {inst.status === 'pending_review' && <Alert tone="info" title={t('manage.pendingTitle')}>{t('manage.pendingInstitution')}</Alert>}
      {inst.status === 'rejected' && <Alert tone="danger" title={t('manage.rejectedTitle')}>{inst.reviewNote ?? t('manage.rejectedBody')}</Alert>}

      {manager && inst.kind === 'private_paid' && <BillingSection institutionId={inst.id} />}
      {manager && (
        <>
          <section className={styles.section} aria-labelledby="inst-main">
            <div className={styles.sectionHead}>
              <h2 id="inst-main" className={styles.sectionTitle}>
                {t('manage.mainCircles')}
              </h2>
              <Button size="sm" to={`/main-circles/new?institutionId=${inst.id}`}>
                {t('manage.newMainCircle')}
              </Button>
            </div>
            {inst.mainCircles.length === 0 ? (
              <EmptyState title={t('manage.noMainCircles')} body={t('manage.noMainCirclesBody')} />
            ) : (
              <div className={styles.grid}>
                {inst.mainCircles.map((main) => (
                  <OrgCard key={main.id} to={`/main-circles/${main.id}`} title={main.name} status={main.status} meta={t(`admin.circleGender.${main.gender}`)} />
                ))}
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="inst-applications">
            <h2 id="inst-applications" className={styles.sectionTitle}>
              {t('manage.applications')}
            </h2>
            {inst.status === 'active' && (
              <p className={styles.hint}>
                {t('manage.applyLinkHelp')} <code dir="ltr">{`${window.location.origin}/apply?institutionId=${inst.id}`}</code>
              </p>
            )}
            <ApplicationQueue path={`/api/v1/institutions/${inst.id}/sheikh-applications`} />
          </section>

          <section className={styles.section} aria-labelledby="inst-sheikhs">
            <h2 id="inst-sheikhs" className={styles.sectionTitle}>
              {t('manage.institutionSheikhs')}
            </h2>
            <GrantByEmail
              title={t('manage.approveSheikh')}
              help={t('manage.approveSheikhHelp')}
              label={t('admin.approvals.email')}
              submitLabel={t('admin.approvals.grant')}
              path={`/api/v1/institutions/${inst.id}/sheikh-approvals`}
              successKey="manage.approvedEmail"
              onDone={approvals.reload}
            />
            {approvals.status === 'ready' && approvals.data.length > 0 && (
              <ul className={styles.rows}>
                {approvals.data.map((a) => (
                  <li key={a.id} className={styles.row}>
                    <span>
                      {a.sheikh.name} <span className={styles.muted}>· {t(`auth.gender.${a.sheikh.gender}`)}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section} aria-labelledby="inst-admins">
            <h2 id="inst-admins" className={styles.sectionTitle}>
              {t('manage.managers')}
            </h2>
            <ul className={styles.rows}>
              {inst.managers.map((m) => (
                <li key={m.id} className={styles.row}>
                  <span>{m.name}</span>
                  <span className={styles.muted}>{t(`manage.role.${m.role}`)}</span>
                </li>
              ))}
            </ul>
            {inst.myRole === 'owner' && (
              <GrantByEmail
                title={t('manage.inviteAdmin')}
                help={t('manage.inviteAdminHelp')}
                label={t('manage.adminEmail')}
                submitLabel={t('circles.sendInvite')}
                path={`/api/v1/institutions/${inst.id}/invitations`}
                successKey="circles.inviteSent"
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ---- Main circle page --------------------------------------------------------------------
export function MainCirclePage() {
  const { t } = useI18n();
  const { mainCircleId } = useParams();
  const query = useApiQuery(`/api/v1/main-circles/${mainCircleId}`);
  const mutation = useMutation();
  if (query.status === 'loading') return <ManageSkeleton />;
  if (query.status === 'error' && query.error?.status === 404) return <NotFoundPage />;
  if (query.status === 'error') return <div className={styles.page}><LoadError error={query.error} onRetry={query.reload} /></div>;

  const main = query.data;
  const decide = (decision) => mutation.run(decision, (api) => api.post(`/api/v1/main-circles/${main.id}/decision`, { decision })).then((r) => r && query.reload());
  const canActivate = main.canManage && main.institution && main.status === 'pending_review';
  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to={main.institution ? `/institutions/${main.institution.id}` : '/manage'}>{main.institution?.name ?? t('manage.title')}</Link>
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>{main.name}</h1>
        <p className={styles.actions}>
          <StatusBadge status={main.status} />
          <span className={styles.muted}>{t(`admin.circleGender.${main.gender}`)}</span>
        </p>
        {main.description && <p>{main.description}</p>}
      </header>
      <FormError error={mutation.error} />
      {main.status === 'pending_review' && !main.institution && <Alert tone="info" title={t('manage.pendingTitle')}>{t('manage.pendingIndependent')}</Alert>}
      {canActivate && (
        <Alert tone="info" title={t('manage.activateTitle')} action={<Button size="sm" loading={mutation.busy === 'approve'} onClick={() => decide('approve')}>{t('manage.activate')}</Button>}>
          {t('manage.activateBody')}
        </Alert>
      )}

      <section className={styles.section} aria-labelledby="main-circles">
        <div className={styles.sectionHead}>
          <h2 id="main-circles" className={styles.sectionTitle}>
            {t('manage.circles')}
          </h2>
          {main.canManage && (
            <Button size="sm" to={`/main-circles/${main.id}/circles/new`}>
              {t('manage.newCircle')}
            </Button>
          )}
        </div>
        {main.circles.length === 0 ? (
          <EmptyState title={t('manage.noCircles')} body={main.canManage ? t('manage.noCirclesBody') : null} />
        ) : (
          <div className={styles.grid}>
            {main.circles.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </section>

      {main.staff && (
        <section className={styles.section} aria-labelledby="main-staff">
          <h2 id="main-staff" className={styles.sectionTitle}>
            {t('manage.staff')}
          </h2>
          {main.staff.length === 0 ? (
            <p className={styles.muted}>{t('manage.noStaff')}</p>
          ) : (
            <ul className={styles.rows}>
              {main.staff.map((s) => (
                <li key={s.id} className={styles.row}>
                  <span>{s.name}</span>
                  <span className={styles.muted}>{t(`manage.staffRole.${s.role}`)}</span>
                </li>
              ))}
            </ul>
          )}
          {main.canManage && (
            <GrantByEmail
              extra={{ role: main.staff.some((s) => s.role === 'owner') ? 'supervisor' : 'owner' }}
              title={main.staff.some((s) => s.role === 'owner') ? t('manage.addSupervisor') : t('manage.addOwner')}
              help={t('manage.addStaffHelp')}
              label={t('manage.staffEmail')}
              submitLabel={t('manage.add')}
              path={`/api/v1/main-circles/${main.id}/staff`}
              successKey="manage.staffAdded"
              onDone={query.reload}
            />
          )}
        </section>
      )}
    </div>
  );
}
