import { config } from '../../config/env.js';

/**
 * Web push through Firebase Cloud Messaging (NTF-2).
 *
 * - The Firebase SDK is loaded only when push is used (it is not in the main
 *   bundle) and only to obtain this browser's FCM token.
 * - Messages are shown by our own service worker, public/push-sw.js: it shows
 *   a system notification when T7fiz is in the background, and hands the
 *   message to the open tab when T7fiz is in front (an in-app alert instead).
 * - The token is registered with the API after sign-in and removed on sign-out.
 */
export const SERVICE_WORKER_URL = '/push-sw.js';
const TOKEN_KEY = 't7fiz.pushToken';
const DISMISS_KEY = 't7fiz.pushPromptDismissedAt';
const DISMISS_DAYS = 14;

const storage = {
  get(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: push still works for this visit.
    }
  },
};

export function pushSupported() {
  return (
    Boolean(config.firebase) &&
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** 'unsupported' | 'default' (not asked yet) | 'granted' | 'denied' (blocked in the browser). */
export function pushPermission() {
  return pushSupported() ? Notification.permission : 'unsupported';
}

export function pushPromptDismissed(now = Date.now()) {
  const at = Number(storage.get(DISMISS_KEY));
  return Boolean(at) && now - at < DISMISS_DAYS * 24 * 3600_000;
}

export function dismissPushPrompt(now = Date.now()) {
  storage.set(DISMISS_KEY, String(now));
}

async function serviceWorker() {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
  // getToken needs an active worker; on the very first visit it is still installing.
  if (registration.active) return registration;
  await navigator.serviceWorker.ready;
  return registration;
}

async function fcmToken(registration) {
  const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const { vapidKey, ...options } = config.firebase;
  const app = getApps().find((a) => a.name === 't7fiz') ?? initializeApp(options, 't7fiz');
  return getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
}

/**
 * Turns push on for this browser and the signed-in account. With `ask`, the
 * browser's permission question is shown if it was never answered (call it
 * from a click: browsers ignore or penalize unprompted requests).
 * Returns the resulting permission.
 */
export async function enablePush(api, { ask = false } = {}) {
  if (!pushSupported()) return 'unsupported';
  let permission = Notification.permission;
  if (permission === 'default' && ask) permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  const token = await fcmToken(await serviceWorker());
  if (!token) return 'default';
  await api.put('/api/v1/me/push-devices', { token, platform: 'web' });
  storage.set(TOKEN_KEY, token);
  return 'granted';
}

/** Stops pushes to this browser for the signed-in account (sign-out, or "turn off"). */
export async function disablePush(api) {
  const token = storage.get(TOKEN_KEY);
  storage.set(TOKEN_KEY, null);
  if (token) await api.delete('/api/v1/me/push-devices', { body: { token } });
}

export const pushEnabledHere = () => Boolean(storage.get(TOKEN_KEY));
