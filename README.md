# T7fiz Web

React + Vite web application. JavaScript and plain CSS (CSS Modules for components). Arabic-first, RTL by default.

Design rules: [docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md). API contract: [docs/API_SPECIFICATION.md](../docs/API_SPECIFICATION.md).

## Setup

```sh
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:5173 (proxies /api to http://localhost:3000; set API_PROXY_TARGET to change)
```

Run the API (`t7fiz-backend`) alongside. All authentication goes through the API: the refresh token is an HttpOnly cookie on the same origin, and the access token is kept in memory (see [docs/SECURITY_MODEL.md](../docs/SECURITY_MODEL.md) §4). In production the web app and API share `https://t7fiz.com`, with the API under `/api`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Vitest + Testing Library (jsdom) |
| `npm run lint` | oxlint |

## Structure

```
src/
  app/          providers, routes, layouts, services context
  components/   ui/ (Button, Field, Alert) and layout/ (header, footer)
  features/     home/, auth/, account/ — pages and their state
  i18n/         ar.js (source) and en.js dictionaries, translator, formatters
  lib/          API and auth clients, device preferences
  styles/       tokens.css (design tokens, light/dark), base.css
  theme/        light / dark / system
test/           tests and render helpers with fake services
```

## Conventions

- **No hardcoded UI text.** Add keys to `src/i18n/dictionaries/ar.js` first, then `en.js`; a test fails if keys differ.
- **Logical CSS properties only** (`margin-inline-start`, `inset-inline-end`, `text-align: start`). Never `left`/`right`.
- Numbers and dates go through `formatters` from `useI18n()` so digit preference and time zones apply.
- Server errors are shown via `errors.<CODE>` dictionary keys.
- Use tokens from `tokens.css`; don't introduce raw colors in components.

## Production hosting

`npm run build` writes static files to `dist/`. Serve them with every unknown path falling back to
`index.html` (client-side routes), and route `/api` (including the `/api/v1/realtime` WebSocket) to the
T7fiz API on the same origin, so `VITE_API_BASE_URL` stays empty.

The build embeds a Content-Security-Policy `<meta>` tag (see `vite.config.js`): scripts from the site
only (the inline theme script is allowed by its hash), connections to the site, the API, and LiveKit
Cloud, images and recordings from Supabase Storage. A `<meta>` policy cannot set everything, so the
host must also send these HTTP headers on every response:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
Permissions-Policy: camera=(), geolocation=(), microphone=(self)
```

`microphone=(self)` keeps voice sessions and the Sheikh application recorder working. Cache files under
`/assets/` for a year (their names change with each build); serve `index.html` and `/push-sw.js`
(the push-notification service worker, which must stay at the site root) with `Cache-Control: no-cache`.

Push notifications need the five `VITE_FIREBASE_*` values in `.env.local`; setup:
[docs/PUSH_NOTIFICATIONS.md](../docs/PUSH_NOTIFICATIONS.md).
