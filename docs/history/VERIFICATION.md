# Testing & verification

What's covered by an automated test, what's been manually verified but has no regression
protection, and what hasn't been exercised at all. `docs/history/BUILD-LOG.md` is the detailed build log; this
file is the short summary of where the safety net does and doesn't exist today.

> Status of everything open (not verified, known unsupported, findings) is tracked in
> [ROADMAP.md](../../ROADMAP.md); this file explains how each thing is tested.

## Automated tests (run in CI on every push/PR)

`pnpm run test` runs 466 Vitest tests in 41 files (as of 0.3.4). The integration tests boot a real
dev server (`createAppDevServer`, exactly what `devora dev` boots) or the real production handler
against a real `devora build` output, and send real HTTP requests.

| File | Covers |
|---|---|
| `packages/core/src/__tests__/session.test.ts` | Opaque server-side sessions over cookie and Bearer, active → idle → dead, CSRF enforced for cookie auth and skipped for Bearer, `auth: "none"` contexts, cross-app scope |
| `packages/core/src/__tests__/sessionCookiePolicy.test.ts` | Per-app session/cookie settings: `secure`, `sameSite`, `domain`, lifetimes, `csrf: false`, `trustProxy` scheme detection, `noindex` |
| `packages/core/src/__tests__/csrf.test.ts` | CSRF token generation/verification |
| `packages/core/src/__tests__/securityHeaders.test.ts` | CSP/HSTS/X-Frame-Options defaults + overrides, `script-src-elem` |
| `packages/core/src/__tests__/config.test.ts` | `devora.config.ts` validation |
| `packages/core/src/__tests__/isrCache.test.ts` | ISR disk cache staleness/regeneration, path containment |
| `packages/core/src/__tests__/renderRoute.test.ts` | Route rendering, redirects, render-mode dispatch |
| `packages/core/src/__tests__/pageRequests.test.ts` | `ctx.url`/`headers`/`ip`/`request` in loaders and actions, `actionData`/`fail()`/`redirect()`, errors keeping their status and rendering the error page, the head API and opt-in theme, form-body parsing |
| `packages/core/src/__tests__/router.test.ts` | Static + dynamic route matching, params, sitemap filtering, `getStaticParams()` |
| `packages/core/src/__tests__/renderStreaming.test.ts` | Progressive streaming (a deferred island resolves after the shell), CSP nonce on React's patch script, shell vs. boundary errors, the connection timeout |
| `packages/core/src/__tests__/apiDispatch.test.ts` | Generic API routes — session/CSRF, dynamic params, the `methods` allowlist |
| `packages/core/src/__tests__/cors.test.ts` | `cors` config validation, allowed origins and wildcards, preflights |
| `packages/core/src/__tests__/module.test.ts` | Explicit domain modules — composition, route namespacing, collision detection |
| `packages/core/src/__tests__/middleware.test.ts` | Native middleware composition; `fromExpressMiddleware()` against the real published `cors` package |
| `packages/core/src/__tests__/fastifyAdapter.test.ts` | `fromFastifyPlugin()` route adaptation, unsupported-method rejection |
| `packages/core/src/__tests__/disposeRegistry.test.ts` | Reload-safety dispose hook registry |
| `packages/core/src/__tests__/readBody.test.ts` | Request-body size cap (413 instead of buffering an oversized body) |
| `packages/core/src/__tests__/branding.test.ts` | `PageShell` markup and props, the backend-only status page at `/` |
| `packages/cli/src/server/__tests__/devServer.integration.test.ts` | Real dev server: the `/api/**` JSON contract, unified session auth, session states over real time |
| `packages/cli/src/server/__tests__/prodServer.integration.test.ts` | Real production handler: the same contracts, and refusing to start without a session store |
| `packages/cli/src/server/__tests__/cookiePolicy.integration.test.ts` | Real servers: `Secure`/`SameSite`/`Domain`/lifetimes, CSRF cookie vs Bearer, `csrf: false`, `noindex`, CORS, the backend-only status |
| `packages/cli/src/server/__tests__/devSessionConfig.integration.test.ts` | Dev server validates session settings at boot |
| `packages/cli/src/server/__tests__/apiDir.integration.test.ts` | `apiDir: "endpoints"` serves `/api/**` in dev and production |
| `packages/cli/src/server/__tests__/moduleDisposePlugin.test.ts` | The dispose-hook Vite plugin |
| `packages/cli/src/build/__tests__/adapterCjsSmoke.test.ts` | The generated Vercel/Netlify functions with a CommonJS dependency, sessions and headers |
| `packages/cli/src/build/__tests__/preflight.test.ts` | Vercel/Netlify preflight checks, `apiDir` validation, `prebuild` |
| `packages/cli/src/build/__tests__/phase4.test.ts` | `.env` loading and precedence, the dev watcher's ignore list |
| `packages/cli/src/build/__tests__/checkNoAuthUsage.test.ts` | Build-time `auth: "none"` misuse detection |
| `packages/cli/src/build/__tests__/gitHelpers.test.ts` | Git plumbing behind `devora split`/`sync`/`status`, path containment |
| `packages/cli/src/build/__tests__/resolveSplitTarget.test.ts` | `devora split`/`sync <name>` target resolution |
| `packages/cli/src/commands/__tests__/startAndBuildFlags.test.ts` | `devora start` `PORT`/`HOST`/`--port`/`--host`, `devora build --adapter` validation, `devora add --kind` |
| `packages/cli/src/commands/__tests__/generate-proxy.test.ts` | nginx/Caddy config generation |
| `packages/cli/src/terminal/__tests__/bootSummary.test.ts` | `devora dev` boot output: URLs first, routes per app, the 10-API-route limit, `--quiet` |
| `packages/scaffold/src/__tests__/terminal.test.ts` | Terminal header: color levels, `NO_COLOR`/`FORCE_COLOR`, CI, narrow terminals |
| `packages/scaffold/src/__tests__/scope.test.ts` | `create-devora` scopes (full-stack, frontend, backend) |
| `adapters/adapter-vercel/src/__tests__/runtime.test.ts` | Vercel runtime selection (never the discontinued `nodejs20.x`) |

