# Benchmarks

The same three pages built in five frameworks, each with its own documented production setup and
defaults, measured the same way. Not published to npm; nothing here is used by the framework.

| Page | What it is |
|---|---|
| `/static` | A page with no data, pre-rendered at build time |
| `/items` | Rendered per request: a loader returns 100 items, plus one interactive counter |
| `/form` | A form. POST with a name → 303 to `/form?sent=1`; POST without one → the page again with "Name is required" |

| App | Framework | Production setup |
|---|---|---|
| `apps/devora` | Devora.js (`@devorajs/core`/`cli` 0.3.4, installed from npm) | `devora build`, `devora start` (adapter-node). `/static` is `ssg`; the counter is an `island()` |
| `apps/next` | Next.js 16.4.1 | `next build`, `next start`, App Router. `/static` is static by default; `/items` uses `dynamic = "force-dynamic"` and a client component; the form is a Server Action with `useActionState` |
| `apps/astro` | Astro 7.3.8 | `output: "server"` on `@astrojs/node` (standalone); `/static` has `prerender = true`; the counter is a React component with `client:load` |
| `apps/sveltekit` | SvelteKit 3.0.1 | `@sveltejs/adapter-node` 6; `/static` has `prerender = true`; the form uses form actions with `fail()` and `redirect()` |
| `apps/react-router` | React Router 8.4.0 (framework mode) | `react-router build`, `react-router-serve`; `/static` is in `prerender`; the form uses `<Form>` and an `action` |

Exact versions are pinned in each app's `package-lock.json`.

## Fairness rules

- Each app uses its framework's documented production build and server, and its defaults. No
  tuning for any framework (the only settings are the ones needed to make each page work, listed
  above and commented in each config).
- The pages render the same content: same text, same 100 items, same counter, same form, same
  status codes. The one difference: Next.js answers an invalid Server Action submission with 200
  and the error (its documented behavior) instead of 400.
- No CSRF tokens are involved: Devora.js's per-form CSRF token needs sessions, which none of the
  other apps use. SvelteKit and Astro check the `Origin` header on form posts by default; the
  harness sends the same `Origin` and `Accept` a browser would.
- Production builds only. Every app runs on the same Node.

## What's measured

