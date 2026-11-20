import { useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { AudioRecorder } from './AudioRecorder.jsx';
import styles from './Applications.module.css';
import { ApplicationSkeleton } from './ApplicationSkeletons.jsx';

function TextArea({ label, value, onChange, hint, rows = 4, maxLength = 2000, optional = true }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> ({t('common.optional')})</span>}
      </label>
      <textarea id={id} className={styles.textarea} rows={rows} maxLength={maxLength} value={value ?? ''} onChange={onChange} dir="auto" aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ---- Applicant: editing ---------------------------------------------------------------
function Editor({ application, onSaved }) {
  const { t } = useI18n();
  const save = useMutation();
  const files = useMutation();
  const [values, setValues] = useState(() => ({
    fullName: application.fullName ?? '',
    phone: application.phone ?? '',
    memorizedJuzCount: application.memorizedJuzCount ?? 0,
    memorizationLevel: application.memorizationLevel ?? 'partial',
    riwayah: application.riwayah ?? '',
    recitationExperience: application.recitationExperience ?? '',
    teachingExperienceYears: application.teachingExperienceYears ?? '',
    teachingExperience: application.teachingExperience ?? '',
    additionalInfo: application.additionalInfo ?? '',
    qualifications: application.qualifications.map(({ kind, title, riwayah, grantedBy, year }) => ({ kind, title, riwayah: riwayah ?? '', grantedBy: grantedBy ?? '', year: year ?? '' })),
    conduct: application.codeOfConductAccepted,
  }));
  const [docKind, setDocKind] = useState('ijazah_scan');
  const [reply, setReply] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (name) => (event) => {
    setSaved(false);
    setValues((current) => ({ ...current, [name]: event?.target ? event.target.value : event }));
  };
  const setQualification = (index, name, value) =>
    setValues((current) => ({ ...current, qualifications: current.qualifications.map((q, i) => (i === index ? { ...q, [name]: value } : q)) }));

  function payload() {
    const nullable = (value) => (String(value).trim() ? String(value).trim() : null);
    const juz = values.memorizationLevel === 'full_hafiz' ? 30 : Number(values.memorizedJuzCount);
    return {
      fullName: values.fullName.trim(),
      phone: nullable(values.phone),
      memorizedJuzCount: juz,
      memorizationLevel: values.memorizationLevel,
      riwayah: nullable(values.riwayah),
      recitationExperience: nullable(values.recitationExperience),
      teachingExperienceYears: values.teachingExperienceYears === '' ? null : Number(values.teachingExperienceYears),
      teachingExperience: nullable(values.teachingExperience),
      additionalInfo: nullable(values.additionalInfo),
      qualifications: values.qualifications
        .filter((q) => q.title.trim().length >= 2)
        .map((q) => ({ kind: q.kind, title: q.title.trim(), riwayah: nullable(q.riwayah), grantedBy: nullable(q.grantedBy), year: q.year === '' ? null : Number(q.year) })),
      ...(values.conduct && !application.codeOfConductAccepted ? { acceptCodeOfConduct: true } : {}),
    };
  }

  async function persist() {
    const result = await save.run('save', (api) => api.patch(`/api/v1/sheikh-applications/${application.id}`, payload()));
    if (result) {
      setSaved(true);
      onSaved(result);
    }
    return result;
  }

  async function submit() {
    if (!(await persist())) return;
    const result = await save.run('submit', (api) => api.post(`/api/v1/sheikh-applications/${application.id}/submit`, {}));
    if (result) onSaved(result);
  }

  async function sendReply() {
    if (!(await persist())) return;
    const result = await save.run('reply', (api) => api.post(`/api/v1/sheikh-applications/${application.id}/reply`, { message: reply.trim() }));
    if (result) onSaved(result);
  }

  async function attach(blob, kind) {
    const purpose = kind === 'recitation_audio' ? 'sheikh_application_audio' : 'sheikh_application_document';
    const result = await files.run(kind, async (api) => {
      const media = await api.upload(purpose, blob);
      return api.post(`/api/v1/sheikh-applications/${application.id}/files`, { mediaId: media.id, kind });
    });
    if (result) onSaved(result);
  }
  const remove = (fileId) => files.run(fileId, (api) => api.delete(`/api/v1/sheikh-applications/${application.id}/files/${fileId}`)).then((r) => r && onSaved(r));

  const audio = application.files.filter((f) => f.kind === 'recitation_audio');
  const documents = application.files.filter((f) => f.kind !== 'recitation_audio');
  const answering = application.status === 'info_requested';
  return (
    <div className={styles.form}>
      {save.error && <Alert tone="danger">{errorMessage(t, save.error)}</Alert>}

      <section className={styles.section} aria-labelledby="ap-personal">
        <h2 id="ap-personal" className={styles.sectionTitle}>
          {t('apply.personal')}
        </h2>
        <TextField label={t('apply.fullName')} hint={t('apply.fullNameHint')} value={values.fullName} onChange={set('fullName')} maxLength={120} dir="auto" />
        <TextField label={t('apply.phone')} optional hint={t('apply.phoneHint')} value={values.phone} onChange={set('phone')} inputMode="tel" dir="ltr" autoComplete="tel" />
      </section>

      <section className={styles.section} aria-labelledby="ap-memorization">
        <h2 id="ap-memorization" className={styles.sectionTitle}>
          {t('apply.memorization')}
        </h2>
        <SelectField label={t('apply.level')} value={values.memorizationLevel} onChange={set('memorizationLevel')}>
          <option value="partial">{t('apply.levels.partial')}</option>
          <option value="full_hafiz">{t('apply.levels.full_hafiz')}</option>
        </SelectField>
        {values.memorizationLevel === 'partial' && (
          <SelectField label={t('apply.juzCount')} value={String(values.memorizedJuzCount)} onChange={set('memorizedJuzCount')}>
            {Array.from({ length: 30 }, (_, n) => (
              <option key={n} value={n}>
                {t('apply.juzOption', { count: n })}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label={t('apply.riwayah')} optional hint={t('apply.riwayahHint')} value={values.riwayah} onChange={set('riwayah')} maxLength={120} dir="auto" />
      </section>

      <section className={styles.section} aria-labelledby="ap-experience">
        <h2 id="ap-experience" className={styles.sectionTitle}>
          {t('apply.experience')}
        </h2>
        <TextArea label={t('apply.recitationExperience')} value={values.recitationExperience} onChange={set('recitationExperience')} />
        <TextField label={t('apply.years')} optional inputMode="numeric" value={String(values.teachingExperienceYears)} onChange={set('teachingExperienceYears')} />
        <TextArea label={t('apply.teachingExperience')} value={values.teachingExperience} onChange={set('teachingExperience')} />
      </section>

      <section className={styles.section} aria-labelledby="ap-qualifications">
        <h2 id="ap-qualifications" className={styles.sectionTitle}>
          {t('apply.qualifications')}
        </h2>
        <p className={styles.hint}>{t('apply.qualificationsHint')}</p>
        {values.qualifications.map((q, index) => (
          <fieldset key={index} className={styles.qualification}>
            <legend className={styles.label}>{t('apply.qualificationN', { n: index + 1 })}</legend>
            <div className={styles.row2}>
              <SelectField label={t('apply.kind')} value={q.kind} onChange={(e) => setQualification(index, 'kind', e.target.value)}>
                {['ijazah', 'certificate', 'degree', 'other'].map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`apply.kinds.${kind}`)}
                  </option>
                ))}
              </SelectField>
              <TextField label={t('apply.qTitle')} value={q.title} onChange={(e) => setQualification(index, 'title', e.target.value)} maxLength={200} dir="auto" />
            </div>
            <div className={styles.row2}>
              <TextField label={t('apply.grantedBy')} optional value={q.grantedBy} onChange={(e) => setQualification(index, 'grantedBy', e.target.value)} maxLength={200} dir="auto" />
              <TextField label={t('apply.year')} optional inputMode="numeric" value={String(q.year)} onChange={(e) => setQualification(index, 'year', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <Button size="sm" variant="quiet" onClick={() => setValues((c) => ({ ...c, qualifications: c.qualifications.filter((_, i) => i !== index) }))}>
              {t('apply.removeQualification')}
            </Button>
          </fieldset>
        ))}
        {values.qualifications.length < 20 && (
          <Button size="sm" variant="secondary" onClick={() => setValues((c) => ({ ...c, qualifications: [...c.qualifications, { kind: 'ijazah', title: '', riwayah: '', grantedBy: '', year: '' }] }))}>
            {t('apply.addQualification')}
          </Button>
        )}
      </section>

      <section className={styles.section} aria-labelledby="ap-recitation">
        <h2 id="ap-recitation" className={styles.sectionTitle}>
          {t('apply.recitation')}
        </h2>
        <p className={styles.hint}>{t('apply.recitationHelp')}</p>
        {files.error && <Alert tone="danger">{errorMessage(t, files.error)}</Alert>}
        {audio.map((f) => (
          <div key={f.id} className={styles.fileRow}>
            <audio src={f.url ?? undefined} controls preload="metadata" className={styles.player} />
            <Button size="sm" variant="quiet" loading={files.busy === f.id} onClick={() => remove(f.id)}>
              {t('apply.removeFile')}
            </Button>
          </div>
        ))}
        {audio.length < 3 && <AudioRecorder busy={files.busy === 'recitation_audio'} onReady={(blob) => attach(blob, 'recitation_audio')} />}
      </section>

      <section className={styles.section} aria-labelledby="ap-documents">
        <h2 id="ap-documents" className={styles.sectionTitle}>
          {t('apply.documents')}
        </h2>
        <p className={styles.hint}>{t('apply.documentsHelp')}</p>
        {documents.map((f) => (
          <div key={f.id} className={styles.fileRow}>
            <a href={f.url ?? undefined} target="_blank" rel="noreferrer">
              {t(`apply.kinds.${f.kind === 'ijazah_scan' ? 'ijazah' : f.kind}`)}
            </a>
            <Button size="sm" variant="quiet" loading={files.busy === f.id} onClick={() => remove(f.id)}>
              {t('apply.removeFile')}
            </Button>
          </div>
        ))}
        <div className={styles.row2}>
          <SelectField label={t('apply.documentKind')} value={docKind} onChange={(e) => setDocKind(e.target.value)}>
            <option value="ijazah_scan">{t('apply.kinds.ijazah')}</option>
            <option value="certificate">{t('apply.kinds.certificate')}</option>
            <option value="other">{t('apply.kinds.other')}</option>
          </SelectField>
          <label className={`${styles.fileButton} ${styles.alignEnd}`}>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) attach(file, docKind);
              }}
            />
            {files.busy === docKind ? t('account.avatar.uploading') : t('apply.uploadDocument')}
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ap-more">
        <h2 id="ap-more" className={styles.sectionTitle}>
          {t('apply.more')}
        </h2>
        <TextArea label={t('apply.additionalInfo')} value={values.additionalInfo} onChange={set('additionalInfo')} rows={3} />
      </section>

      {!answering && (
        <section className={styles.section} aria-labelledby="ap-conduct">
          <h2 id="ap-conduct" className={styles.sectionTitle}>
            {t('apply.conductTitle')}
          </h2>
          <ul className={styles.conduct}>
            {['respect', 'method', 'neutral', 'safety', 'honesty'].map((key) => (
              <li key={key}>{t(`apply.conduct.${key}`)}</li>
            ))}
          </ul>
          <label className={styles.check}>
            <input type="checkbox" checked={values.conduct} disabled={application.codeOfConductAccepted} onChange={(e) => set('conduct')(e.target.checked)} />
            <span>{t('apply.conductAccept')}</span>
          </label>
        </section>
      )}

      {answering && (
        <section className={styles.section} aria-labelledby="ap-reply">
          <h2 id="ap-reply" className={styles.sectionTitle}>
            {t('apply.replyTitle')}
          </h2>
          <TextArea label={t('apply.replyMessage')} value={reply} onChange={(e) => setReply(e.target.value)} optional={false} />
        </section>
      )}

      <div className={styles.stickyActions}>
        <Button variant="secondary" loading={save.busy === 'save'} disabled={Boolean(save.busy)} onClick={persist}>
          {t('apply.saveDraft')}
        </Button>
        {answering ? (
          <Button loading={save.busy === 'reply'} disabled={reply.trim().length < 5 || Boolean(save.busy)} onClick={sendReply}>
            {t('apply.sendReply')}
          </Button>
        ) : (
          <Button loading={save.busy === 'submit'} disabled={!values.conduct || audio.length === 0 || Boolean(save.busy)} onClick={submit}>
            {t('apply.submit')}
          </Button>
        )}
        <span className={styles.hint} aria-live="polite">
          {saved ? t('apply.saved') : !answering && audio.length === 0 ? t('apply.needAudio') : !answering && !values.conduct ? t('apply.needConduct') : ''}
        </span>
      </div>
    </div>
  );
}

// ---- Read-only view, timeline ------------------------------------------------------------
function Summary({ application }) {
  const { t, formatters } = useI18n();
  const audio = application.files.filter((f) => f.kind === 'recitation_audio');
  const documents = application.files.filter((f) => f.kind !== 'recitation_audio');
  return (
    <>
      <section className={styles.section} aria-labelledby="sum-title">
        <h2 id="sum-title" className={styles.sectionTitle}>
          {t('apply.summary')}
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>{t('apply.fullName')}</dt>
            <dd>{application.fullName}</dd>
          </div>
          <div>
            <dt>{t('apply.memorization')}</dt>
            <dd>{application.memorizationLevel === 'full_hafiz' ? t('apply.levels.full_hafiz') : t('apply.juzOption', { count: application.memorizedJuzCount })}</dd>
          </div>
          {application.riwayah && (
            <div>
              <dt>{t('apply.riwayah')}</dt>
              <dd>{application.riwayah}</dd>
            </div>
          )}
          {application.teachingExperienceYears !== null && (
            <div>
              <dt>{t('apply.years')}</dt>
              <dd>{formatters.integer(application.teachingExperienceYears)}</dd>
            </div>
          )}
          {application.applicant.gender && (
            <div>
              <dt>{t('account.gender')}</dt>
              <dd>{t(`auth.gender.${application.applicant.gender}`)}</dd>
            </div>
          )}
          {application.phone && (
            <div>
              <dt>{t('apply.phone')}</dt>
              <dd dir="ltr">{application.phone}</dd>
            </div>
          )}
        </dl>
        {application.recitationExperience && (
          <>
            <h3 className={styles.label}>{t('apply.recitationExperience')}</h3>
            <p className={styles.prose}>{application.recitationExperience}</p>
          </>
        )}
        {application.teachingExperience && (
          <>
            <h3 className={styles.label}>{t('apply.teachingExperience')}</h3>
            <p className={styles.prose}>{application.teachingExperience}</p>
          </>
        )}
        {application.qualifications.length > 0 && (
          <>
            <h3 className={styles.label}>{t('apply.qualifications')}</h3>
            <ul className={styles.list}>
              {application.qualifications.map((q) => (
                <li key={q.id}>
                  {t(`apply.kinds.${q.kind}`)}: {q.title}
                  {q.grantedBy && ` — ${q.grantedBy}`}
                  {q.year && ` (${formatters.integer(q.year)})`}
                </li>
              ))}
            </ul>
          </>
        )}
        {application.additionalInfo && <p className={styles.prose}>{application.additionalInfo}</p>}
      </section>
      <section className={styles.section} aria-labelledby="sum-files">
        <h2 id="sum-files" className={styles.sectionTitle}>
          {t('apply.recitation')}
        </h2>
        {audio.map((f) => (
          <audio key={f.id} src={f.url ?? undefined} controls preload="metadata" className={styles.player} />
        ))}
        {documents.length > 0 && (
          <ul className={styles.list}>
            {documents.map((f) => (
              <li key={f.id}>
                <a href={f.url ?? undefined} target="_blank" rel="noreferrer">
                  {t(`apply.kinds.${f.kind === 'ijazah_scan' ? 'ijazah' : f.kind}`)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Timeline({ events }) {
  const { t, formatters } = useI18n();
  if (events.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="timeline-title">
      <h2 id="timeline-title" className={styles.sectionTitle}>
        {t('apply.timeline')}
      </h2>
      <ol className={styles.timeline}>
        {events.map((e) => (
          <li key={e.id} data-internal={e.internal || undefined}>
            <p className={styles.eventHead}>
              <strong>{t(`apply.events.${e.kind}`)}</strong>
              <span className={styles.hint}>
                {formatters.dateTime(e.at)}
                {e.author && ` · ${e.author}`}
                {e.internal && ` · ${t('apply.internal')}`}
              </span>
            </p>
            {e.scheduledAt && <p>{t('apply.interviewAt', { date: formatters.dateTime(e.scheduledAt), location: e.location ?? '' })}</p>}
            {e.message && <p className={styles.prose}>{e.message}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---- Applicant actions after submission --------------------------------------------------
function ApplicantActions({ application, onSaved }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [appeal, setAppeal] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const act = (action, body = {}) => mutation.run(action, (api) => api.post(`/api/v1/sheikh-applications/${application.id}/${action}`, body)).then((r) => r && onSaved(r));
  const open = ['submitted', 'under_review', 'interview_scheduled'].includes(application.status);
  return (
    <>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {application.decision && (
        <Alert tone="danger" title={t(`apply.reasons.${application.decision.reasonCode}`)}>
          {application.decision.explanation}
        </Alert>
      )}
      {application.canAppeal && (
        <section className={styles.section} aria-labelledby="appeal-title">
          <h2 id="appeal-title" className={styles.sectionTitle}>
            {t('apply.appealTitle')}
          </h2>
          <p className={styles.hint}>{t('apply.appealHelp')}</p>
          <TextArea label={t('apply.appealStatement')} value={appeal} onChange={(e) => setAppeal(e.target.value)} optional={false} />
          <div className={styles.actions}>
            <Button loading={mutation.busy === 'appeal'} disabled={appeal.trim().length < 5} onClick={() => act('appeal', { message: appeal.trim() })}>
              {t('apply.sendAppeal')}
            </Button>
          </div>
        </section>
      )}
      {open && (
        <div className={styles.actions}>
          {confirmWithdraw ? (
            <>
              <span>{t('apply.withdrawConfirm')}</span>
              <Button size="sm" variant="danger" loading={mutation.busy === 'withdraw'} onClick={() => act('withdraw')}>
                {t('apply.withdraw')}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirmWithdraw(false)}>
                {t('common.actions.cancel')}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="quiet" onClick={() => setConfirmWithdraw(true)}>
              {t('apply.withdraw')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

// ---- Reviewer --------------------------------------------------------------------------------
function ReviewPanel({ application, onSaved }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [mode, setMode] = useState(null); // request_info | schedule_interview | reject | note | approve
  const [message, setMessage] = useState('');
  const [reasonCode, setReasonCode] = useState('recitation_quality');
  const [when, setWhen] = useState('');
  const [location, setLocation] = useState('');
  const status = application.status;
  const deciding = ['under_review', 'interview_scheduled'].includes(status);

  async function send(action, body = {}) {
    const result = await mutation.run(action, (api) => api.post(`/api/v1/sheikh-applications/${application.id}/review`, { action, ...body }));
    if (result) {
      setMode(null);
      setMessage('');
      onSaved(result);
    }
  }
  function confirm() {
    if (mode === 'reject') return send('reject', { reasonCode, explanation: message.trim() });
    if (mode === 'request_info') return send('request_info', { message: message.trim() });
    if (mode === 'note') return send('note', { message: message.trim() });
    if (mode === 'approve') return send('approve', message.trim() ? { message: message.trim() } : {});
    if (mode === 'schedule_interview') return send('schedule_interview', { scheduledAt: new Date(when).toISOString(), ...(location.trim() ? { location: location.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) });
    return undefined;
  }
  const minLength = { reject: 10, request_info: 5, note: 2 }[mode] ?? 0;
  const ready = message.trim().length >= minLength && (mode !== 'schedule_interview' || Boolean(when));

  return (
    <section className={styles.reviewPanel} aria-labelledby="review-title">
      <h2 id="review-title" className={styles.sectionTitle}>
        {t('apply.review.title')}
      </h2>
      <p className={styles.hint}>{t('apply.review.rubric')}</p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {status === 'submitted' && (
        <Button loading={mutation.busy === 'start_review'} onClick={() => send('start_review')}>
          {t('apply.review.start')}
        </Button>
      )}
      {(deciding || status === 'submitted' || status === 'info_requested') && !mode && (
        <div className={styles.actions}>
          {deciding && (
            <>
              <Button onClick={() => setMode('approve')}>{t('apply.review.approve')}</Button>
              <Button variant="secondary" onClick={() => setMode('request_info')}>
                {t('apply.review.requestInfo')}
              </Button>
              <Button variant="secondary" onClick={() => setMode('schedule_interview')}>
                {t('apply.review.interview')}
              </Button>
              <Button variant="danger" onClick={() => setMode('reject')}>
                {t('apply.review.reject')}
              </Button>
            </>
          )}
          <Button variant="quiet" onClick={() => setMode('note')}>
            {t('apply.review.note')}
          </Button>
        </div>
      )}
      {mode && (
        <div className={styles.form}>
          {mode === 'reject' && (
            <SelectField label={t('apply.review.reason')} value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
              {['recitation_quality', 'insufficient_memorization', 'insufficient_experience', 'unverifiable_qualifications', 'conduct', 'incomplete', 'other'].map((code) => (
                <option key={code} value={code}>
                  {t(`apply.reasons.${code}`)}
                </option>
              ))}
            </SelectField>
          )}
          {mode === 'schedule_interview' && (
            <div className={styles.row2}>
              <TextField label={t('apply.review.when')} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} dir="ltr" />
              <TextField label={t('apply.review.where')} optional value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} dir="auto" />
            </div>
          )}
          <TextArea
            label={t(`apply.review.messageLabel.${mode}`)}
            hint={t(`apply.review.messageHint.${mode}`)}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            optional={minLength === 0}
          />
          <div className={styles.actions}>
            <Button variant={mode === 'reject' ? 'danger' : 'primary'} loading={Boolean(mutation.busy)} disabled={!ready} onClick={confirm}>
              {t(`apply.review.confirm.${mode}`)}
            </Button>
            <Button variant="quiet" onClick={() => setMode(null)}>
              {t('common.actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** One application: the applicant edits and follows it; reviewers decide on it. */
export function ApplicationPage() {
  const { t } = useI18n();
  const { applicationId } = useParams();
  const query = useApiQuery(`/api/v1/sheikh-applications/${applicationId}`);
  if (query.status === 'loading') return <ApplicationSkeleton />;
  if (query.status === 'error' && query.error?.status === 404) return <NotFoundPage />;
  if (query.status === 'error') return <div className={styles.page}><LoadError error={query.error} onRetry={query.reload} /></div>;

  const application = query.data;
  const reviewer = application.canReview;
  const editing = !reviewer && ['draft', 'info_requested'].includes(application.status);
  const authority = application.authority.type === 'platform' ? t('apply.platform') : application.authority.name;
  const lastRequest = [...application.events].reverse().find((e) => e.kind === 'info_requested');

  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to={reviewer ? (application.authority.type === 'platform' ? '/admin' : `/institutions/${application.authority.id}`) : '/apply'}>
          {reviewer ? t('apply.reviewQueue') : t('apply.myApplications')}
        </Link>
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>{reviewer ? t('apply.reviewTitle', { name: application.applicant.name }) : t('apply.title')}</h1>
        <p className={styles.actions}>
          <StatusBadge status={application.status} />
          <span className={styles.hint}>{t('apply.to', { authority })}</span>
        </p>
      </header>
      {application.status === 'info_requested' && lastRequest && !reviewer && (
        <Alert tone="warning" title={t('apply.infoRequested')}>
          {lastRequest.message}
        </Alert>
      )}
      {application.status === 'approved' && !reviewer && <Alert tone="success" title={t('apply.approvedTitle')}>{t('apply.approvedBody')}</Alert>}

      {editing ? <Editor key={`${application.id}-${application.status}`} application={application} onSaved={(next) => query.setData(next)} /> : <Summary application={application} />}
      {reviewer && <ReviewPanel application={application} onSaved={(next) => query.setData(next)} />}
      {!reviewer && !editing && <ApplicantActions application={application} onSaved={(next) => query.setData(next)} />}
      <Timeline events={application.events} />
    </div>
  );
}
