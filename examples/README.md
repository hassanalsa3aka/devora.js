# Examples

Small, runnable Devora.js projects. Each one is a standalone project that installs the
**published** packages (`@devorajs/core` and `@devorajs/cli` `^0.3.2`) from npm, not the source
in this repo, so it shows exactly what a new user gets. None of them is part of any published
package.

| Example | Shows | Apps |
|---|---|---|
| [`multi-app`](multi-app) | One project, three apps: a public site, a logged-in dashboard and a JSON API sharing one backend and one login | `site` (auth: none), `app` (shared), `api` (shared, backend-only) |
| [`api-bearer`](api-bearer) | A backend-only API for a mobile client: Bearer login, revocation, `csrf: false`, CORS | `api` (shared, backend-only) |
| [`content-site`](content-site) | A content site: `ssg` pages, a dynamic route with `getStaticParams()`, one island, route CSS, a sitemap | `blog` (auth: none) |
| [`realtime`](realtime) | Live updates (WebSockets): a token route, a separate Socket.IO server, a publish call, the CSP setting, a polling fallback (see [`docs/guides/REALTIME.md`](../docs/guides/REALTIME.md)) | `app` (shared) + `realtime/` (plain Node) |
| [`background-jobs`](background-jobs) | Background jobs: a BullMQ queue with a worker, a SQLite queue with a worker, and node-cron (see [`docs/guides/BACKGROUND-JOBS.md`](../docs/guides/BACKGROUND-JOBS.md)) | `api` (shared, backend-only) + `workers/` (plain Node) |

Run any of them from a fresh checkout (Node 20 or newer):

```bash
git clone https://github.com/hassanalsa3aka/devora.js.git
cd devora.js/examples/multi-app   # or api-bearer, content-site, realtime
npm ci
npm run dev
```

## How they're checked

CI (`.github/workflows/ci.yml`, job `examples`) runs, for each example:

```bash
npm ci
npm run typecheck
npm run build
node ../check.mjs   # starts `npm start` and sends real requests
```

`check.mjs` holds each example's checks: logins, CSRF, Bearer tokens, CORS headers, 404s,
pre-rendered pages. Run it yourself after `npm run build`.
