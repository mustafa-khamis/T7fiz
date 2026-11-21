/**
 * Clients for the T7fiz API (docs/API_SPECIFICATION.md).
 *
 * Browser session model (docs/SECURITY_MODEL.md §4):
 *   - The access token lives only in memory (lost on reload, by design).
 *   - The refresh token lives only in an HttpOnly cookie set by the API; this
 *     code never sees it. Calling /auth/refresh with the cookie yields a new
 *     access token and rotates the cookie.
 *   - Refreshes are serialized across tabs (Web Locks), because two tabs sending
 *     the same refresh token would look like token theft and end the session.
 */
export class ApiError extends Error {
  constructor({ status, code, details = null, requestId = null }) {
    super(`API error ${status}: ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const CLIENT_HEADER = { 'X-T7fiz-Client': 'web' };

const isBinary = (body) => typeof Blob !== 'undefined' && body instanceof Blob;

async function send(fetchImpl, url, { method, headers, body, signal, credentials }) {
  let response;
  // JSON by default; a Blob (file upload) is sent as-is with its own type.
  const contentType = body === undefined ? {} : { 'Content-Type': isBinary(body) ? body.type || 'application/octet-stream' : 'application/json' };
  try {
    response = await fetchImpl(url, {
      method,
      headers: { Accept: 'application/json', ...headers, ...contentType },
      body: body === undefined ? undefined : isBinary(body) ? body : JSON.stringify(body),
      signal,
      credentials,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR' });
  }
  if (response.status === 204) return undefined;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'generic',
      details: payload?.error?.details ?? null,
      requestId: payload?.error?.requestId ?? response.headers.get('x-request-id'),
    });
  }
  return payload?.data;
}

/** Authentication endpoints. Cookie-bearing calls use credentials: 'include'. */
export function createAuthClient({ baseUrl = '', fetchImpl = (...args) => fetch(...args), locks = globalThis.navigator?.locks } = {}) {
  const url = (path) => `${baseUrl}/api/v1/auth${path}`;
  const post = (path, body, extra = {}) =>
    send(fetchImpl, url(path), { method: 'POST', headers: { ...CLIENT_HEADER, ...extra.headers }, body, credentials: 'include' });

  let inFlight = null;
  async function refreshOnce() {
    const run = () => post('/refresh', {});
    return locks?.request ? locks.request('t7fiz-auth-refresh', run) : run();
  }

  return {
    register: (body) => post('/register', body),
    login: (email, password) => post('/login', { email, password }),
    /** Deduplicated within the tab and serialized across tabs. */
    refresh() {
      inFlight ??= refreshOnce().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    logout: () => post('/logout', {}),
    logoutAll: (accessToken) => post('/logout-all', undefined, { headers: { Authorization: `Bearer ${accessToken}` } }),
    verifyEmail: (token) => post('/email/verify', { token }),
    /** The 6-digit code from the email. With signIn, a correct code also starts a session (tokens returned). */
    verifyEmailCode: (email, code, signIn = true) => post('/email/verify', { email, code, signIn }),
    resendVerification: (email) => post('/email/resend', { email }),
    forgotPassword: (email) => post('/password/forgot', { email }),
    resetPassword: (token, password) => post('/password/reset', { token, password }),
    googleStartUrl: (returnTo = '/account') => `${url('/google/start')}?client=web&returnTo=${encodeURIComponent(returnTo)}`,
  };
}

/**
 * Authenticated API client. Retries once after refreshing when the access
 * token has expired; any other 401 means the session ended.
 */
export function createApiClient({ baseUrl = '', getAccessToken, refreshAccessToken, getLocale = () => 'ar', onSessionEnded = () => {}, fetchImpl = (...args) => fetch(...args) }) {
  async function request(method, path, { body, signal } = {}, retried = false) {
    const token = getAccessToken();
    const headers = { 'Accept-Language': getLocale(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    try {
      return await send(fetchImpl, `${baseUrl}${path}`, { method, headers, body, signal });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !retried) {
        if (error.code === 'AUTH_TOKEN_EXPIRED' || error.code === 'AUTH_REQUIRED') {
          const refreshed = await refreshAccessToken().catch(() => null);
          if (refreshed) return request(method, path, { body, signal }, true);
        }
        onSessionEnded();
      }
      throw error;
    }
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    /** Uploads a file (Blob) for a purpose; returns the stored media record. */
    upload: (purpose, blob, options) => request('POST', `/api/v1/media?purpose=${encodeURIComponent(purpose)}`, { ...options, body: blob }),
    delete: (path, options) => request('DELETE', path, options),
  };
}
