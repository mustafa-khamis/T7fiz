import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { browserTimeZone } from '../../i18n/format.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { timeZoneOptions } from '../../lib/time-zones.js';
import { useMe } from '../account/MeProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { LoadError } from '../../components/ui/Status.jsx';
import { Stepper } from '../../components/ui/Stepper.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { WeeklyScheduleEditor } from '../schedule/WeeklyScheduleEditor.jsx';
import { clockLabel, dayOrder, defaultWeek, durationLabel, slotsFromWeek, studyDays, weekdayName } from '../schedule/week.js';
import { FormPageSkeleton } from './ManageSkeletons.jsx';
import styles from './Manage.module.css';
import wiz from './Wizard.module.css';
import { enrollmentChoices } from './enrollment.js';

function EnrollmentChoice({ value, onChange, choices }) {
  const { t } = useI18n();
  return (
    <fieldset className={wiz.choices}>
      <legend className={wiz.legend}>{t('manage.enrollment')}</legend>
      {choices.map((choice) => (
        <label key={choice} className={wiz.choice} data-selected={value === choice}>
          <input type="radio" name="enrollmentPolicy" value={choice} checked={value === choice} onChange={() => onChange(choice)} className={wiz.radio} />
          <span className={wiz.choiceText}>
            <span className={wiz.choiceTitle}>{t(`circles.enrollment.${choice}`)}</span>
            <span className={wiz.choiceHelp}>{t(`wizard.enrollmentHelp.${choice}`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Review row with a way back to the step that set it. */
function ReviewRow({ label, children, onEdit }) {
  const { t } = useI18n();
  return (
    <div className={wiz.reviewRow}>
      <dt className={wiz.reviewLabel}>{label}</dt>
      <dd className={wiz.reviewValue}>{children}</dd>
      <dd className={wiz.reviewEdit}>
        <Button size="sm" variant="quiet" onClick={onEdit} aria-label={t('wizard.editLabel', { section: label })}>
          {t('wizard.edit')}
        </Button>
      </dd>
    </div>
  );
}

/**
 * Creating a circle, one decision at a time:
 *   1. About the circle   2. Weekly timetable   3. Students and joining   4. Review
 * `mode="main"`: a new main circle with its first circle (one request, so a
 * half-made circle never exists). `mode="circle"`: another circle under an
 * existing main circle.
 */
function CircleWizard({ mode, main, institution }) {
  const { t, locale, formatters } = useI18n();
  const navigate = useNavigate();
  const { me } = useMe();
  const mutation = useMutation();
  const headingRef = useRef(null);
  const kind = (mode === 'main' ? institution?.kind : main?.institution?.kind) ?? null;
  const choices = enrollmentChoices(mode === 'main' ? institution : main?.institution);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [values, setValues] = useState(() => ({
    name: '',
    description: '',
    requirements: '',
    gender: me?.gender ?? 'male',
    week: defaultWeek(),
    timeZone: browserTimeZone() ?? 'UTC',
    capacity: '20',
    enrollmentPolicy: kind === 'private_paid' ? 'invite_only' : 'approval_required',
  }));
  const set = (patch) => setValues((v) => ({ ...v, ...patch }));
  const zones = useMemo(() => timeZoneOptions(values.timeZone), [values.timeZone]);
  const first = useRef(true);

  // Each step starts at its heading, so screen readers and keyboards follow along.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const steps = [
    { key: 'about', label: t('wizard.steps.about') },
    { key: 'schedule', label: t('wizard.steps.schedule') },
    { key: 'students', label: t('wizard.steps.students') },
    { key: 'review', label: t('wizard.steps.review') },
  ];

  function validate(index) {
    const next = {};
    if (index === 0 && values.name.trim().length < 2) next.name = t('manage.validation.name');
    if (index === 1 && studyDays(values.week).length === 0) next.week = t('schedule.chooseOneDay');
    if (index === 2) {
      const n = Number(values.capacity);
      if (!/^\d+$/.test(values.capacity) || n < 1 || n > 500) next.capacity = t('manage.validation.capacity');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const goNext = () => validate(step) && setStep(step + 1);
  const goTo = (index) => {
    setErrors({});
    setStep(index);
  };

  async function submit() {
    for (const index of [0, 1, 2]) {
      if (!validate(index)) return setStep(index);
    }
    const circle = {
      timeZone: values.timeZone,
      capacity: Number(values.capacity),
      enrollmentPolicy: values.enrollmentPolicy,
      schedule: slotsFromWeek(values.week),
      ...(values.requirements.trim() ? { requirements: values.requirements.trim() } : {}),
    };
    if (mode === 'main') {
      const created = await mutation.run('create', (api) =>
        api.post('/api/v1/main-circles', {
          name: values.name.trim(),
          ...(values.description.trim() ? { description: values.description.trim() } : {}),
          ...(institution ? { institutionId: institution.id, gender: values.gender } : {}),
          firstCircle: circle,
        }),
      );
      if (created) navigate(`/main-circles/${created.id}`, { replace: true, state: { created: true } });
    } else {
      const created = await mutation.run('create', (api) => api.post(`/api/v1/main-circles/${main.id}/circles`, { name: values.name.trim(), ...circle }));
      if (created) navigate(`/circles/${created.id}`, { replace: true });
    }
  }

  const days = studyDays(values.week);
  const offDays = dayOrder(locale).filter((d) => !values.week[d].on);
  const cancelTo = mode === 'circle' ? `/main-circles/${main.id}` : institution ? `/institutions/${institution.id}` : '/manage';
  const title = mode === 'circle' ? t('manage.newCircle') : institution ? t('manage.newMainCircle') : t('manage.newIndependent');

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <header className={styles.header}>
        {mode === 'circle' && (
          <p className={styles.breadcrumb}>
            <Link to={`/main-circles/${main.id}`}>{main.name}</Link>
          </p>
        )}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.muted}>{t('wizard.intro')}</p>
      </header>

      <Stepper steps={steps} current={step} onSelect={goTo} />

      <section className={wiz.card} aria-labelledby="wizard-step">
        <h2 id="wizard-step" ref={headingRef} tabIndex={-1} className={wiz.stepTitle}>
          {steps[step].label}
        </h2>
        <p className={styles.muted}>{t(`wizard.help.${steps[step].key}`)}</p>

        {step === 0 && (
          <div className={styles.form}>
            <TextField label={mode === 'main' ? t('manage.mainCircleName') : t('manage.circleName')} maxLength={120} dir="auto" value={values.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} hint={t('wizard.nameHint')} />
            {mode === 'main' && <TextAreaField label={t('manage.description')} optional rows={3} maxLength={2000} dir="auto" value={values.description} onChange={(e) => set({ description: e.target.value })} hint={t('wizard.descriptionHint')} />}
            {mode === 'main' && institution && (
              <SelectField label={t('manage.circleGender')} hint={t('manage.circleGenderHelp')} value={values.gender} onChange={(e) => set({ gender: e.target.value })}>
                <option value="male">{t('admin.circleGender.male')}</option>
                <option value="female">{t('admin.circleGender.female')}</option>
              </SelectField>
            )}
            {mode === 'main' && !institution && <p className={styles.hint}>{t('manage.independentGender', { gender: t(`admin.circleGender.${me?.gender ?? 'male'}`) })}</p>}
          </div>
        )}

        {step === 1 && (
          <div className={styles.form}>
            <WeeklyScheduleEditor value={values.week} onChange={(week) => set({ week })} error={errors.week} />
            <SelectField label={t('wizard.timeZone')} hint={t('wizard.timeZoneHint')} dir="ltr" value={values.timeZone} onChange={(e) => set({ timeZone: e.target.value })}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        {step === 2 && (
          <div className={styles.form}>
            <TextField label={t('manage.capacity')} hint={t('manage.capacityHelp')} inputMode="numeric" dir="ltr" value={values.capacity} onChange={(e) => set({ capacity: e.target.value })} error={errors.capacity} />
            <EnrollmentChoice value={values.enrollmentPolicy} onChange={(enrollmentPolicy) => set({ enrollmentPolicy })} choices={choices} />
            <TextAreaField label={t('circles.requirements')} optional rows={2} maxLength={1000} dir="auto" value={values.requirements} onChange={(e) => set({ requirements: e.target.value })} hint={t('wizard.requirementsHint')} />
          </div>
        )}

        {step === 3 && (
          <>
            <dl className={wiz.review}>
              <ReviewRow label={t('wizard.steps.about')} onEdit={() => goTo(0)}>
                <strong dir="auto">{values.name.trim()}</strong>
                {mode === 'main' && values.description.trim() && (
                  <span className={styles.muted} dir="auto">
                    {values.description.trim()}
                  </span>
                )}
              </ReviewRow>
              <ReviewRow label={t('wizard.steps.schedule')} onEdit={() => goTo(1)}>
                <ul className={wiz.reviewDays}>
                  {dayOrder(locale)
                    .filter((d) => values.week[d].on)
                    .map((d) => (
                      <li key={d}>
                        <strong>{weekdayName(locale, d)}</strong> · {clockLabel(formatters.tag, values.week[d].time)} · {durationLabel(t, values.week[d].duration)}
                      </li>
                    ))}
                </ul>
                <span className={styles.muted}>
                  {offDays.length ? t('schedule.offList', { days: offDays.map((d) => weekdayName(locale, d)).join(t('schedule.listSeparator')) }) : t('schedule.noDaysOff')} · {values.timeZone.replaceAll('_', ' ')}
                </span>
              </ReviewRow>
              <ReviewRow label={t('wizard.steps.students')} onEdit={() => goTo(2)}>
                <span>{t('wizard.seats', { count: Number(values.capacity) })}</span>
                <span>{t(`circles.enrollment.${values.enrollmentPolicy}`)}</span>
              </ReviewRow>
            </dl>
            {mode === 'main' && !institution && <Alert tone="info">{t('manage.reviewNotice')}</Alert>}
            {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
            <p className={styles.muted}>{t('wizard.sessionsRepeat', { count: days.length })}</p>
          </>
        )}

        <div className={wiz.nav}>
          {step < steps.length - 1 ? (
            <Button onClick={goNext}>{t('wizard.next')}</Button>
          ) : (
            <Button loading={mutation.busy === 'create'} onClick={submit}>
              {mode === 'main' ? t('manage.submitMainCircle') : t('manage.createCircle')}
            </Button>
          )}
          {step > 0 ? (
            <Button variant="secondary" onClick={() => goTo(step - 1)}>
              {t('wizard.back')}
            </Button>
          ) : (
            <Button variant="quiet" to={cancelTo}>
              {t('common.actions.cancel')}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

/** /main-circles/new (?institutionId=…) */
export function NewMainCirclePage() {
  const [params] = useSearchParams();
  const institutionId = params.get('institutionId');
  const query = useApiQuery(institutionId ? `/api/v1/institutions/${institutionId}` : null, { enabled: Boolean(institutionId) });
  if (institutionId && query.status === 'loading') return <FormPageSkeleton />;
  if (institutionId && query.status === 'error') return query.error?.status === 404 ? <NotFoundPage /> : <LoadError error={query.error} onRetry={query.reload} />;
  return <CircleWizard mode="main" institution={institutionId ? query.data : null} />;
}

/** /main-circles/:mainCircleId/circles/new */
export function NewCirclePage() {
  const { mainCircleId } = useParams();
  const query = useApiQuery(`/api/v1/main-circles/${mainCircleId}`);
  if (query.status === 'loading') return <FormPageSkeleton />;
  if (query.status === 'error') return query.error?.status === 404 ? <NotFoundPage /> : <LoadError error={query.error} onRetry={query.reload} />;
  if (!query.data.canManage) return <NotFoundPage />;
  return <CircleWizard mode="circle" main={query.data} />;
}
