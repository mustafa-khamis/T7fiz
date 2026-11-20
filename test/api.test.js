import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, createAuthClient } from '../src/lib/api.js';

function jsonResponse(status, body) {
  return { ok: status < 400, status, json: async () => body, headers: new Headers({ 'x-request-id': 'req-1' }) };
}

describe('createAuthClient', () => {
  it('identifies as the web client and sends cookies only to the auth API', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: { accessToken: 'a' } }));
    const auth = createAuthClient({ baseUrl: '', fetchImpl, locks: null });
    await auth.login('a@b.co', 'pw');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/v1/auth/login');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-T7fiz-Client']).toBe('web');
  });

  it('never exposes a refresh token: it is not part of any request body', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: { accessToken: 'a' } }));
    const auth = createAuthClient({ fetchImpl, locks: null });
    await auth.refresh();
    expect(fetchImpl.mock.calls[0][1].body).toBe('{}');
  });

  it('collapses concurrent refreshes into one request and serializes them across tabs', async () => {
    let resolve;
    const fetchImpl = vi.fn(() => new Promise((r) => (resolve = r)));
    const locks = { request: vi.fn((_name, fn) => fn()) };
    const auth = createAuthClient({ fetchImpl, locks });
    const a = auth.refresh();
    const b = auth.refresh();
    resolve(jsonResponse(200, { data: { accessToken: 'new' } }));
    expect(await a).toEqual({ accessToken: 'new' });
    expect(await b).toEqual({ accessToken: 'new' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(locks.request).toHaveBeenCalledWith('t7fiz-auth-refresh', expect.any(Function));
  });
});

describe('createApiClient', () => {
  it('sends the in-memory access token and language, and unwraps data', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: { id: 1 } }));
    const api = createApiClient({ baseUrl: '', getAccessToken: () => 'tok', refreshAccessToken: vi.fn(), getLocale: () => 'en', fetchImpl });
    await expect(api.get('/api/v1/me')).resolves.toEqual({ id: 1 });
    expect(fetchImpl.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer tok', 'Accept-Language': 'en' });
    expect(fetchImpl.mock.calls[0][1].credentials).toBeUndefined();
  });

  it('uploads files as raw bytes with their own type, and JSON otherwise', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, { data: { id: 'm1' } }));
    const api = createApiClient({ baseUrl: '', getAccessToken: () => 'tok', refreshAccessToken: vi.fn(), fetchImpl });
    const blob = new Blob(['bytes'], { type: 'image/jpeg' });
    await expect(api.upload('avatar', blob)).resolves.toEqual({ id: 'm1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/v1/media?purpose=avatar');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(blob);
    expect(init.headers['Content-Type']).toBe('image/jpeg');

    await api.put('/api/v1/me/avatar', { mediaId: 'm1' });
    expect(fetchImpl.mock.calls[1][1].body).toBe('{"mediaId":"m1"}');
    expect(fetchImpl.mock.calls[1][1].headers['Content-Type']).toBe('application/json');
  });

  it('refreshes once and retries when the access token expired', async () => {
    let token = 'old';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'AUTH_TOKEN_EXPIRED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    const refreshAccessToken = vi.fn(async () => (token = 'new'));
    const api = createApiClient({ getAccessToken: () => token, refreshAccessToken, fetchImpl });
    await expect(api.get('/x')).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
  });

  it('ends the session when the server says it ended', async () => {
    const onSessionEnded = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: { code: 'AUTH_SESSION_ENDED' } }));
    const api = createApiClient({ getAccessToken: () => 't', refreshAccessToken: vi.fn(), onSessionEnded, fetchImpl });
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'AUTH_SESSION_ENDED' });
    expect(onSessionEnded).toHaveBeenCalled();
  });

  it('turns error envelopes into ApiError and network failures into NETWORK_ERROR', async () => {
    const api = createApiClient({
      getAccessToken: () => null,
      refreshAccessToken: vi.fn(),
      fetchImpl: vi.fn(async () => jsonResponse(400, { error: { code: 'VALIDATION_FAILED', requestId: 'abc' } })),
    });
    const error = await api.patch('/x', {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', requestId: 'abc' });

    const offline = createApiClient({ getAccessToken: () => null, refreshAccessToken: vi.fn(), fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    await expect(offline.get('/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('API base URL', () => {
  it('accepts an origin with or without /api and never doubles the prefix', async () => {
    const { normalizeApiBaseUrl } = await import('../src/config/env.js');
    expect(normalizeApiBaseUrl('')).toBe('');
    expect(normalizeApiBaseUrl(undefined)).toBe('');
    expect(normalizeApiBaseUrl('https://api.t7fiz.com/')).toBe('https://api.t7fiz.com');
    expect(normalizeApiBaseUrl('http://localhost:3000/api')).toBe('http://localhost:3000');
    expect(normalizeApiBaseUrl('https://t7fiz.com/api/v1/')).toBe('https://t7fiz.com');
  });
});
