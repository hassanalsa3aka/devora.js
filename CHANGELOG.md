# Changelog

This is a monorepo of independently-versioned packages (`@devorajs/core`, `@devorajs/cli`,
`@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`, `create-devora`, plus internal-only
`@devorajs/backend`/`@devorajs/adapter-node`/`@devorajs/scaffold`), so entries below note which
package(s) a change actually shipped in rather than a single project-wide version number.

This file starts where this repo's git history starts (2026-09-07). Everything before that —
the SSR handler, sessions/CSRF, security headers, islands, render modes, the CLI, all three
adapters, Docker/VPS/CI support — landed as one large initial commit; see `ROADMAP.md` for the
detailed, per-feature account of that work instead of a fabricated day-by-day history here.

## Unreleased — hotfix round 3, phase 3 (request access, head, CSS, islands, types)

Not yet version-bumped. User-facing guide: `PAGES.md`.

- **`@devorajs/core` — request access.** `ctx.url` (a `URL`, query string included), `ctx.headers`
  (a standard `Headers`), `ctx.method`, `ctx.ip` and a body-less `ctx.request` in loaders, actions
  and API routes. Scheme/host/IP honor `trustProxy`, which now also accepts a hop count
  (`trustProxy: 2`); IPs come from the right of `X-Forwarded-For`, so a client-supplied entry
  can't spoof them. The Netlify function feeds `context.ip` through.
- **`@devorajs/core` — actions return data.** A non-redirect action result reaches the page as the
  `actionData` prop. `fail(status, data)` re-renders with a 4xx/5xx status. Loaders can return or
  throw `redirect()`.
- **`@devorajs/core`, BREAKING (status codes) — redirects after POST are 303** (were 302);
  `redirect(to, status)` picks another. Loader redirects are 302.
- **`@devorajs/core`, BREAKING (status codes) — page errors keep their status.** A thrown
  `HttpError` (or any `status`/`statusCode` 4xx/5xx) on a page is that status instead of a 500:
  401 from `requireAuth()`, 403 from `verifyCsrf()`. Unexpected errors are 500s with the message
  hidden in production. They render the app's **error page** (`apps/<name>/error.tsx`, scaffolded
  for new apps) or a built-in one. Unmatched URLs are now an HTML 404 page in dev and production;
  dev used to fall through to Vite's bare 404 without security headers.
- **`@devorajs/core` — head API.** `defineApp({ head: { lang, stylesheets, links, meta, scripts } })`
  and route-level `meta().head`.
- **`@devorajs/core`, BREAKING (markup) — framework CSS is opt-in.** The theme stylesheet
  (including its `body { display: flex }`) and the default favicon are only added to pages that
  render `PageShell`/`AppHeader` (and to CSR shells); `head.theme: false | true` overrides. Apps
  that use `PageShell` look the same; pages that don't no longer get global CSS they didn't ask for.
- **`@devorajs/cli` — route-imported CSS is linked** in SSR, streaming, SSG/ISR and error-page HTML,
  from Vite's module graph in dev and the SSR build's chunk metadata in production
  (`ssrEmitAssets`; files land in `dist/client/assets`, manifest
  `dist/server/route-css-manifest.json`). Images/fonts imported by server code are published too.
- **`@devorajs/cli` — islands are found in every module, not just route files.** The SSR build
  discovers them while it follows the app's imports (shared components, workspace packages),
  then the client build runs for exactly those, and placeholders are swapped for real URLs.
  `island()` calls are checked with the parser in dev and build; an unsupported shape
  (`island(loader)`, a computed path) or an unresolvable path fails with the original file and
  line instead of an island that silently never hydrates.