CI (`.github/workflows/ci.yml`) also, on every push:

- typechecks every published package;
- typechecks fresh full-stack and backend-only `create-devora` projects installed from the packed
  tarballs (`scripts/typecheck-fresh-scaffold.mjs`);
- installs the packed `@devorajs/adapter-node` in an empty folder and imports it with plain Node
  (`scripts/smoke-adapter-node.mjs`);
- runs a real `devora build` for every app under all three targets (plain, `--adapter=vercel`,
  `--adapter=netlify`).

**Not covered by an automated test**: Docker, `devora deploy`, `devora split`/`sync`/`status`
against real remotes, `devora generate:proxy` against a real nginx/Caddy, browser behavior
(island hydration clicks, layout), and live platform deploys. Those were checked by hand (below).

## Manually verified, not automated

Everything else described as working in `docs/history/BUILD-LOG.md` was verified by hand during development —
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
- Live deployments to Vercel and Netlify by the maintainer with releases before 0.3.2 (all three
  apps, both platforms — see the live demo links in `README.md`), including the `netlify.toml`
  `included_files` fixes (`package.json`, `node_modules`), found against the live sites' function
  logs (see `docs/guides/DEPLOYING.md`'s Netlify section). For 0.3.2 the generated functions were run outside
  the monorepo; a live 0.3.2 deployment is not yet verified.
- Docker (`docker build`/`run`/`compose up`), including the full login/CSRF/cookie regression
  re-run inside a running container
- `devora generate:proxy` against a real local nginx and a real local Caddy binary
- All CLI commands (`dev`/`build`/`start`/`new`/`add`/`remove`/`list`/`generate:proxy`/`deploy`),
  under npm, Yarn, and pnpm
- **`devora deploy`'s authenticated deploy**, on both Vercel and Netlify, with a release before
  0.3.2 — a real account, real `vercel link`/`netlify link`, a deploy that rendered correctly in a
  browser. Two bugs were found and fixed getting a clean run — see `docs/guides/DEPLOYING.md`'s
  `devora deploy` section. Not yet repeated with 0.3.2.

## Not verified at all

- **A live Vercel or Netlify deployment of 0.3.2.** The generated functions were run outside the
  monorepo (real content, login, CSRF, a CommonJS dependency); nothing has been deployed to either
  platform with 0.3.2 yet.
- **Container platforms** (Cloud Run, App Runner/Fargate, Azure Container Apps, Oracle Cloud). The
  Docker image was run locally only.

- **`isr` regeneration on Vercel/Netlify specifically.** Fully verified under `adapter-node`'s
  long-lived process; a serverless function's filesystem isn't guaranteed to persist across
  invocations, and that specific behavior hasn't been exercised on either platform.
- **`deploy/devora.service`** (the systemd unit template) against a real systemd host.
- **A DB client under real production load.** A real Drizzle + `better-sqlite3` client was wired
  in and verified end-to-end during development, then reverted (the framework ships no built-in
  ORM by design) — see `packages/backend/DATABASE.md` for the native-binding/Vite-SSR-reload
  hazard it surfaced and a verified fix pattern (not shipped as the default). Not verified under sustained real production load/concurrency.

## Known unsupported, not silently missing

- **A dynamic route (`[id].tsx`) without a `getStaticParams()` export can't use `ssg`/`isr`.**
  `ssr`/`csr` work with no extra step; `ssg`/`isr` need `getStaticParams()` to know which concrete
  values to pre-render and fail the build with a clear error if it's missing, rather than silently
  mis-building. `getStaticParams()` itself is verified end-to-end (real build output, real served
  static files, a real 404 for a value the route never listed).
- **`isr`'s disk cache is unverified under real serverless conditions specifically** (Vercel/
  Netlify) — see the "Not verified at all" section above; unrelated to streaming, which is a
  separate render mode with its own verification above.
