# Testing & verification

What's actually covered by an automated test, what's been manually verified but has no
regression protection, and what hasn't been exercised at all. `ROADMAP.md` has the detailed,
feature-by-feature account of how each of these was built and what verifying it actually
involved — this file is the shorter, honest summary of where the safety net does and doesn't
exist today.

## Automated tests (run in CI on every push/PR)

Real Vitest unit tests exist for `@devorajs/core` and one CLI utility — nowhere else yet:

| File | Covers |
|---|---|
| `packages/core/src/__tests__/session.test.ts` | Cookie signing/verification, tamper rejection |
| `packages/core/src/__tests__/csrf.test.ts` | CSRF token generation/verification |
| `packages/core/src/__tests__/securityHeaders.test.ts` | CSP/HSTS/X-Frame-Options defaults + overrides |
| `packages/core/src/__tests__/config.test.ts` | `devora.config.ts` validation |
| `packages/core/src/__tests__/isrCache.test.ts` | ISR disk cache staleness/regeneration |
| `packages/core/src/__tests__/renderRoute.test.ts` | Route rendering, redirects, render-mode dispatch |
| `packages/core/src/__tests__/router.test.ts` | Static + dynamic route matching, params, sitemap filtering |
| `packages/cli/src/build/__tests__/checkNoAuthUsage.test.ts` | Build-time `auth: "none"` misuse detection |

`.github/workflows/ci.yml` also runs a real `devora build` for every app under all three build
targets (plain, `--adapter=vercel`, `--adapter=netlify`) on every push, which catches build-time
breakage (missing deps, bad imports, TypeScript errors) even though it isn't a behavioral test.

**Not covered by any automated test**: `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`,
`@devorajs/adapter-node`, `@devorajs/scaffold`, `@devorajs/backend`, `create-devora`, the three
example apps, Docker, the nginx/Caddy proxy generator, and every CLI command except the one
build-time check above.

## Manually verified, not automated

Everything else described as working in `ROADMAP.md` was verified by hand during development —
real `curl`/browser requests, real `docker run`, real deploys, real Playwright screenshots taken
once and not committed — not by a test that runs again on the next change. In practice this
means a regression here would only be caught by someone (or something) re-running these checks
by hand. Areas covered this way:

- SSR/SSG/CSR/ISR rendering, per-route, in both dev and a real production build
- Islands hydrating in dev and production (real hashed asset URLs, real fetched JS)
- Login → session → CSRF → logout → tampered-cookie rejection, for both a shared and an isolated
  auth app
- `adapter-vercel`/`adapter-netlify`'s generated functions, run standalone outside this repo (no
  ancestor `node_modules`) with `react`/`react-dom` hand-placed to simulate a platform's own
  dependency tracer
- Real, live production deployments to Vercel and Netlify (all three apps, both platforms — see
  the live demo links in `README.md`)
- Docker (`docker build`/`run`/`compose up`), including the full login/CSRF/cookie regression
  re-run inside a running container
- `devora generate:proxy` against a real local nginx and a real local Caddy binary
- All CLI commands (`dev`/`build`/`start`/`new`/`add`/`remove`/`list`/`generate:proxy`/`deploy`),
  under npm, Yarn, and pnpm
- **`devora deploy`'s actual authenticated deploy**, on both Vercel and Netlify — a real account,
  real `vercel link`/`netlify link`, a real deploy that actually rendered correctly when opened in
  a browser (not just a clean CLI exit code). Two real bugs were found and fixed getting a clean
  run — see `DEPLOYING.md`'s `devora deploy` section for both.

## Not verified at all

- **`isr` regeneration on Vercel/Netlify specifically.** Fully verified under `adapter-node`'s
  long-lived process; a serverless function's filesystem isn't guaranteed to persist across
  invocations, and that specific behavior hasn't been exercised on either platform.
- **`deploy/devora.service`** (the systemd unit template) against a real systemd host.
- **A DB client under real production load.** A real Drizzle + `better-sqlite3` client was wired
  in and verified end-to-end during development, then reverted (the framework ships no built-in
  ORM by design) — see `ROADMAP.md` #6 for a genuine native-binding/Vite-SSR-reload hazard it
  surfaced, and `packages/backend/DATABASE.md` for a since-verified fix pattern (not shipped as
  the default). Not verified under sustained real production load/concurrency.

## Known unsupported, not silently missing

- **Dynamic routes (`[id].tsx`) don't support `ssg`/`isr`.** `ssr`/`csr` both work — verified
  end-to-end in dev, a real production build, `adapter-node`, and both Vercel/Netlify build
  targets; `ssg`/`isr` on a dynamic route fails the build with a clear error instead, since there's
  no static-params API yet to know which concrete values to pre-render.
- **`renderMode: "streaming"`** — typed and listed, not implemented. Needs a Suspense-boundary
  island rewrite; planned for v2 (see `ROADMAP.md`).
