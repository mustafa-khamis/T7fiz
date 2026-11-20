import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { browserTimeZone } from '../../i18n/format.js';

const MeContext = createContext(null);

/**
 * The signed-in user's account from GET /api/v1/me.
 * Applies account preferences (language on sign-in, digits) and fills in the
 * time zone from the device the first time it is missing.
 */
export function MeProvider({ children }) {
  const auth = useAuth();
  const { api } = auth;
  const { locale, setLocale, setNumberingSystem } = useI18n();
  const [state, setState] = useState({ status: 'idle', me: null, error: null });
  const filledTimeZoneFor = useRef(null);

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    try {
      const me = await api.get('/api/v1/me');
      setState({ status: 'ready', me, error: null });
      return me;
    } catch (error) {
      setState({ status: 'error', me: null, error });
      return null;
    }
  }, [api]);

  useEffect(() => {
    if (auth.status !== 'signedIn') {
      setState({ status: auth.status === 'loading' ? 'idle' : 'signedOut', me: null, error: null });
      return;
    }
    load();
  }, [auth.status, load]);

  const update = useCallback(
    async (patch) => {
      const me = await api.patch('/api/v1/me', patch);
      setState({ status: 'ready', me, error: null });
      return me;
    },
    [api],
  );

  /** One-time completion for accounts created through Google. */
  const setGender = useCallback(
    async (gender) => {
      const me = await api.post('/api/v1/me/gender', { gender });
      setState({ status: 'ready', me, error: null });
      return me;
    },
    [api],
  );

  /** Uploads a prepared picture and makes it the profile picture. */
  const setAvatar = useCallback(
    async (blob) => {
      const media = await api.upload('avatar', blob);
      const me = await api.put('/api/v1/me/avatar', { mediaId: media.id });
      setState({ status: 'ready', me, error: null });
      return me;
    },
    [api],
  );

  const removeAvatar = useCallback(async () => {
    const me = await api.delete('/api/v1/me/avatar');
    setState({ status: 'ready', me, error: null });
    return me;
  }, [api]);

  const me = state.me;

  useEffect(() => {
    if (!me) return;
    setNumberingSystem(me.numberingSystem);
    // The account's language wins right after signing in; afterwards the
    // header toggle keeps device and account in sync.
    if (auth.lastEvent === 'SIGNED_IN' && me.locale !== locale) setLocale(me.locale);
    // Intentionally keyed on the account, not on locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (!me || me.timeZone || filledTimeZoneFor.current === me.id) return;
    const timeZone = browserTimeZone();
    if (!timeZone) return;
    filledTimeZoneFor.current = me.id;
    update({ timeZone }).catch(() => {
      // Non-blocking: the user can still set it on the account page.
    });
  }, [me, update]);

  const value = useMemo(
    () => ({ ...state, reload: load, update, setGender, setAvatar, removeAvatar }),
    [state, load, update, setGender, setAvatar, removeAvatar],
  );
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const context = useContext(MeContext);
  if (!context) throw new Error('useMe must be used inside <MeProvider>');
  return context;
}

/** Changes the UI language and, when signed in, saves it to the account. */
export function useChangeLocale() {
  const { setLocale } = useI18n();
  const { me, update } = useMe();
  return useCallback(
    (next) => {
      setLocale(next);
      if (me && me.locale !== next) {
        update({ locale: next }).catch(() => {
          // The device keeps the new language; the account keeps the old one
          // until the next successful save. Not worth interrupting the user.
        });
      }
    },
    [setLocale, me, update],
  );
}
