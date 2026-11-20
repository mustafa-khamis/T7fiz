/**
 * Realtime hints from the API (ADR-17): one WebSocket per tab, shared by every
 * subscriber. Events only say "this changed"; components refetch over REST.
 *
 * - Authenticates in the first message (the token never goes in the URL).
 * - Reconnects with backoff (1s → 30s), re-authenticates with a fresh token,
 *   and re-subscribes every topic. A 4001 close means the token expired.
 * - Without WebSocket support (tests, very old browsers) it does nothing, and
 *   pages fall back to their own periodic refresh.
 */
export function createRealtimeClient({ url, getToken, refreshToken }) {
  const listeners = new Map(); // topic → Set<callback>
  let socket = null;
  let ready = false;
  let attempt = 0;
  let timer = null;
  let closed = false;

  const send = (message) => socket?.readyState === 1 && socket.send(JSON.stringify(message));

  function connect() {
    if (closed || typeof WebSocket === 'undefined' || listeners.size === 0) return;
    socket = new WebSocket(url);
    socket.onopen = async () => {
      let token = getToken();
      if (!token) token = await refreshToken().catch(() => null);
      if (!token) return socket?.close();
      send({ type: 'auth', token });
      return undefined;
    };
    socket.onmessage = (message) => {
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (data.type === 'ready') {
        ready = true;
        attempt = 0;
        for (const topic of listeners.keys()) send({ type: 'subscribe', topic });
      } else if (data.type === 'event') {
        for (const callback of listeners.get(data.topic) ?? []) callback(data.event);
      }
    };
    socket.onclose = async (event) => {
      ready = false;
      socket = null;
      if (closed) return;
      if (event.code === 4001) await refreshToken().catch(() => null);
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      attempt += 1;
      timer = setTimeout(connect, delay);
    };
  }

  return {
    subscribe(topic, callback) {
      if (!listeners.has(topic)) {
        listeners.set(topic, new Set());
        if (ready) send({ type: 'subscribe', topic });
      }
      listeners.get(topic).add(callback);
      if (!socket && !timer) connect();
      return () => {
        const set = listeners.get(topic);
        set?.delete(callback);
        if (set && set.size === 0) {
          listeners.delete(topic);
          if (ready) send({ type: 'unsubscribe', topic });
        }
      };
    },
    close() {
      closed = true;
      clearTimeout(timer);
      socket?.close();
    },
  };
}

/** ws(s)://… for the API's realtime endpoint, on the API's origin. */
export function realtimeUrl(apiBaseUrl) {
  const base = apiBaseUrl || window.location.origin;
  return `${base.replace(/^http/, 'ws')}/api/v1/realtime`;
}
