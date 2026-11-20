// Client-safe configuration only. Never put secrets in VITE_* variables:
// they are embedded in the public bundle.
const env = import.meta.env;

/**
 * Origin of the T7fiz API. Empty = the same origin as the web app (the dev
 * server proxies /api; in production https://t7fiz.com serves the API under
 * /api). Request paths already start with /api/v1, so a value that ends in
 * /api or /api/v1 is accepted and trimmed rather than producing /api/api/….
 */
export function normalizeApiBaseUrl(value) {
  return (value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api(\/v1)?$/, '');
}

/**
 * Firebase web app settings for push notifications (all public by design:
 * they identify the project, they grant nothing). Push stays off unless all
 * five are set.
 */
export function firebaseConfig(values) {
  const pick = (key) => (values[key] || '').trim();
  const firebase = {
    apiKey: pick('VITE_FIREBASE_API_KEY'),
    projectId: pick('VITE_FIREBASE_PROJECT_ID'),
    messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: pick('VITE_FIREBASE_APP_ID'),
    vapidKey: pick('VITE_FIREBASE_VAPID_KEY'),
  };
  if (Object.values(firebase).some((v) => !v)) return null;
  return Object.freeze({ ...firebase, authDomain: `${firebase.projectId}.firebaseapp.com` });
}

export const config = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(env.VITE_API_BASE_URL),
  // Show "Continue with Google" only when the backend has Google configured.
  googleSignIn: env.VITE_GOOGLE_SIGN_IN === 'true',
  // Where the live-updates WebSocket connects when the host cannot forward WebSockets
  // (e.g. Vercel forwarding /api to the API): the API's own origin. Empty = same as the API.
  realtimeBaseUrl: normalizeApiBaseUrl(env.VITE_REALTIME_URL),
  // Push notifications through Firebase Cloud Messaging (null = off).
  firebase: firebaseConfig(env),
});
