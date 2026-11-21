import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../src/app/App.jsx';
import { routes } from '../src/app/routes.jsx';
import { ApiError } from '../src/lib/api.js';

export const TEST_ME = {
  id: '6f0d5b3e-2c1a-4f6e-9a7b-1d2e3f4a5b6c',
  email: 'student@example.com',
  emailVerified: true,
  gender: 'female',
  profileComplete: true,
  accountStatus: 'active',
  displayName: 'فاطمة',
  locale: 'ar',
  timeZone: 'Africa/Khartoum',
  numberingSystem: 'auto',
  avatar: null,
  platformRoles: [],
  createdAt: '2026-11-15T08:00:00.000Z',
  updatedAt: '2026-11-15T08:00:00.000Z',
};

const tokens = { accessToken: 'test-access-token', accessTokenExpiresAt: '2026-11-15T09:00:00.000Z' };

/** Fake of the T7fiz auth API client (src/lib/api.js createAuthClient). */
export function createFakeAuthClient({ signedIn = false } = {}) {
  let session = signedIn;
  return {
    register: vi.fn(async () => ({ status: 'accepted' })),
    login: vi.fn(async () => {
      session = true;
      return tokens;
    }),
    refresh: vi.fn(async () => {
      if (!session) throw new ApiError({ status: 401, code: 'AUTH_SESSION_ENDED' });
      return tokens;
    }),
    logout: vi.fn(async () => {
      session = false;
    }),
    verifyEmail: vi.fn(async () => ({ status: 'verified' })),
    // "123456" is the right code; a correct code signs in unless signIn is false.
    verifyEmailCode: vi.fn(async (_email, code, signIn) => {
      if (code !== '123456') throw new ApiError({ status: 400, code: 'VERIFICATION_CODE_INVALID', details: { attemptsLeft: 4 } });
      if (!signIn) return { status: 'verified' };
      session = true;
      return tokens;
    }),
    resendVerification: vi.fn(async () => ({ status: 'accepted' })),
    forgotPassword: vi.fn(async () => ({ status: 'accepted' })),
    resetPassword: vi.fn(async () => ({ status: 'password_reset' })),
    googleStartUrl: (returnTo) => `/api/v1/auth/google/start?client=web&returnTo=${encodeURIComponent(returnTo)}`,
    setSignedIn(value) {
      session = value;
    },
  };
}

export function createFakeApi(me = TEST_ME) {
  let current = { ...me };
  return {
    // GET /me returns the account; the /me/* lists and circle timetables start empty.
    get: vi.fn(async (path) => (path?.startsWith('/api/v1/me/') || /\/(sessions|schedules)(\?|$)/.test(path ?? '') ? [] : current)),
    patch: vi.fn(async (_path, patch) => {
      current = { ...current, ...patch, updatedAt: '2026-11-15T09:00:00.000Z' };
      return current;
    }),
    post: vi.fn(async (path, body) => {
      if (path === '/api/v1/me/gender') current = { ...current, gender: body.gender, profileComplete: true };
      return current;
    }),
    put: vi.fn(async (path, body) => {
      if (path === '/api/v1/me/avatar') current = { ...current, avatar: { mediaId: body.mediaId, url: `https://storage.test/${body.mediaId}.jpg` } };
      return current;
    }),
    upload: vi.fn(async (purpose, blob) => ({ id: 'media-1', purpose, contentType: blob.type, byteSize: blob.size, status: 'stored' })),
    delete: vi.fn(async (path) => {
      if (path === '/api/v1/me/avatar') current = { ...current, avatar: null };
      return current;
    }),
  };
}

export function renderApp(path = '/', { authClient = createFakeAuthClient(), api = createFakeApi() } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <AppProviders services={{ authClient, api, apiBaseUrl: '' }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router, authClient, api };
}
