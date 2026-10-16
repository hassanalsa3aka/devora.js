# Example: background jobs

A backend-only Devora.js project (`--scope=backend`, `@devorajs/core` and `@devorajs/cli` 0.3.4 or later) with the three tested ways to run work
outside a request. Guide: the "Background jobs" page.

| Pattern | Files | Needs |
|---|---|---|
| BullMQ with Redis and a worker | `apps/api/endpoints/jobs-bullmq.ts`, `workers/worker-bullmq.mjs` | `redis-server`, `bullmq`, `ioredis` |
| SQLite queue and a worker | `apps/api/endpoints/jobs-sqlite.ts`, `workers/worker-sqlite.mjs` | Node with `node:sqlite` (run here on Node 24) |
| node-cron in the server | `apps/api/endpoints/cron-status.ts` | `node-cron` |

```bash
npm ci
npm run typecheck
npm run build
node ../check.mjs     # starts the app and the workers, runs every pattern, stops everything
```

## What the check runs, and what it skips

CI runs this example with the others (`.github/workflows/ci.yml`, job `examples`). `../check.mjs`:

- **SQLite queue and node-cron always run.** They need nothing but a Node with `node:sqlite`: Node's release notes say it is available without a flag from 22.13, and CI uses Node 22. It was run on Node 24 and on Node 22.23.3 locally. The first CI run on Node 22 failed with `database is locked` when the API route and the worker opened a new database file at the same moment; both now retry the open for up to 5 seconds.
- **The BullMQ part needs Redis, and skips when there is none.** It starts its own `redis-server` on
  port 6390 (and stops it) when that binary is on the PATH. If it is missing or does not start, the
  check prints `skip BullMQ checks: no redis-server is available here (the SQLite and cron checks still run)`
  and goes on. GitHub's runner has no Redis installed, so CI prints that line.

A worker is a separate process that must stay on, so it needs an always-on host. None of this was
deployed to Vercel or Netlify; see [the guide](../../docs/guides/BACKGROUND-JOBS.md) for what was and was not verified.