- **`@devorajs/core`, `@devorajs/cli` — multipart uploads in page actions.** File fields arrive as
  `File` objects (parsed by the platform's `Response.formData()`, no dependency). New
  `maxBodyBytes` (app.config.ts, default 10 MB) for forms and API routes. An oversized body now
  actually reaches the client as a 413 page: a declared `Content-Length` over the limit is rejected
  unread, and an overflowing stream is discarded rather than the socket being reset mid-upload.
  Malformed multipart is a 400.
- **`@devorajs/cli` — `devora build` no longer imports `ssr`/`csr`/`streaming` routes.** Each
  route's render mode is read from its source, and only `ssg`/`isr` routes (or ones whose mode
  isn't a string literal) are imported, so a module needing request-time secrets at import time no
  longer crashes builds without them.
- **Types (`@devorajs/core`, `create-devora`).**
  - `CsrfField` returns `ReactElement` (was `unknown`, TS2786).
  - The React bindings in `RenderRouteDeps`/`RenderStreamingDeps` accept React's real signatures
    (was TS2322 in every `entry-server.tsx`).
  - `ctx.session`/`setSession()` can be typed once via `declare module "@devorajs/core" { interface
    Register { session: ... } }`.
  - New projects ship `typescript` + `@types/*` devDependencies, a root `tsconfig.json`, a
    `typecheck` script, and app tsconfigs that exclude adapter output.
  - CI now typechecks fresh full-stack and backend-only scaffolds against the packed packages
    (`scripts/typecheck-fresh-scaffold.mjs`).
- **`@devorajs/adapter-vercel`, `@devorajs/adapter-netlify` — fix: backend-only apps build again.**
  Vendoring `react` resolved it from the app, which a backend-only app doesn't depend on
  (`Cannot find module 'react/package.json'`); it's now resolved from `@devorajs/core`'s install
  location in that case. The app's error page is bundled into the function. CI now also builds the
  `api-only` app.

## Unreleased — hotfix round 3, phase 2 (sessions, cookies, security config)

Not yet version-bumped; staged for the coordinated round-3 release. Every setting below is
optional and defaults to the previous behavior, except where noted.

- **`@devorajs/core` — cookie `Secure` is configurable.** `shared.sessions.cookie.secure:
  true | "auto" | false` (default `true` in production, as before; `devora dev` never sets it, as
  before). `"auto"` sets `Secure` only on HTTPS requests: a TLS socket, or `X-Forwarded-Proto:
  https` when the app has `trustProxy: true`. The production handler logs a one-time warning when
  it sends a `Secure` cookie on what looks like a plain-HTTP request — the failure mode that broke
  every production login over plain HTTP (browsers silently drop such cookies).
- **`@devorajs/core` — `trustProxy`** (app.config.ts, default false). The generated Vercel/Netlify
  functions pass `true` unless the app sets `false` — only the platform's edge can reach them. The
  Netlify shim now reports the request's real scheme (from the request URL).
- **`@devorajs/core` — per-app cookie/session settings (K1).** `shared.sessions.cookie.sameSite`
  (`"lax"` default, `"strict"`, `"none"` — `"none"` requires `secure: true`); app.config.ts
  `sessions.cookie` overrides; per-app `sessions.activeSeconds/idleSeconds` for `auth: "isolated"`
  apps; `security.noindex` (`X-Robots-Tag: noindex` on every response, plus a Vercel header route /
  Netlify `_headers` rule so statically served files carry it too). Resolved and validated once
  per app (`resolveSessionManifest`) at `devora build`/`devora dev`, written into
  `dist/server/session-manifest.json`, which is where production reads them from.
- **`@devorajs/core` — `shared.sessions.cookie.domain`** for one login across subdomains (session
  cookie only; the CSRF cookie stays host-only; the clearing cookie carries the same `Domain`).
  Must cover every `auth: "shared"` app's domain (checked); isolated apps stay host-only unless
  they set their own. Docs that claim "shared login" now state the subdomain condition.
- **`@devorajs/core` — `csrf: false`** (app.config.ts): never issue the `devora_csrf` cookie (for
  Bearer-only APIs, whose unauthenticated calls such as the login used to get one).
  `ctx.verifyCsrf()` then rejects every non-Bearer-authenticated request (403) — it never passes
  silently. Bearer-*authenticated* requests already got no CSRF cookie before this.
- **`@devorajs/core` — invalid session config is an error, not a silent no-op:** session settings
  on an `auth: "none"` app, a `cookie.domain` that doesn't cover the app, per-app lifetimes on a
  shared app, conflicting attributes on a shared domain-wide cookie, non-positive lifetimes.
- **`@devorajs/cli` — `devora start` reads `PORT` and `HOST`** (`--port`/`--host` win; new
  `--host` flag), logs values it took from the environment, rejects an invalid port, and logs when
  it changes `NODE_ENV` (`build`/`deploy` log only when overriding an explicit non-production
  value). The Dockerfile now relies on `PORT` instead of a hardcoded `--port`.
- **`@devorajs/cli` — `devora build --adapter=<unknown>` fails** with the valid values instead of
  silently building without the requested output (`--adapter=node` used to exit 0).
- **`@devorajs/adapter-netlify` — fix: several `Set-Cookie` headers in one response** (e.g. a
  cleared session cookie plus a new CSRF cookie) were comma-joined into one malformed header by the
  function's response shim.

## Unreleased — hotfix round 3, phase 1 (deployment adapters)

See `devora-hotfix-round3.md` for the evidence (real Vercel deploys of two products that failed).
Not yet version-bumped; staged for the coordinated round-3 release.

- **`@devorajs/adapter-vercel` — runtime no longer hardcoded (V1).** `.vc-config.json` used
  `nodejs20.x`, which Vercel now rejects for every new deploy. The runtime now comes from
  `vercel: { runtime }` in `app.config.ts`, else the running Node major (if Vercel supports it and
  it fits `engines.node`), else the newest supported major `engines.node` allows, else Vercel's
  default (`nodejs24.x`). An `engines.node` no supported major satisfies fails the build. The
  build prints which runtime it picked and why. `adapter-netlify` never hardcoded one (Netlify
  picks the function runtime from the site's Node version).
- **`@devorajs/adapter-vercel`, `@devorajs/adapter-netlify` — CommonJS dependencies work (V8).**
  Both esbuild passes in both adapters now prepend a `createRequire` banner. Before, any bundled
  CommonJS package calling `require("events")` (`pg`) built green and then failed every request
  with `Dynamic require of "events" is not supported`.
- **`@devorajs/core`, `@devorajs/cli`, adapters, `create-devora` — `apiDir` (V2).** `defineApp({
  apiDir: "endpoints" })` moves an app's API route folder; URLs stay under `/api`. Default stays
  `"api"`, so existing apps don't change. New apps from `create-devora` / `devora add` get
  `apiDir: "endpoints"` (and a matching `netlify.toml` `included_files` entry), because a
  top-level `api/` is Vercel's reserved functions folder. `createProdRequestHandler` takes an
  optional trailing `{ apiDir }`; `writeVercelOutput`/`writeNetlifyConfig`/`createNodeServer` pass
  it through. All additions are optional, so already-generated functions keep working.
- **`@devorajs/cli` — `devora build --out <dir>` (V3).** With `--adapter=vercel --app=<name>`,
  writes the Build Output API directory somewhere other than `apps/<name>/.vercel/output` — e.g.
  `--out=.vercel/output` when the Vercel project's Root Directory is the repo root. The adapter
  now clears an existing `.vercel/output` before writing, so files from an earlier build (or
  another app) can't ship with this one; it only ever deletes a directory literally named
  `.vercel/output`.
- **`@devorajs/cli` — preflight checks (V7).** Before building for Vercel/Netlify: runtime
  supported (error); `api/` folder at the Vercel project root (warning); `--out` not a
  `.vercel/output` directory (warning); session secret per auth mode (error when building on the
  platform, warning locally); `shared.sessions.store` unset (error) or `"memory"` (warning);
  isolated app whose `DEVORA_SESSION_SECRET_<APP>` isn't a valid env var name (warning); Netlify
  `apiDir` missing from `netlify.toml` `included_files` (warning).
- **`@devorajs/core`, `@devorajs/cli` — `prebuild` hook (V4).** `defineApp({ prebuild: [...] })`
  runs shell commands in the app directory before `devora build`/`devora deploy` builds it
  (`prisma generate`, a CSS build), with `node_modules/.bin` on `PATH`; a non-zero exit stops the
  build. Not run by `devora dev`.
- **Adapters — log line (V5).** The "verified locally in isolation, NOT deployed … see ROADMAP.md
  #4" line is gone (it read like a failure, and `ROADMAP.md` isn't in the npm package). It now says
  what was written, the runtime, and links the docs site's deployment guide.

## Unreleased — scaffolder scope (hotfix #12)

- **`@devorajs/core` 0.3.1**, **`@devorajs/cli` 0.3.1**, **`@devorajs/adapter-vercel` 0.2.1**,
  **`@devorajs/adapter-netlify` 0.2.1**, **`create-devora` 0.3.0**: version bumps for everything
  below. `devora --version` now reports the real CLI version (it was hard-coded to `0.1.0`).

- **`create-devora`**: new "What do you need?" prompt / `--scope=fullstack|frontend|backend`
  (default full-stack). Frontend-only projects get no `packages/backend`; backend-only projects get
  API-only apps (`backendOnly: true`, no React). One shared backend either way — after scaffolding,
  a one-line note points to the documented per-app backend pattern.
- **`@devorajs/core`**: `shared.backend` in `devora.config.ts` is now optional (a frontend-only
  project has none).
- **`@devorajs/cli`**: the Vercel and Netlify adapters no longer fail on a backend-only app (they
  vendored `react-dom` unconditionally); `devora add` in a project without `packages/backend` no
  longer adds a dependency on it; `devora split backend` explains when a project has no backend.

## Unreleased — pre-v3 hotfixes

- **`@devorajs/core` 0.3.0**, **`@devorajs/cli` 0.3.0**, **`@devorajs/adapter-vercel` 0.2.0**,
  **`@devorajs/adapter-netlify` 0.2.0**, **`create-devora` 0.2.0**: version bumps for everything
  below (minor bumps: the session change is breaking). `create-devora` also now pins new projects
  to `@devorajs/core`/`@devorajs/cli` `^0.3.0` — it was still pinning `^0.1.0`, which is how new
  projects ended up on a core without `defineModule`/`apiRoute` (hotfix #1).

See `devora-pre-v3-hotfixes.md` for the evidence behind each item and exactly what changed.

- **`@devorajs/core`, BREAKING — unified session auth.** Sessions are now opaque random IDs backed
  by a server-side `SessionStore` (bring your own; `"memory"` for dev/single-process), replacing
  the signed-payload cookie. One lookup serves both `Authorization: Bearer` and the HttpOnly
  cookie; `ctx.revokeSession()` kills a session on both immediately; sessions go active → idle
  (silently renewed on use) → dead; `ctx.verifyCsrf()` is skipped for Bearer-authenticated
  requests. `setSession`/`clearSession` now return promises; `requireAuth()`/`verifyCsrf()` throw a
  401/403 `HttpError`. Production refuses to start without `shared.sessions.store` in
  `devora.config.ts`. Existing signed session cookies are treated as dead (users log in once more).
  `signSession`/`verifySession` are deprecated.
- **`@devorajs/core`/`@devorajs/cli` — `api/**` always speaks JSON.** `apiRoute()` now wraps its
  handler (it was a runtime no-op), and the dispatcher catches too: any throw becomes
  `{ message }` JSON with the error's status (message hidden for unexpected errors in
  production); an unmatched `/api/**` path (including bare `/api`) is a JSON 404. Page routes are
  unchanged.
- **`@devorajs/cli` — dev experience.** `devora dev --host` (opt-in) binds all interfaces, prints
  LAN URLs plus each app's API base URL, and warns that the server is reachable on the network.
  Dev ports default to 10000 + the app's index (`devPort` overrides), falling forward past taken
  ports with a log line. Boot output now includes each app's route table.

## 2026-09-16

- **`@devorajs/core` 0.2.0**, **`@devorajs/cli` 0.2.0**, **`@devorajs/adapter-vercel` 0.1.2**,
  **`@devorajs/adapter-netlify` 0.1.3**, **`create-devora` 0.1.4**: version bumps for everything
  below, v2 feature work plus a real internal security audit and its fixes.
- **v2 backend capability**: `defineModule()` (explicit domain modules, no DI container, ever),
  generic API routes (`apiRoute()` under `apps/<name>/api/**`, same router as page routes), native
  middleware (`withMiddleware()`) plus optional `fromExpressMiddleware()`/`fromFastifyPlugin()`
  ecosystem adapters, backend-only apps (`backendOnly: true`, no client build/routes/ at all), and
  `getStaticParams()` for `ssg`/`isr` on a dynamic route.
- **v2 repo-splitting**: `devora split <app|backend> --repo=<url>` converts an app (or the shared
  backend) into a real git submodule with its full commit history preserved (`git subtree split`,
  not a flattened snapshot); `devora sync [names...] --from-main|--to-main` and `devora status`
  round out the workflow.
- **v2 streaming render mode**: `renderMode: "streaming"` — the page shell sends immediately, each
  `<Island>`'s real content patches in as its import resolves, using React's own Suspense contract
  (`renderToPipeableStream`) instead of the two-pass model every other render mode uses.
- **Security hardening pass**, found and fixed via a real internal audit (every finding
  independently reproduced, not assumed):
  - Cross-app session cookies are now cryptographically bound to their own cookie name — an
    `"isolated"` app stays isolated even if it shares a secret with the shared app, closing a real
    forged-cookie cross-app replay.
  - `devora start` now sets `NODE_ENV=production` itself (previously relied on the caller).
  - Request bodies are capped (10MB default) across every API route and form action, dev and prod.
  - Streaming connections time out (30s default) instead of holding a connection open indefinitely.
  - Path traversal closed in the repo-splitting CLI (a crafted `.gitmodules`/`devora.config.ts`
    path could run git commands, or delete a directory, outside the project root) and in the ISR
    disk cache (a tainted `getStaticParams()` value could write/delete outside its own output dir).
  - The Fastify adapter's routes were keyed by path only — registering `GET`/`POST` at the same
    path silently collapsed to whichever was registered last, answering *every* method. Now keyed
    by path and method, with a real `405` for anything undeclared.
  - API routes gained an optional `methods` export — an undeclared HTTP method now gets a `405`
    before the handler runs, closing a silent-fallthrough footgun the framework's own shipped
    example (`apps/dashboard/api/hello.ts`) demonstrated.
- **Real Netlify deploy fixes**, found against actual live deploys, not local simulation — Netlify's
  function packager only bundles what it can statically trace from the function's own imports, plus
  whatever `netlify.toml`'s `included_files` explicitly lists. Three things the adapter writes to
  the function directory hit this blind spot one at a time as each error surfaced in production:
  a `package.json` (`{"type":"module"}`, fixing `SyntaxError: Cannot use import statement outside a
  module`), and the vendored `node_modules` (fixing `Cannot find package 'react'`) — both now listed
  in every app's committed `netlify.toml` and the scaffolder template.
- **Docs**: `README.md`, `DEPLOYING.md`, `VERIFICATION.md`, and every package's own `README.md`
  updated for all of the above.

## 2026-09-09

- **CI**: fixed `.github/workflows/ci.yml`'s pnpm install step, which was failing fast on every
  run — `corepack enable` had no `packageManager` field to pin a pnpm version (removed
  deliberately for Yarn compatibility, see README.md), so it couldn't resolve one on GitHub's
  runners. Now installs pnpm directly via `pnpm/action-setup` for that leg only.
- **Docs**: added live demo links (Vercel/Netlify/docs site), npm package links, a CI status
  badge, and cross-links between README/ROADMAP/architecture-v1.md.

## 2026-09-08

- **`@devorajs/cli` 0.1.2**, **`create-devora` 0.1.2**:
  - `devora new`/`devora add` now detect whether they're running inside this monorepo or a
    standalone scaffolded project, and generate the correct deploy build command for each
    (`node packages/cli/dist/index.js build ...` vs. `./node_modules/.bin/devora build ...`).
    Previously always assumed monorepo context, which broke standalone projects.
  - `@devorajs/cli` is now a real `dependencies` entry (not `devDependencies`) at both the
    project root and each app's own `package.json` — Netlify's production installs skip
    `devDependencies` entirely, and its workspace-scoped installs only read an app's own
    `package.json`, so it needed to be declared in both places to survive either.
- **`@devorajs/core` 0.1.1**, **`@devorajs/adapter-vercel` 0.1.1**, **`@devorajs/adapter-netlify`
  0.1.1**: version bump, expanded package descriptions, added per-package READMEs.
- Renamed the npm scope from `@devora/*` to `@devorajs/*` across every package, import, and doc.
- Added the internal `@devorajs/scaffold` package — the shared scaffolding logic used by both
  `devora new`/`add` and `create-devora`, so the two don't drift apart.

## 2026-09-07

- Initial commit: the framework itself — SSR/SSG/CSR/ISR render modes, islands, per-app
  session/CSRF handling, security headers by default, SEO primitives, the `devora` CLI, and
  `@devorajs/adapter-node`/`adapter-vercel`/`adapter-netlify`. See `ROADMAP.md` for the detailed
  build history behind this commit.
- Fixed a real Vercel deploy failure: `devora build` wasn't setting `NODE_ENV=production` itself,
  which silently depended on the caller having set it — invisible locally, but Vercel's custom
  `buildCommand` path doesn't reliably set it, causing a `jsxDEV is not a function` crash.
- Fixed a real Vercel deploy failure: the generated function was missing `react`/`react-dom` at
  runtime — Vercel's Build Output API doesn't trace dependencies for a pre-built function, so the
  adapters now vendor the resolved `react`/`react-dom` package trees directly into the function.
- Fixed a real Netlify deploy failure: `netlify.toml` was only ever generated as build *output*,
  too late for the build that was supposed to produce it. It's now a static, pre-committed file
  per app.
- Added `auth: "none"` as a third `AuthMode` — an app with no login (e.g. `marketing`) can now
  opt out of the entire session/cookie/CSRF carrier instead of needing an unused session secret.
- Added `vercel.json`/`netlify.toml` per app and wrote up the Vercel/Netlify deployment steps.
