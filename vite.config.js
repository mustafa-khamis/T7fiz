import { createHash } from 'node:crypto'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Content-Security-Policy for production builds (a <meta> tag, so it ships
 * with the files whatever the host). Scripts: the bundle plus the one inline
 * theme script, allowed by its hash. Connections: the API (same origin, or
 * VITE_API_BASE_URL), LiveKit Cloud for voice, Firebase Cloud Messaging for push
 * notifications (when configured), and VITE_CSP_CONNECT_SRC for a
 * self-hosted media server. Images and recordings: signed Supabase Storage
 * URLs. The host should also send frame-ancestors/X-Frame-Options, HSTS and
 * nosniff as HTTP headers (a <meta> policy cannot set those; see README).
 */
function contentSecurityPolicy(env) {
  const origins = (value) =>
    (value || '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((url) => new URL(url).origin)
  const api = origins([env.VITE_API_BASE_URL, env.VITE_REALTIME_URL].filter(Boolean).join(' '))
  const apiSockets = api.map((origin) => origin.replace(/^http/, 'ws'))
  const storage = 'https://*.supabase.co'
  // Push notifications: the Firebase SDK registers this browser with FCM (only when configured).
  const firebase = env.VITE_FIREBASE_PROJECT_ID
    ? ['https://firebaseinstallations.googleapis.com', 'https://fcmregistrations.googleapis.com', 'https://fcm.googleapis.com']
    : []
  return {
    name: 't7fiz-content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${inline.join(' ')}`.trim(),
          // React sets inline styles through the DOM; no inline <style> blocks are shipped.
          "style-src 'self' 'unsafe-inline'",
          `img-src 'self' data: blob: ${storage}`,
          `media-src 'self' blob: ${storage}`,
          // Small font subsets are inlined by Vite as data: URLs.
          "font-src 'self' data:",
          ['connect-src', "'self'", ...api, ...apiSockets, 'https://*.livekit.cloud', 'wss://*.livekit.cloud', ...firebase, ...origins(env.VITE_CSP_CONNECT_SRC)].join(' '),
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          'upgrade-insecure-requests',
        ].join('; ')
        return html.replace('<meta charset="UTF-8" />', `$&\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Where the dev server forwards /api (and the realtime WebSocket).
  // Must match PORT in t7fiz-backend/.env; override with API_PROXY_TARGET in .env.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react(), contentSecurityPolicy(env)],
    build: {
      // The LiveKit SDK (~570 kB, ~150 kB gzip) is its own chunk, fetched only
      // when someone presses "Join audio"; every other chunk stays far below this.
      chunkSizeWarningLimit: 600,
    },
    server: {
      // The API is served under the same origin as the web app (as in production at
      // https://t7fiz.com/api), so the HttpOnly refresh cookie is first-party.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false, ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.js'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  }
})
