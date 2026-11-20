/* T7fiz push service worker (NTF-2).
 *
 * Firebase Cloud Messaging delivers data-only messages here (the API never
 * sends a browser "notification" block), so this worker decides how each one
 * is shown:
 *   - a T7fiz tab is visible and focused → the tab shows an in-app alert;
 *   - otherwise → a system notification, which opens the right page on click.
 *
 * Kept dependency-free on purpose: no Firebase SDK, no imports, nothing to
 * load from another origin.
 */
const DEFAULT_TITLE = 'تحفيظ';
const ICON = '/android-chrome-192x192.png';
// Moments where a missed notification costs the person their turn stay on screen.
const STICKY = new Set(['recitation.your_turn', 'recitation.requested']);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function readPush(event) {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { data: { body: event.data ? event.data.text() : '' } };
  }
  // FCM wraps our fields in `data`; a console test message uses `notification`.
  const data = { ...(message.notification || {}), ...(message.data || {}) };
  return {
    kind: data.kind || '',
    title: data.title || DEFAULT_TITLE,
    body: data.body || '',
    link: typeof data.link === 'string' && data.link.startsWith('/') ? data.link : '/notifications',
    tag: data.tag || undefined,
  };
}

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });

self.addEventListener('push', (event) => {
  const push = readPush(event);
  event.waitUntil(
    (async () => {
      const open = await windows();
      const front = open.find((client) => client.focused && client.visibilityState === 'visible');
      if (front) {
        front.postMessage({ type: 't7fiz:push', push });
        return;
      }
      await self.registration.showNotification(push.title, {
        body: push.body,
        icon: ICON,
        tag: push.tag,
        renotify: Boolean(push.tag),
        requireInteraction: STICKY.has(push.kind),
        lang: /[؀-ۿ]/.test(push.title + push.body) ? 'ar' : 'en',
        dir: 'auto',
        data: { link: push.link },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/notifications';
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await windows();
      const tab = open.find((client) => new URL(client.url).origin === self.location.origin);
      if (tab) {
        // The app navigates itself (keeps state, no reload).
        tab.postMessage({ type: 't7fiz:navigate', link });
        return tab.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
