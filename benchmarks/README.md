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
| `apps/devora` | Devora.js (`@devorajs/core`/`cli` 0.3.2) | `devora build`, `devora start` (adapter-node). `/static` is `ssg`; the counter is an `island()` |
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
| Time until interactive | From navigation start until a click on the counter changes it |

Client and server run on the same machine, so absolute numbers depend on it; compare frameworks
within one run, not across machines.

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

- Requests/second on localhost mostly measures the Node HTTP server and the rendering work per
  request. It says little about how many users an app can serve behind a real network and CDN.
- One machine, one run of the suite. Re-run on your own hardware before drawing conclusions.
- Hydration timing clicks the counter every 5 ms until it changes; it includes network and parse
  time on localhost, not a throttled phone.
- Idle memory includes the `npm` process that wraps `npm start` (the same for every framework).
