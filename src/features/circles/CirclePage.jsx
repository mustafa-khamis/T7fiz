import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { validateEmail } from '../auth/auth-helpers.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmailField, SelectField, TextField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { EnrollmentLabel, Seats } from './CircleCard.jsx';
import { enrollmentChoices } from '../manage/enrollment.js';
import { ChatPanel, ProgressPanel, RevisionPanel, SchedulePanel, SessionsPanel } from './CircleLearning.jsx';
import styles from './Circles.module.css';
import { CircleSkeleton } from './CircleSkeletons.jsx';


/** The visitor's or student's side: join, request, cancel, leave. */
function JoinBox({ circle, onChanged }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const errorRef = useRef(null);
  useFocusWhen(errorRef, mutation.error);
  const membership = circle.myMembership;

  const join = () => mutation.run('join', (api) => api.post(`/api/v1/circles/${circle.id}/join`)).then((result) => result && onChanged());
  const act = (action) => mutation.run(action, (api) => api.post(`/api/v1/memberships/${membership.id}/${action}`, {})).then((result) => result && onChanged());

  let content;
  if (circle.isSheikh || circle.canManage) {
    content = <p>{circle.isSheikh ? t('circles.youTeach') : t('circles.youManage')}</p>;
  } else if (membership?.status === 'active') {
    content = (
      <>
        <p className={styles.panelTitle}>{t('circles.youAreMember')}</p>
        {confirmLeave ? (
          <div className={styles.actions}>
            <span>{t('circles.leaveConfirm')}</span>
            <Button variant="danger" size="sm" loading={mutation.busy === 'leave'} onClick={() => act('leave')}>
              {t('circles.leave')}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setConfirmLeave(false)}>
              {t('common.actions.cancel')}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(true)}>
            {t('circles.leave')}
          </Button>
        )}
      </>
    );
  } else if (membership?.status === 'pending') {
    content = (
      <>
        <p className={styles.panelTitle}>{t('circles.requestPending')}</p>
        <p className={styles.muted}>{t('circles.requestPendingBody')}</p>
        <Button variant="secondary" size="sm" loading={mutation.busy === 'cancel'} onClick={() => act('cancel')}>
          {t('circles.cancelRequest')}
        </Button>
      </>
    );
  } else if (membership?.status === 'suspended') {
    content = <p>{t('circles.suspended')}</p>;
  } else if (circle.acceptingMembers) {
    const open = circle.effectiveEnrollment === 'open';
    content = (
      <>
        <p className={styles.muted}>{open ? t('circles.joinOpenHelp') : t('circles.joinApprovalHelp')}</p>
        <Button loading={mutation.busy === 'join'} onClick={join}>
          {open ? t('circles.joinNow') : t('circles.requestToJoin')}
        </Button>
      </>
    );
  } else {
    content = <p className={styles.muted}>{t(`circles.notAccepting.${circle.seatsAvailable === 0 ? 'full' : circle.effectiveEnrollment}`, {})}</p>;
  }

  return (
    <section className={styles.joinBox} aria-label={t('circles.membership')}>
      <Seats circle={circle} />
      {mutation.error && (
        <Alert ref={errorRef} tabIndex={-1} tone="danger">
          {errorMessage(t, mutation.error)}
        </Alert>
      )}
      {content}
    </section>
  );
}