| Metric | How |
|---|---|
| Build time, cold | `npm run build` after deleting build output and caches |
| Build time, warm | `npm run build` again right after |
| Server start | From `npm start` until `/static` answers 200 |
| Idle memory | Resident memory of the server's process tree, 2 s after start |
| Requests/second, p50/p99 latency | [autocannon](https://github.com/mcollina/autocannon), 50 connections, 5 s warm-up, then 5 runs of 10 s; median run reported with min–max |
| JavaScript sent to the browser | Every script the page loads in Chromium, compressed with gzip -9 and brotli 11 |
| Bytes on the wire | After the run, one request per page read as raw bytes, once with only the load tool's headers (no `Accept-Encoding`, exactly what the requests/second runs measured) and once with a browser's `Accept-Encoding`; reported with `Content-Encoding` |
| Time until interactive | From navigation start until a click on the counter changes it |

Client and server run on the same machine, so absolute numbers depend on it; compare frameworks
within one run, not across machines.

## Reading the page numbers

Three full runs of the published 0.3.4 packages on one machine measured about 71,000-82,000
requests/s on the `/static` page. After the performance work released in 0.3.5 (see `CHANGELOG.md`
and `results/before-after.md`; measured on a build of that code before it was published) one full run measured about 101,500, against about
36,400-38,500 for Astro, SvelteKit and React Router and about 14,400 for Next.js. The page is tiny
(568 B for Devora.js; sizes for every framework are in `results/report.md`), the load generator
runs on the same machine, and no framework compressed during the timed runs (the load tool sends no
`Accept-Encoding`). In that run Devora.js also led the server-rendered page and the form POST.
Use the numbers to compare frameworks within one run, not as a claim about your app.

## Backend scenarios (D to G)

`run-backend.mjs` measures the same API in ten apps: Devora.js (a backend-only app), Express 5,
Fastify 5, Hono, NestJS on its Express and on its Fastify platform, and the API routes of Next.js,
SvelteKit, React Router and Astro. The contract (identical payloads, status codes and validation in
every app, checked before any timing) is in [backend/CONTRACT.md](backend/CONTRACT.md).

| Scenario | What it is |
|---|---|
| D | `GET /api/items`: a JSON list of 100 items |
| E | `GET /api/me` with a Bearer token from `POST /api/session`: a session lookup, then JSON |
| F | `POST /api/items` with a JSON body: valid (201) and invalid (422), validated by the same function in every app |
| G | `GET /api/slow`: one awaited 2 ms timer (a stand-in for a database round trip), then JSON |

Fairness notes specific to these scenarios:

- Defaults everywhere: no logging, no tuning, `NODE_ENV=production`. No app strips headers, sessions or
  CSRF handling to be faster. Devora.js sends CSP, HSTS and X-Frame-Options on every response (the
  report lists header bytes per response) and runs its real session layer for E; the bare backend
  frameworks do neither. A `Map` lookup in an Express app does less work than Devora.js's session lookup.
- G is limited by the timer: every framework lands within about 15% of 15,000 requests/s, and the order
  between runs changes. Do not read a winner into it.
- Memory after load is the resident memory of the process tree after the last scenario; V8 keeps more
  heap when a server is faster, so compare it with care.

```bash
node run-backend.mjs [--only=devora-api,express] [--quick] [--tag=name]
node report-backend.mjs results/backend-raw-<date>.json     # results/backend-report.md
node compare.mjs <backend-before> <backend-after> <pages-before> <pages-after>   # results/before-after.md
```

The two Devora.js apps (`apps/devora`, `apps/devora-api`) install the published 0.3.4 packages;
`scripts/use-local-build.sh` copies a build of this working tree over them, which is how the "after"
numbers were produced (commit `9c191f7`). `npm ci` inside an app restores the published packages.

## Results kept in the repository

| File | What |
|---|---|
| `results/*-baseline.json`, `*-baseline.md` | Before the optimizations: published 0.3.4, all scenarios, all frameworks |
| `results/*-after.json` | After: this working tree, same harness |
| `results/before-after.md` | Devora.js before and after, with ranks (generated) |
| `results/backend-report.md`, `report.md`, `latest.json`, `backend-latest.json` | Reports of the newest run (the "after" run) |
| `results/ab-published-vs-final.txt` | Interleaved A/B of the published build against the final one, same machine state |

The baseline backend run was noisy for Devora.js (scenario D ranged 26,001-37,802 requests/s across its five
runs). Because of that, the interleaved A/B is the more reliable before/after for Devora.js alone: +15% on D,
+32% on E, +21% on F1, +41% on the static page and +23% on the server-rendered page.

## Run it

```bash
cd benchmarks
npm ci                                   # autocannon + Playwright
npx playwright install chromium          # or set CHROME_PATH to a Chromium binary
for app in apps/*; do (cd "$app" && npm ci); done
npm run bench                            # about 20 minutes; --quick for a smoke run, --only=devora,next
npm run report                           # results/report.md and results/latest.json
```

Port 4300 must be free. `results/raw-<date>.json` keeps every run's numbers.

## Caveats

- The load tool sends no `Accept-Encoding`, so no framework compresses during the runs; page sizes still differ
  because each framework emits different HTML (see "Response bytes on the wire" in the report). A smaller
  page is part of why a framework is faster here; the report shows the sizes so that can be judged.
- Devora.js is measured through its documented production path (`devora build`, `devora start`),
  installed from the published npm packages.

- Requests/second on localhost mostly measures the Node HTTP server and the rendering work per
  request. It says little about how many users an app can serve behind a real network and CDN.
- One machine, one run of the suite. Re-run on your own hardware before drawing conclusions.
- Hydration timing clicks the counter every 5 ms until it changes; it includes network and parse
  time on localhost, not a throttled phone.
- Idle memory includes the `npm` process that wraps `npm start` (the same for every framework).
