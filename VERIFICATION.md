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
| `packages/core/src/__tests__/router.test.ts` | Static + dynamic route matching, params, sitemap filtering, `getStaticParams()` path resolution |
| `packages/core/src/__tests__/renderStreaming.test.ts` | Real progressive streaming (a genuinely deferred island resolves after the shell, not just correct final output), CSP nonce on React's own post-shell patch script, shell vs. boundary error handling |
| `packages/core/src/__tests__/module.test.ts` | Explicit domain modules — composition, route namespacing, collision detection |
| `packages/core/src/__tests__/apiDispatch.test.ts` | Generic API routes — session/CSRF (including the header-based variant), dynamic params |
| `packages/core/src/__tests__/middleware.test.ts` | Native middleware composition; `fromExpressMiddleware()` against the real published `cors` package |
| `packages/core/src/__tests__/fastifyAdapter.test.ts` | `fromFastifyPlugin()` route adaptation, unsupported-method rejection |
| `packages/core/src/__tests__/disposeRegistry.test.ts` | Reload-safety dispose hook registry |
| `packages/core/src/__tests__/readBody.test.ts` | Request-body size cap — rejects an oversized body instead of buffering it unbounded, destroys the underlying stream when the limit is hit |
| `packages/cli/src/build/__tests__/checkNoAuthUsage.test.ts` | Build-time `auth: "none"` misuse detection (routes and API routes) |
| `packages/cli/src/build/__tests__/gitHelpers.test.ts` | Real git plumbing behind `devora split`/`sync`/`status` — status parsing, ahead/behind counts, real merge-conflict detection, path-containment (`assertInsideRoot`) against a crafted `.gitmodules`/config path escaping the project root |
| `packages/cli/src/build/__tests__/resolveSplitTarget.test.ts` | Resolves `devora split`/`sync <name>` to the right directory, including the same path-containment check |
| `packages/cli/src/commands/__tests__/generate-proxy.test.ts` | nginx/Caddy reverse-proxy config generation from `devora.config.ts` domains |
| `packages/cli/src/server/__tests__/moduleDisposePlugin.test.ts` | The dispose-hook Vite plugin's own hook logic |

Several existing files above also gained real regression tests from the v2 security audit worth
calling out specifically: `session.test.ts` (a cookie signed for one cookie name is rejected under
a different name, even with an identical secret — the real cross-app forgery fix), `isrCache.test.ts`
(a route path escaping the static output directory is refused, for both writes and deletes),
`securityHeaders.test.ts` (`script-src-elem` directive handling), `apiDispatch.test.ts` (the
`methods` allowlist rejects an undeclared method before the handler runs), `fastifyAdapter.test.ts`
(two different HTTP methods registered at the same path no longer collapse to one handler), and
`renderStreaming.test.ts` (a hung Suspense boundary is aborted by the connection timeout instead of
hanging forever).

`.github/workflows/ci.yml` also runs a real `devora build` for every app under all three build
targets (plain, `--adapter=vercel`, `--adapter=netlify`) on every push, which catches build-time
breakage (missing deps, bad imports, TypeScript errors) even though it isn't a behavioral test.

**Not covered by any automated test**: `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`,
`@devorajs/adapter-node`, `@devorajs/scaffold`, `@devorajs/backend`, `create-devora`, the three
example apps, Docker, and every CLI command except the build-time checks and git-plumbing logic
above (`devora split`/`sync`/`status`'s own real-git-repo behavior — as opposed to the plumbing
functions themselves — is manually verified below, not automated).

## Manually verified, not automated

Everything else described as working in `ROADMAP.md` was verified by hand during development —
real `curl`/browser requests, real `docker run`, real deploys, real Playwright screenshots taken
once and not committed — not by a test that runs again on the next change. In practice this
means a regression here would only be caught by someone (or something) re-running these checks
by hand. Areas covered this way:

- SSR/SSG/CSR/ISR/streaming rendering, per-route, in both dev and a real production build
- Islands hydrating in dev and production (real hashed asset URLs, real fetched JS), verified with
  real Playwright click tests (not just markup presence) — a real click genuinely incrementing
  state is what confirms a live event handler actually attached, not just correct HTML.
  A genuine, previously-undiscovered dev-mode bug was found this way (not by curl, which never
  exercises client-side JS execution at all): every island crashed at runtime with "@vitejs/
  plugin-react can't detect preamble", since this framework's hand-built HTML never goes through
  Vite's own `transformIndexHtml`. Fixed with a real virtual module (`reactRefreshPreamblePlugin.ts`)
  serving the Fast Refresh preamble as an external, CSP-compliant script — confirmed by the same
  Playwright click test passing afterward.
- Streaming specifically: a real deferred island (an artificially delayed import, removed after
  verification) confirmed the shell renders before the island resolves and that the client's
  `MutationObserver`-based hydration (not a one-shot scan) genuinely catches content that streams
  in *after* the bootstrap script already ran, with a real click confirming the late-hydrated
  island's event handler actually attached. Verified in dev, a real `devora build && devora start`
  production server, and both `adapter-vercel`/`adapter-netlify`'s generated functions run
  standalone — the Netlify path needed a real fix too (its Web Request/Response function shape has
  no Node stream to hand `pipeTo()`; its response shim now buffers into a real `Response` instead of
  crashing outright — functionally correct, not progressively flushed to the client the way
  adapter-node's real streaming is, documented as a known platform-shape gap). Also found and fixed
  along the way: React's own inline Suspense-boundary-patch script is blocked outright by this
  framework's default CSP (`default-src 'self'`) — fixed with a real per-request nonce threaded
  into both the CSP header and `renderToPipeableStream`'s own `nonce` option.
- Repo-splitting (`devora split`/`sync`/`status`) — a full real multi-contributor scenario: split a
  real app into its own repo (a local bare repo standing in for GitHub), a second clone pushing a
  change, pulling it back with `sync --from-main`, pushing a local edit with `sync --to-main`, and
  a deliberate same-line conflict from both sides, confirmed left as a genuine unresolved git merge
  (real conflict markers), not silently auto-resolved.
- Login → session → CSRF → logout → tampered-cookie rejection, for both a shared and an isolated
  auth app
- `adapter-vercel`/`adapter-netlify`'s generated functions, run standalone outside this repo (no
  ancestor `node_modules`) with `react`/`react-dom` hand-placed to simulate a platform's own
  dependency tracer
- Real, live production deployments to Vercel and Netlify (all three apps, both platforms — see
  the live demo links in `README.md`), including the `netlify.toml` `included_files` fixes
  (`package.json`, `node_modules`) — found and confirmed fixed against the actual live sites'
  function logs, not a local simulation of Netlify's own packaging step, which no local
  reproduction fully replicates (see `DEPLOYING.md`'s Netlify section).
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

- **A dynamic route (`[id].tsx`) without a `getStaticParams()` export can't use `ssg`/`isr`.**
  `ssr`/`csr` work with no extra step; `ssg`/`isr` need `getStaticParams()` to know which concrete
  values to pre-render and fail the build with a clear error if it's missing, rather than silently
  mis-building. `getStaticParams()` itself is verified end-to-end (real build output, real served
  static files, a real 404 for a value the route never listed).
- **`isr`'s disk cache is unverified under real serverless conditions specifically** (Vercel/
  Netlify) — see the "Not verified at all" section above; unrelated to streaming, which is a
  separate render mode with its own verification above.