/** Staff side: requests to decide, current members, invitations. */
function MembersPanel({ circle, onChanged }) {
  const { t, formatters } = useI18n();
  const members = useApiQuery(`/api/v1/circles/${circle.id}/members?status=all`);
  const mutation = useMutation();
  const act = (membershipId, action) =>
    mutation.run(`${membershipId}:${action}`, (api) => api.post(`/api/v1/memberships/${membershipId}/${action}`, {})).then((result) => {
      if (result) {
        members.reload();
        onChanged();
      }
    });

  const pending = members.data?.filter((m) => m.status === 'pending') ?? [];
  const current = members.data?.filter((m) => m.status !== 'pending') ?? [];
  return (
    <section className={styles.panel} aria-labelledby="members-title">
      <h2 id="members-title" className={styles.panelTitle}>
        {t('circles.members')}
      </h2>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {members.status === 'loading' && (
        <SkeletonRegion className={styles.rows}>
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index} className={styles.row}>
              <Lines widths={['10rem']} />
              <ButtonBone size="sm" width="5rem" />
            </span>
          ))}
        </SkeletonRegion>
      )}
      {members.status === 'error' && <LoadError error={members.error} onRetry={members.reload} />}
      {members.status === 'ready' && (
        <>
          {pending.length > 0 && (
            <>
              <h3 className={styles.muted}>{t('circles.pendingRequests', { count: pending.length })}</h3>
              <ul className={styles.rows}>
                {pending.map((m) => (
                  <li key={m.id} className={styles.row}>
                    <span>
                      {m.student.name} <span className={styles.muted}>· {formatters.date(m.requestedAt)}</span>
                    </span>
                    <span className={styles.rowActions}>
                      <Button size="sm" loading={mutation.busy === `${m.id}:approve`} onClick={() => act(m.id, 'approve')}>
                        {t('circles.approve')}
                      </Button>
                      <Button size="sm" variant="secondary" loading={mutation.busy === `${m.id}:reject`} onClick={() => act(m.id, 'reject')}>
                        {t('circles.reject')}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {current.length === 0 ? (
            <EmptyState title={t('circles.noMembers')} body={t('circles.noMembersBody')} />
          ) : (
            <ul className={styles.rows}>
              {current.map((m) => (
                <li key={m.id} className={styles.row}>
                  <span>{m.student.name}</span>
                  <span className={styles.rowActions}>
                    <StatusBadge status={m.status} />
                    {m.status === 'active' && (
                      <Button size="sm" variant="quiet" loading={mutation.busy === `${m.id}:suspend`} onClick={() => act(m.id, 'suspend')}>
                        {t('circles.suspend')}
                      </Button>
                    )}
                    {m.status === 'suspended' && (
                      <Button size="sm" variant="quiet" loading={mutation.busy === `${m.id}:reinstate`} onClick={() => act(m.id, 'reinstate')}>
                        {t('circles.reinstate')}
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function InvitePanel({ circle }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [sent, setSent] = useState(null);
  const { formRef, field, handleSubmit, setValue } = useForm({ initial: { email: '' }, validate: (v) => ({ email: validateEmail(v.email) }), t });
  const submit = handleSubmit(async ({ email }) => {
    const invitation = await mutation.run('invite', (api) => api.post(`/api/v1/circles/${circle.id}/invitations`, { email: email.trim() }));
    if (invitation) {
      setSent(email.trim());
      setValue('email', '');
    }
  });
  return (
    <section className={styles.panel} aria-labelledby="invite-title">
      <h2 id="invite-title" className={styles.panelTitle}>
        {t('circles.inviteTitle')}
      </h2>
      <p className={styles.muted}>{t('circles.inviteHelp')}</p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {sent && <Alert tone="success">{t('circles.inviteSent', { email: sent })}</Alert>}
      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        <EmailField label={t('circles.inviteEmail')} autoComplete="off" {...field('email', { transformOnBlur: (value) => value.trim() })} />
        <div className={styles.actions}>
          <Button type="submit" loading={mutation.busy === 'invite'}>
            {t('circles.sendInvite')}
          </Button>
        </div>
      </form>
    </section>
  );
}

/** Managers: appoint or end Sheikhs; change capacity, enrollment and status. */
function ManagePanel({ circle, onChanged }) {
  const { t } = useI18n();
  const appoint = useMutation();
  const settings = useMutation();
  const [saved, setSaved] = useState(false);
  const { formRef: appointRef, field: appointField, handleSubmit: handleAppoint, setValue: setAppointValue } = useForm({ initial: { email: '', role: circle.sheikhs.some((s) => s.role === 'primary') ? 'assistant' : 'primary' }, validate: (v) => ({ email: validateEmail(v.email) }), t });
  const { formRef: settingsRef, field: settingsField, handleSubmit: handleSettings } = useForm({
    initial: { capacity: String(circle.capacity), enrollmentPolicy: circle.enrollmentPolicy, status: circle.status },
    validate: (v) => ({ capacity: !/^\d+$/.test(v.capacity) || Number(v.capacity) < 1 || Number(v.capacity) > 500 ? 'manage.validation.capacity' : null }),
    t,
  });

  const submitAppoint = handleAppoint(async ({ email, role }) => {
    const result = await appoint.run('appoint', (api) => api.post(`/api/v1/circles/${circle.id}/sheikhs`, { email: email.trim(), role }));
    if (result) {
      setAppointValue('email', '');
      onChanged();
    }
  });
  const end = (appointmentId) => appoint.run(appointmentId, (api) => api.delete(`/api/v1/circles/${circle.id}/sheikhs/${appointmentId}`)).then((r) => r && onChanged());
  const submitSettings = handleSettings(async (v) => {
    setSaved(false);
    const result = await settings.run('save', (api) => api.patch(`/api/v1/circles/${circle.id}`, { capacity: Number(v.capacity), enrollmentPolicy: v.enrollmentPolicy, status: v.status }));
    if (result) {
      setSaved(true);
      onChanged();
    }
  });

  // A circle already set to a choice no longer offered keeps showing it until changed.
  const offered = enrollmentChoices(circle.institution);
  const policies = offered.includes(circle.enrollmentPolicy) ? offered : [...offered, circle.enrollmentPolicy];
  return (
    <>
      <section className={styles.panel} aria-labelledby="sheikhs-title">
        <h2 id="sheikhs-title" className={styles.panelTitle}>
          {t('manage.sheikhs')}
        </h2>
        {appoint.error && <Alert tone="danger">{errorMessage(t, appoint.error)}</Alert>}
        {circle.sheikhs.length > 0 && (
          <ul className={styles.rows}>
            {circle.sheikhs.map((s) => (
              <li key={s.appointmentId} className={styles.row}>
                <span>
                  {s.name} <span className={styles.muted}>· {t(`manage.appointment.${s.role}`)}</span>
                </span>
                <Button size="sm" variant="quiet" loading={appoint.busy === s.appointmentId} onClick={() => end(s.appointmentId)}>
                  {t('manage.endAppointment')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form ref={appointRef} className={styles.form} onSubmit={submitAppoint} noValidate>
          <p className={styles.muted}>{t('manage.appointHelp')}</p>
          <EmailField label={t('manage.sheikhEmail')} autoComplete="off" {...appointField('email', { transformOnBlur: (value) => value.trim() })} />
          <SelectField label={t('manage.appointmentRole')} {...appointField('role')}>
            <option value="primary">{t('manage.appointment.primary')}</option>
            <option value="assistant">{t('manage.appointment.assistant')}</option>
          </SelectField>
          <div className={styles.actions}>
            <Button type="submit" size="sm" loading={appoint.busy === 'appoint'}>
              {t('manage.appoint')}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.panel} aria-labelledby="settings-title">
        <h2 id="settings-title" className={styles.panelTitle}>
          {t('manage.circleSettings')}
        </h2>
        {settings.error && <Alert tone="danger">{errorMessage(t, settings.error)}</Alert>}
        <form ref={settingsRef} className={styles.form} onSubmit={submitSettings} noValidate>
          <div className={styles.formRow}>
            <TextField label={t('manage.capacity')} hint={t('manage.capacityHelp')} inputMode="numeric" {...settingsField('capacity')} />
            <SelectField label={t('manage.enrollment')} {...settingsField('enrollmentPolicy')}>
              {policies.map((policy) => (
                <option key={policy} value={policy}>
                  {t(`circles.enrollment.${policy}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <SelectField label={t('manage.circleStatus')} hint={t('manage.circleStatusHelp')} {...settingsField('status')}>
            {['active', 'paused', 'archived'].map((status) => (
              <option key={status} value={status}>
                {t(`manage.circleStatusOption.${status}`)}
              </option>
            ))}
          </SelectField>
          <div className={styles.actions}>
            <Button type="submit" size="sm" loading={settings.busy === 'save'}>
              {t('common.actions.save')}
            </Button>
            <span aria-live="polite" className={styles.muted}>
              {saved && t('account.saved')}
            </span>
          </div>
        </form>
      </section>
    </>
  );
}

export function CirclePage() {
  const { t, formatters } = useI18n();
  const { circleId } = useParams();
  const query = useApiQuery(`/api/v1/circles/${circleId}`);

  if (query.status === 'loading') return <CircleSkeleton />;
  // Other-gender and private circles are reported as not found by the API (GEN-2).
  if (query.status === 'error' && query.error?.status === 404) return <NotFoundPage />;
  if (query.status === 'error') {
    return (
      <div className={`${styles.page} ${styles.narrow}`}>
        <LoadError error={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const circle = query.data;
  const staff = circle.canManage || circle.isSheikh;
  const member = circle.myMembership?.status === 'active';
  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <p className={styles.breadcrumb}>
        <Link to="/circles">{t('circles.discoverTitle')}</Link> · {circle.institution?.name ?? circle.mainCircle.name}
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>{circle.name}</h1>
        <p className={styles.actions}>
          <EnrollmentLabel circle={circle} />
          {circle.status !== 'active' && <StatusBadge status={circle.status} />}
        </p>
        {circle.description && <p>{circle.description}</p>}
      </header>

      <JoinBox circle={circle} onChanged={query.reload} />

      <section className={styles.panel} aria-labelledby="details-title">
        <h2 id="details-title" className={styles.panelTitle}>
          {t('circles.details')}
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>{t('circles.teachers')}</dt>
            <dd>{circle.sheikhs.length ? circle.sheikhs.map((s) => s.name).join('، ') : t('circles.noSheikhShort')}</dd>
          </div>
          <div>
            <dt>{t('circles.mainCircle')}</dt>
            <dd>{circle.mainCircle.name}</dd>
          </div>
          <div>
            <dt>{t('circles.teachingLanguage')}</dt>
            <dd>{t(`languageNames.${circle.teachingLanguage}`) === `languageNames.${circle.teachingLanguage}` ? circle.teachingLanguage : t(`languageNames.${circle.teachingLanguage}`)}</dd>
          </div>
          <div>
            <dt>{t('circles.timeZone')}</dt>
            <dd>{formatters.timeZoneName(circle.timeZone)}</dd>
          </div>
        </dl>
        {circle.requirements && (
          <>
            <h3 className={styles.muted}>{t('circles.requirements')}</h3>
            <p>{circle.requirements}</p>
          </>
        )}
      </section>

      <SessionsPanel circle={circle} staff={staff} />
      {member && <ProgressPanel circle={circle} />}
      {(member || staff) && <ChatPanel circle={circle} staff={staff} />}
      {member && <RevisionPanel circle={circle} />}
      {staff && <SchedulePanel circle={circle} />}
      {staff && <MembersPanel circle={circle} onChanged={query.reload} />}
      {circle.canManage && <ManagePanel key={circle.id} circle={circle} onChanged={query.reload} />}
      {circle.canManage && <InvitePanel circle={circle} />}
    </div>
  );
}
