import { useCallback, useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider.jsx';

/**
 * Runs API writes and tracks which one is in flight (`busy` = its key) and the
 * last error. `run(key, api => …)` resolves to the result (or `true` for empty
 * answers), or `null` when it failed — the error is then in `error`.
 */
export function useMutation() {
  const { api } = useAuth();
  const [state, setState] = useState({ busy: null, error: null });
  const run = useCallback(
    async (key, fn) => {
      setState({ busy: key, error: null });
      try {
        const result = await fn(api);
        setState({ busy: null, error: null });
        return result ?? true;
      } catch (error) {
        setState({ busy: null, error });
        return null;
      }
    },
    [api],
  );
  const clearError = useCallback(() => setState((current) => ({ ...current, error: null })), []);
  return { ...state, run, clearError };
}
