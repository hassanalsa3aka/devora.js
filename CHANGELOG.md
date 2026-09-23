# Changelog

This is a monorepo of independently-versioned packages (`@devorajs/core`, `@devorajs/cli`,
`@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`, `create-devora`, plus internal-only
`@devorajs/backend`/`@devorajs/adapter-node`/`@devorajs/scaffold`), so entries below note which
package(s) a change actually shipped in rather than a single project-wide version number.

This file starts where this repo's git history starts (2026-09-07). Everything before that —
the SSR handler, sessions/CSRF, security headers, islands, render modes, the CLI, all three
adapters, Docker/VPS/CI support — landed as one large initial commit; see `ROADMAP.md` for the
detailed, per-feature account of that work instead of a fabricated day-by-day history here.

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
