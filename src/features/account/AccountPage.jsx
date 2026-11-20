import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { browserTimeZone } from '../../i18n/format.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useMe } from './MeProvider.jsx';
import { ReadOnlyField, SelectField, TextField } from '../../components/ui/Field.jsx';
import { UserIcon } from '../../components/ui/icons.jsx';
import { validateDisplayName } from '../auth/auth-helpers.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { AvatarField } from './AvatarField.jsx';
import { MyCircles } from './MyCircles.jsx';
import { AccountBodySkeleton } from './AccountSkeleton.jsx';
import { SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import { timeZoneOptions } from '../../lib/time-zones.js';
import styles from './AccountPage.module.css';

function AccountForm({ me }) {
  const { t, setLocale, formatters } = useI18n();
  const { update } = useMe();
  const theme = useTheme();
  const detectedZone = browserTimeZone();
  const zones = useMemo(() => timeZoneOptions(me.timeZone), [me.timeZone]);

  const [values, setValues] = useState({
    displayName: me.displayName,
    locale: me.locale,
    timeZone: me.timeZone ?? '',
    numberingSystem: me.numberingSystem,
  });
  const [status, setStatus] = useState({ state: 'idle' }); // idle | saving | saved | error
  const [nameError, setNameError] = useState(null);

  const set = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    if (name === 'displayName' && nameError) setNameError(validateDisplayName(event.target.value));
    if (status.state !== 'saving') setStatus({ state: 'idle' });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const displayName = values.displayName.replace(/\s+/g, ' ').trim();
    const invalid = validateDisplayName(displayName);
    if (invalid) {
      setNameError(invalid);
      event.currentTarget.elements.namedItem('displayName')?.focus();
      return;
    }
    setNameError(null);

    const patch = {};
    if (displayName !== me.displayName) patch.displayName = displayName;
    if (values.locale !== me.locale) patch.locale = values.locale;
    if (values.timeZone && values.timeZone !== me.timeZone) patch.timeZone = values.timeZone;
    if (values.numberingSystem !== me.numberingSystem) patch.numberingSystem = values.numberingSystem;
    if (Object.keys(patch).length === 0) {
      setStatus({ state: 'saved' });
      return;
    }

    setStatus({ state: 'saving' });
    try {
      const saved = await update(patch);
      if (patch.locale) setLocale(saved.locale);
      setStatus({ state: 'saved' });
    } catch (error) {
      setStatus({ state: 'error', error });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={styles.panel} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={styles.panelTitle}>
          {t('account.profile')}
        </h2>
        <AvatarField me={me} />
        <TextField
          label={t('account.displayName')}
          name="displayName"
          icon={UserIcon}
          value={values.displayName}
          onChange={set('displayName')}
          maxLength={80}
          dir="auto"
          autoComplete="name"
          error={nameError && t(nameError)}
        />
        <ReadOnlyField label={t('account.email')} value={me.email ?? ''} hint={t('account.emailHint')} dir="ltr" />
        <ReadOnlyField label={t('account.gender')} value={me.gender ? t(`auth.gender.${me.gender}`) : '—'} hint={t('account.genderHint')} />
      </section>

      <section className={styles.panel} aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className={styles.panelTitle}>
          {t('account.preferences')}
        </h2>
        <SelectField label={t('account.language')} value={values.locale} onChange={set('locale')}>
          <option value="ar" lang="ar">
            {t('languages.ar')}
          </option>
          <option value="en" lang="en">
            {t('languages.en')}
          </option>
        </SelectField>
        <SelectField
          label={t('account.timeZone')}
          hint={
            detectedZone
              ? `${t('account.timeZoneHint')} ${t('account.timeZoneDetected', { zone: formatters.timeZoneName(detectedZone) })}`
              : t('account.timeZoneHint')
          }
          value={values.timeZone}
          onChange={set('timeZone')}
          dir="ltr"
        >
          {!values.timeZone && <option value="">{t('account.timeZoneUnset')}</option>}
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('account.numbering')} value={values.numberingSystem} onChange={set('numberingSystem')}>
          <option value="auto">{t('account.numberingAuto')}</option>
          <option value="latn">{t('account.numberingLatn')}</option>
          <option value="arab">{t('account.numberingArab')}</option>
        </SelectField>
        <SelectField
          label={t('account.theme')}
          hint={t('account.themeHint')}
          value={theme.mode}
          onChange={(event) => theme.setMode(event.target.value)}
        >
          <option value="system">{t('account.themeSystem')}</option>
          <option value="light">{t('account.themeLight')}</option>
          <option value="dark">{t('account.themeDark')}</option>
        </SelectField>
      </section>

      <div className={styles.actions}>
        <Button type="submit" loading={status.state === 'saving'}>
          {status.state === 'saving' ? t('common.states.saving') : t('common.actions.save')}
        </Button>
        <div aria-live="polite" className={styles.saveStatus}>
          {status.state === 'saved' && <span className={styles.saved}>{t('account.saved')}</span>}
        </div>
      </div>
      {status.state === 'error' && <Alert tone="danger">{errorMessage(t, status.error)}</Alert>}
    </form>
  );
}

function VerifyEmailBanner({ email }) {
  const { t } = useI18n();
  const { authClient } = useServices();
  const [state, setState] = useState('idle');
  async function resend() {
    setState('sending');
    try {
      await authClient.resendVerification(email);
      setState('sent');
    } catch {
      setState('failed');
    }
  }
  return (
    <Alert
      tone="warning"
      action={
        state === 'sent' ? null : (
          <Button variant="secondary" size="sm" onClick={resend} loading={state === 'sending'}>
            {t('account.verifyResend')}
          </Button>
        )
      }
    >
      {state === 'sent' ? t('account.verifyResent') : state === 'failed' ? t('errors.generic') : t('account.verifyBanner')}
    </Alert>
  );
}

export function AccountPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const { status, me, error, reload } = useMe();

  let body;
  if (status === 'error') {
    body = (
      <Alert
        tone="danger"
        title={t('account.loadError')}
        action={
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.actions.retry')}
          </Button>
        }
      >
        {errorMessage(t, error)}
      </Alert>
    );
  } else if (status !== 'ready') {
    body = (
      <SkeletonRegion label={t('account.loading')}>
        <AccountBodySkeleton />
      </SkeletonRegion>
    );
  } else {
    body = (
      <>
        {!me.emailVerified && <VerifyEmailBanner email={me.email} />}
        <AccountForm key={me.id} me={me} />
        <MyCircles />
      </>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('account.title')}</h1>
        <Button variant="quiet" onClick={auth.signOut}>
          {t('common.actions.signOut')}
        </Button>
      </header>
      {body}
    </div>
  );
}
