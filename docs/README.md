# Documentation index

Start with the [README](../README.md). This page links every other document in the repository.

## Guides

| File | What it covers |
|---|---|
| [PAGES.md](guides/PAGES.md) | Request access in loaders, action results, forms, uploads, error pages, the head API, dynamic and catch-all routes |
| [DEPLOYING.md](guides/DEPLOYING.md) | Vercel, Netlify, Docker, container platforms, a VPS, CI, `devora deploy`, static-file serving |
| [REALTIME.md](guides/REALTIME.md) | Live updates (WebSockets): polling versus a realtime server, `ws` through a wrapper, why server-sent events do not work yet |
| [BACKGROUND-JOBS.md](guides/BACKGROUND-JOBS.md) | Background jobs: BullMQ with Redis, a SQLite queue, node-cron, and what was verified |
| [REPOS.md](guides/REPOS.md) | Splitting an app or the backend into its own repository |
| [AUTH.md](../packages/backend/AUTH.md) | Sessions, cookies behind proxies, CSRF, session stores |
| [DATABASE.md](../packages/backend/DATABASE.md), [DRIZZLE.md](../packages/backend/DRIZZLE.md), [PRISMA.md](../packages/backend/PRISMA.md) | Bringing your own database and ORM |

## Design

| File | What it covers |
|---|---|
| [architecture-v1.md](design/architecture-v1.md) | The original vision, security defaults, rendering model, explicit boundaries |
| [architecture-v2.md](design/architecture-v2.md) | Backend modules, API routes, middleware, repo-splitting, streaming |

## History

| File | What it covers |
|---|---|
| [BUILD-LOG.md](history/BUILD-LOG.md) | The long, dated account of how each piece was built and verified |
| [VERIFICATION.md](history/VERIFICATION.md) | What is covered by automated tests and what was checked by hand |
| [devora-pre-v3-hotfixes.md](history/devora-pre-v3-hotfixes.md) | The 0.3.0 hotfix spec |
| [devora-hotfix-round3.md](history/devora-hotfix-round3.md) | The 0.3.2 hotfix spec |

## Project

| File | What it covers |
|---|---|
| [ROADMAP.md](../ROADMAP.md) | What is done, now, next, later and not planned |
| [CHANGELOG.md](../CHANGELOG.md) | Every release, per package |
| [TESTING.md](../TESTING.md) | A 15-minute guide for outside testers |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Working on the repository, releasing, documenting changes |
| [SECURITY.md](../SECURITY.md) | Reporting a vulnerability |

## Packages, examples, benchmarks

[core](../packages/core/README.md) · [cli](../packages/cli/README.md) ·
[create-devora](../create-devora/README.md) · [adapter-node](../adapters/adapter-node/README.md) ·
[adapter-vercel](../adapters/adapter-vercel/README.md) · [adapter-netlify](../adapters/adapter-netlify/README.md) ·
[examples](../examples/README.md) · [benchmarks](../benchmarks/README.md)
