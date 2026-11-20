import { createRealtimeClient, realtimeUrl } from '../../lib/realtime.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useServices } from '../../app/services.jsx';
import { createApiClient } from '../../lib/api.js';
import { disablePush } from '../push/push.js';

const AuthContext = createContext(null);

/** In-memory holder for the access token: a credential, never render state, never persisted. */
function createTokenHolder() {
  let token = null;
  return { get: () => token, set: (value) => (token = value ?? null) };
}

/** Signing out in one tab signs out the other tabs. */
function createSignOutBroadcast() {
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('t7fiz-auth') : null;
  return {
    announce: () => channel?.postMessage('signed-out'),
    subscribe(listener) {
      if (!channel) return () => {};
      const handler = (event) => event.data === 'signed-out' && listener();
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
  };
}

/**
 * Session state for the web app, backed by the T7fiz API.
 * status: 'loading' | 'signedIn' | 'signedOut'
 *
 * On load, the app asks the API for a new access token using the HttpOnly
 * refresh cookie; if that fails the user is signed out.
 */
export function AuthProvider({ children }) {
  const { authClient, apiBaseUrl, api: injectedApi } = useServices();
  const [tokens] = useState(createTokenHolder);
  const [broadcast] = useState(createSignOutBroadcast);
  const [state, setState] = useState({ status: 'loading', lastEvent: null });

  const applySession = useCallback(
    (result, event) => {
      tokens.set(result?.accessToken);
      setState({ status: tokens.get() ? 'signedIn' : 'signedOut', lastEvent: event });
    },
    [tokens],
  );

  const endSession = useCallback(
    (announce = true) => {
      tokens.set(null);
      setState({ status: 'signedOut', lastEvent: 'SIGNED_OUT' });
      if (announce) broadcast.announce();
    },
    [tokens, broadcast],
  );

  // Restore the session from the refresh cookie.
  useEffect(() => {
    let active = true;
    authClient
      .refresh()
      .then((result) => active && applySession(result, 'RESTORED'))
      .catch(() => active && applySession(null, 'RESTORED'));
    return () => {
      active = false;
    };
  }, [authClient, applySession]);

  useEffect(() => broadcast.subscribe(() => endSession(false)), [broadcast, endSession]);

  const api = useMemo(
    () =>
      injectedApi ??
      createApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: tokens.get,
        refreshAccessToken: async () => {
          const result = await authClient.refresh();
          tokens.set(result.accessToken);
          return result.accessToken;
        },
        getLocale: () => document.documentElement.lang || 'ar',
        onSessionEnded: () => endSession(),
      }),
    [injectedApi, apiBaseUrl, tokens, authClient, endSession],
  );

  // One realtime client per signed-in tab. It connects only when something
  // subscribes, so creating it has no side effects; it is closed on sign-out.
  const signedIn = state.status === 'signedIn';
  const realtime = useMemo(
    () =>
      signedIn && !injectedApi
        ? createRealtimeClient({
            url: realtimeUrl(apiBaseUrl),
            getToken: tokens.get,
            refreshToken: async () => {
              const result = await authClient.refresh();
              tokens.set(result.accessToken);
              return result.accessToken;
            },
          })
        : null,
    [signedIn, injectedApi, apiBaseUrl, tokens, authClient],
  );
  useEffect(() => () => realtime?.close(), [realtime]);

  const value = useMemo(
    () => ({
      ...state,
      api,
      realtime,
      async signIn(email, password) {
        applySession(await authClient.login(email, password), 'SIGNED_IN');
      },
      /** After Google returns to /auth/callback the refresh cookie is set; exchange it for an access token. */
      async completeRedirectSignIn() {
        applySession(await authClient.refresh(), 'SIGNED_IN');
      },
      async signOut() {
        try {
          // Stop pushes to this browser for this account before the session ends.
          await disablePush(api).catch(() => {});
          await authClient.logout();
        } finally {
          endSession();
        }
      },
      googleStartUrl: (returnTo) => authClient.googleStartUrl(returnTo),
    }),
    [state, api, realtime, authClient, applySession, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
