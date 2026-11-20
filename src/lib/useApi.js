import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider.jsx';

/**
 * Loads `path` from the API for the signed-in user.
 * status: 'loading' | 'ready' | 'error'. `reload()` refetches while keeping the
 * current data visible (`refreshing`); `setData` applies a local update after a
 * mutation returned the new state.
 *
 * Each result is tagged with the request it answers, so the loading state is
 * derived (no state reset inside the effect) and a late answer for an old
 * path can never overwrite a newer one.
 */
export function useApiQuery(path, { enabled = true } = {}) {
  const { api } = useAuth();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: null, path: null, data: null, error: null });
  const key = enabled && path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    const controller = new AbortController();
    api.get(path, { signal: controller.signal }).then(
      (data) => active && setResult({ key, path, data, error: null }),
      (error) => active && error?.name !== 'AbortError' && setResult({ key, path, data: null, error }),
    );
    return () => {
      // A superseded request is cancelled on purpose; its rejection is expected and ignored.
      active = false;
      controller.abort();
    };
  }, [api, path, key]);

  const current = result.key === key;
  const samePath = result.path === path && result.data !== null;
  let status;
  if (current) status = result.error ? 'error' : 'ready';
  else status = samePath ? 'ready' : 'loading';

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback(
    (update) => setResult((previous) => ({ ...previous, data: typeof update === 'function' ? update(previous.data) : update })),
    [],
  );
  return {
    status,
    data: status === 'ready' ? result.data : null,
    error: status === 'error' ? result.error : null,
    refreshing: !current && samePath,
    reload,
    setData,
  };
}

/**
 * Calls `onChange` when the API reports a change on `topic` (realtime hint),
 * and every `fallbackMs` as a safety net when the connection is down.
 */
export function useLiveTopic(topic, onChange, { fallbackMs = 20_000 } = {}) {
  const { realtime } = useAuth();
  useEffect(() => {
    if (!topic) return undefined;
    const unsubscribe = realtime?.subscribe(topic, () => onChange());
    const timer = fallbackMs ? setInterval(onChange, fallbackMs) : null;
    return () => {
      unsubscribe?.();
      if (timer) clearInterval(timer);
    };
  }, [realtime, topic, onChange, fallbackMs]);
}
