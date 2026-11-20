import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeApi, createFakeAuthClient, renderApp } from './render.jsx';
import { disablePush, enablePush } from '../src/features/push/push.js';

const TOKEN = `fcm-web-token-${'x'.repeat(40)}`;

vi.mock('../src/config/env.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    config: { ...original.config, firebase: { apiKey: 'k', projectId: 't7fiz-test', messagingSenderId: '1', appId: '1:1:web:1', vapidKey: 'vapid', authDomain: 't7fiz-test.firebaseapp.com' } },
  };
});
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 't7fiz' })), getApps: () => [] }));
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(() => ({})), getToken: vi.fn(async () => TOKEN) }));

/** Browser push surface: Notification permission, a service worker that can post messages to the page. */
function installBrowserPush(permission = 'default') {
  const worker = new EventTarget();
  let listeners = 0;
  const notification = { permission, requestPermission: vi.fn(async () => (notification.permission = 'granted')) };
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  window.PushManager = function PushManager() {};
  window.Notification = notification;
  globalThis.Notification = notification;
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi.fn(async () => ({ active: {} })),
      ready: Promise.resolve({ active: {} }),
      addEventListener: (type, fn) => {
        listeners += 1;
        worker.addEventListener(type, fn);
      },
      removeEventListener: (type, fn) => {
        listeners -= 1;
        worker.removeEventListener(type, fn);
      },
    },
  });
  const post = (data) => act(() => worker.dispatchEvent(Object.assign(new Event('message'), { data })));
  return { notification, post, listening: () => listeners > 0 };
}

describe('push notifications (web)', () => {
  let browser;
  beforeEach(() => {
    browser = installBrowserPush();
  });
  afterEach(() => {
    delete window.PushManager;
    delete window.Notification;
    delete globalThis.Notification;
  });

  it('asks politely, then registers this browser with the API', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    renderApp('/', { authClient: createFakeAuthClient({ signedIn: true }), api });

    const prompt = (await screen.findByText('فعّل الإشعارات حتى لا يفوتك دورك')).closest('aside');
    expect(browser.notification.requestPermission).not.toHaveBeenCalled(); // never the bare browser prompt on load
    await user.click(within(prompt).getByRole('button', { name: 'تفعيل الإشعارات' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/v1/me/push-devices', { token: TOKEN, platform: 'web' }));
    expect(browser.notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/push-sw.js', { scope: '/' });
    await waitFor(() => expect(screen.queryByText('فعّل الإشعارات حتى لا يفوتك دورك')).toBeNull());
  });

  it('remembers "not now" for a while', async () => {
    const user = userEvent.setup();
    const first = renderApp('/', { authClient: createFakeAuthClient({ signedIn: true }) });
    await user.click(await screen.findByRole('button', { name: 'لاحقًا' }));
    expect(screen.queryByText('فعّل الإشعارات حتى لا يفوتك دورك')).toBeNull();
    first.unmount();

    renderApp('/', { authClient: createFakeAuthClient({ signedIn: true }) });
    await screen.findByRole('link', { name: 'الإشعارات' });
    expect(screen.queryByText('فعّل الإشعارات حتى لا يفوتك دورك')).toBeNull();
  });

  it('shows pushes that arrive while T7fiz is in front as in-app alerts, and opens their page', async () => {
    browser = installBrowserPush('granted');
    const user = userEvent.setup();
    const { router } = renderApp('/', { authClient: createFakeAuthClient({ signedIn: true }) });
    await waitFor(() => expect(browser.listening()).toBe(true));

    await browser.post({ type: 't7fiz:push', push: { kind: 'recitation.your_turn', title: 'حان دورك في التسميع', body: 'الشيخ ينتظرك في حلقة الفجر، ادخل الآن.', link: '/sessions/s1', tag: 'recitation.your_turn:s1' } });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('حان دورك في التسميع')).toBeTruthy();
    await user.click(within(alert).getByRole('button', { name: 'عرض' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/sessions/s1'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('follows a click on a system notification', async () => {
    browser = installBrowserPush('granted');
    const { router } = renderApp('/', { authClient: createFakeAuthClient({ signedIn: true }) });
    await waitFor(() => expect(browser.listening()).toBe(true));
    await browser.post({ type: 't7fiz:navigate', link: '/circles/c9' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/circles/c9'));
    // Only same-site paths are followed.
    await browser.post({ type: 't7fiz:navigate', link: 'https://evil.example/' });
    expect(router.state.location.pathname).toBe('/circles/c9');
  });

  it('explains a browser block on the notifications page, and lists who and where', async () => {
    browser = installBrowserPush('denied');
    const api = createFakeApi();
    const normal = api.get.getMockImplementation();
    api.get.mockImplementation(async (path) =>
      path === '/api/v1/me/notifications'
        ? [{ id: 'n1', kind: 'membership.requested', payload: { circleId: 'c1', circleName: 'حلقة الفجر', studentName: 'عمر' }, read: false, at: '2026-11-20T10:00:00.000Z' }]
        : normal(path),
    );
    renderApp('/notifications', { authClient: createFakeAuthClient({ signedIn: true }), api });
    expect(await screen.findByText(/محظورة من المتصفح/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'تفعيل الإشعارات' })).toBeNull();
    const item = (await screen.findByText('طلب انضمام جديد إلى حلقتك')).closest('li');
    expect(within(item).getByText('عمر · حلقة الفجر')).toBeTruthy();
    expect(within(item).getByRole('link', { name: 'عرض' }).getAttribute('href')).toBe('/circles/c1');
  });

  it('sends a test notification from the notifications page once push is on', async () => {
    browser = installBrowserPush('granted');
    const user = userEvent.setup();
    const api = createFakeApi();
    api.post.mockImplementation(async (path) => (path === '/api/v1/me/push-devices/test' ? { enabled: true, devices: 1 } : undefined));
    await enablePush(api);
    renderApp('/notifications', { authClient: createFakeAuthClient({ signedIn: true }), api });
    await user.click(await screen.findByRole('button', { name: 'إرسال إشعار تجريبي' }));
    expect(await screen.findByText('أُرسل إشعار تجريبي، سيظهر خلال ثوانٍ.')).toBeTruthy();
  });

  it('forgets this browser on sign-out', async () => {
    browser = installBrowserPush('granted');
    const api = createFakeApi();
    expect(await enablePush(api)).toBe('granted');
    await disablePush(api);
    expect(api.delete).toHaveBeenCalledWith('/api/v1/me/push-devices', { body: { token: TOKEN } });
    api.delete.mockClear();
    await disablePush(api);
    expect(api.delete).not.toHaveBeenCalled();
  });
});
