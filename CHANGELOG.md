# Changelog

This is a monorepo of independently-versioned packages (`@devorajs/core`, `@devorajs/cli`,
`@devorajs/adapter-node`, `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`, `create-devora`,
plus internal-only `@devorajs/backend`/`@devorajs/scaffold`), so entries below note which
package(s) a change actually shipped in rather than a single project-wide version number.

This file starts where this repo's git history starts (2026-09-07). Everything before that —
the SSR handler, sessions/CSRF, security headers, islands, render modes, the CLI, all three
adapters, Docker/VPS/CI support — landed as one large initial commit; see `docs/history/BUILD-LOG.md` for the
detailed, per-feature account of that work instead of a fabricated day-by-day history here.

## Unreleased

### `@devorajs/core` and `@devorajs/cli`

- A missing session store or (in production) a missing `DEVORA_SESSION_SECRET` now stops
  `devora start` with one clear line and exit status 1, instead of a stack trace. It still refuses
  to start. The error is a new exported `DevoraConfigError`.
- The header's brand link now has the accessible name "devora.js home" (it was "Home", which did not
  contain the visible text and failed the WCAG label-in-name check).
- Performance: `ctx.url` and `ctx.headers` are built the first time a handler reads them, not on every
  request. No behavior change: the same objects, built later. About 3 to 5% more requests/s on API
  routes that never read them (interleaved A/B, same machine; see `benchmarks/results/`).
- Performance: the production handler no longer joins paths, computes build keys or builds a URL object for
  the request path on every request: build keys, module lookups and pre-rendered page paths are remembered,
  and a plain request path is read straight from the request line (anything unusual still goes through the
  URL parser, and a test compares both on thousands of generated paths). Interleaved A/B on one machine:
  about +8 to 17% on API routes, about +39% on a pre-rendered page, about +5% on a server-rendered page.

## 0.3.4 — 2026-10-16

0.3.3 was prepared but never published; 0.3.4 is its first release.

### Behavior changes

Nothing here needs a code change in a typical app; each line says what to check.

- **A file named `[...name].tsx` / `[[...name]].tsx` is now a catch-all route.** Before, such a
  file was treated as a single `[param]` whose name started with dots. If you have one, rename it
  or expect it to match more URLs. (`ctx.params` types are unchanged: every value is a `string`.)
- **A URL path containing a dot no longer ends at the static-file lookup.** If no public file
  exists at that path, it goes on to route matching (needed for `/docs/v1.2/intro`). Nothing to do.
- **`getStaticParams()` values are percent-encoded in the output path** (`resolveStaticRoutePath()`):
  a value with a space or non-ASCII characters is written under its encoded path, which is what
  `url.pathname` holds. Nothing to do unless you read `dist/static` by hand.
- **`sitemap.xml` now lists the URLs of dynamic routes** that export `getStaticParams()`. Nothing
  to do; check the file if you post-process it.
- **`devora start` answers any method other than GET/HEAD to a public file, a built asset or a
  pre-rendered (`ssg`) page with `405` and `Allow: GET, HEAD`.** It used to return the file. A form
  that posts to a pre-rendered page never worked (no action runs there); post to an `ssr` route.
- **Pre-rendered pages are sent with `Cache-Control: public, max-age=0, must-revalidate` and an
  `ETag`** (a repeat visit gets a 304). Pages and public/built files are held in memory (up to
  64 MB in total, 2 MB per file; anything larger is streamed from disk) and checked against the
  disk at most once a second, so a rebuild shows up within a second without a restart. Nothing to do.
- **With `sitemap` off, a hand-written `public/sitemap.xml` is now served** (it used to 404 in
  production).

### `@devorajs/core` 0.3.4

- Catch-all routes: `[...slug]` and `[[...slug]]`, for pages and API routes (see `docs/guides/PAGES.md`).
  `ctx.params.slug` is the segments joined with `/` (still a `string`); `ctx.catchAll.slug` /
  `req.catchAll.slug` is the `string[]`. `getStaticParams()` returns `{ slug: string[] }` entries.
- `collectSitemapPaths()`; the sitemap includes `getStaticParams()` URLs of dynamic routes.

- Static serving in `devora start` / the adapters: a memoized route table (the routes folder is no
  longer read on every request), memoized module imports, in-memory pre-rendered pages and files
  with strong ETags, `If-None-Match` → 304, `HEAD`, `Content-Length`, brotli/gzip for text types
  (made once per file, kept only while the 64 MB allowance has room), and correct content types for `.xml`, `.webmanifest`, `.woff`, `.woff2`,
  `.ttf`, `.otf`, `.gif`, `.avif`, `.pdf`, `.wasm` and more. Measured on the benchmark's
  tiny pre-rendered page, one machine: about 14,700 → 71,000–82,000 requests/s in two full runs
  (see `benchmarks/results`; Astro, SvelteKit and React Router measured about 36,000–38,000 on the
  same page).

### `@devorajs/adapter-netlify` 0.2.4

- The generated function returns a body-less `Response` for 204/304 (a `Response` with a body and
  a 304 status throws).

### `@devorajs/cli` 0.3.4

- Dev server: same catch-all matching and dotted-URL handling; sitemap includes dynamic routes.

### `create-devora` 0.3.2

- New projects pin `@devorajs/core` and `@devorajs/cli` to `^0.3.4`.

### Not changed

`@devorajs/adapter-node` 0.2.1 and `@devorajs/adapter-vercel` 0.2.3 have no source changes (their
`@devorajs/core` range `^0.3.2` already allows 0.3.4).

### Also in this release

- `docs/guides/REALTIME.md` and `examples/realtime/`: a documented pattern for live updates (polling, or a
  separate Socket.IO server with a 60-second HMAC token), including the `security.csp`
  `connect-src` setting.
- `scripts/preparePublish.mjs` and `scripts/publish-package.mjs` refuse to publish a package whose
  `dist/` is missing or empty, whose `exports` point at missing files, or whose pack list lacks the
  built entry.

## 0.3.2 — 2026-10-12

Released together: `@devorajs/core` 0.3.2, `@devorajs/cli` 0.3.2, `@devorajs/adapter-vercel`
0.2.3, `@devorajs/adapter-netlify` 0.2.3, `create-devora` 0.3.1, and the first published
`@devorajs/adapter-node` (0.2.1).

> **Republished adapters.** `@devorajs/adapter-node` 0.2.0, `@devorajs/adapter-vercel` 0.2.2 and
> `@devorajs/adapter-netlify` 0.2.2 were published without their build output (each tarball held
> only `package.json`, the README and the license, so importing them failed). They're deprecated
> on npm and replaced by adapter-node 0.2.1 and adapter-vercel/adapter-netlify 0.2.3 (2026-10-13),
> which contain the same code with `dist/` included. Nothing else changed. `devora` itself bundles
> the adapters, so `devora build`/`start`/`deploy` were not affected; only importing an adapter
> package directly was. Upgrade core and cli together:
API routes run on the CLI's bundled copy of core and pages on the app's installed one, so mixing
0.3.1 and 0.3.2 gives a project two different behaviors. The adapters now require
`@devorajs/core` `^0.3.2`. Most fixes come from reviews of two real products built on 0.3.1 and
their failed Vercel deploys.

### Behavior changes

What each change means, and what an existing app has to do.

- **Redirects after a POST are 303 See Other** (were 302); loader redirects stay 302. Browsers
  behave the same. Tests or clients that assert 302 after a form post: update them, or pass the
  status explicitly with `redirect(to, 302)`.
- **Page errors keep their status.** A thrown `HttpError` (or anything with a 4xx/5xx `status`/
  `statusCode`) is that status instead of a 500: `requireAuth()` is 401, `verifyCsrf()` is 403.
  Unexpected errors are still 500, with the message hidden in production, and render the app's
  `apps/<name>/error.tsx` or a built-in error page. Unmatched URLs are an HTML 404 in dev too.
  To do: anything that treated every page failure as a 500 should check the status. Add an
  `error.tsx` if you want your own error page.
- **The framework stylesheet and favicon are only added to pages that render `PageShell` or
  `AppHeader`** (and CSR shells). To do: a page that relied on the theme without using the shell
  needs `head: { theme: true }` in app.config.ts (or on the route's `meta().head`).
- **`PageShell` markup:** content is wrapped in `<div class="devora-shell">`, and the theme no
  longer sets `body { display: flex }`. To do: custom CSS that depended on `body` being the flex
  container, or on `main` being a direct child of `#root`, needs adjusting. Props are unchanged.
- **A backend-only app answers `GET /`** with 200: a small HTML status page for browsers, JSON
  (`{ app, status: "ok", api: "/api" }`) for API clients. It used to be a 404. To do: monitors that
  expected 404 there, or used `/` as "is it up", can keep using `/api/health`.
- **Request bodies are limited to 10 MB by default** (`maxBodyBytes`, forms and API routes);
  larger ones get a 413. Malformed multipart is a 400. To do: apps that accept larger uploads set
  `maxBodyBytes` in app.config.ts.
- **`.env` files in the project root are loaded** by `dev`, `build`, `start` and `deploy`
  (`.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`; variables already in the environment
  win). To do: check the project root for stale `.env` files, and drop `node --env-file` wrappers.
- **`devora start` reads `PORT` and `HOST`** (`--port`/`--host` still win). To do: a `PORT` left
  in the environment now moves the server; unset it or pass `--port`.
- **`devora build --adapter=<anything else>` fails** instead of building without the requested
  output. To do: scripts using `--adapter=node` drop the flag (`devora build`, then `devora start`).
- **The Vercel runtime is no longer `nodejs20.x`,** which Vercel now rejects. It comes from
  `vercel: { runtime }` in app.config.ts, else the running Node major, else `engines.node`, else
  `nodejs24.x`. An `engines.node` no supported major satisfies fails the build. To do: nothing,
  unless you need a specific runtime.
- **`adapter-vercel` empties `.vercel/output` before writing it,** so files from an earlier build
  can't ship. To do: don't keep anything of your own in that directory.
- **The generated Vercel and Netlify functions trust the platform's proxy headers**
  (`trustProxy: true` unless the app sets `false`), so `ctx.ip`, `ctx.url` and the `"auto"`
  cookie `Secure` decision use the real client address and scheme. To do: nothing, unless the
  function can be reached without going through the platform's edge.
- **`devora build` only imports `ssg`/`isr` routes** (and routes whose render mode isn't a string
  literal). To do: nothing, unless a build relied on a request-time route running at build time.
- **Unsupported `island()` calls fail the build and dev server** with the file and line
  (`island(loader)`, a computed path, a path that doesn't resolve). They used to produce an island
  that never hydrated. To do: fix the reported call.
- **Session config that used to be ignored is an error:** session settings on an `auth: "none"`
  app, a `cookie.domain` that doesn't cover the app, per-app lifetimes on a shared app, and similar
  (listed under core below). To do: fix or remove the setting the error names.
- **`devora dev`'s boot output has a new layout:** every app's URLs first, then routes per app,
  with more than 10 API routes per app counted instead of listed. To do: anything that parsed the
  old output should use `--routes` and match the new lines.

### `@devorajs/core` 0.3.2

- **Request access:** `ctx.url` (a `URL`, query string included), `ctx.headers` (`Headers`),
  `ctx.method`, `ctx.ip` and a body-less `ctx.request` in loaders, actions and API routes.
  `trustProxy` (default false) also accepts a hop count; IPs are read from the right of
  `X-Forwarded-For`, so a client can't spoof them.
- **Actions return data:** a non-redirect result reaches the page as `actionData`;
  `fail(status, data)` re-renders with a 4xx/5xx status; loaders can return or throw `redirect()`.
- **Error pages** with the right status (see Behavior changes), using the shell.
- **Head API:** `defineApp({ head: { lang, stylesheets, links, meta, scripts, theme } })` and
  route-level `meta().head`.
- **Multipart uploads in page actions:** file fields arrive as `File` objects (no dependency);
  `maxBodyBytes`. An oversized body is answered with a 413 the client actually receives (a
  declared `Content-Length` over the limit is rejected unread; an overflowing stream is drained,
  not reset).
- **Cookie and session settings:** `shared.sessions.cookie.secure: true | "auto" | false` (default
  `true` in production, as before), with a one-time warning when a `Secure` cookie goes out over
  what looks like plain HTTP; `cookie.sameSite`; `cookie.domain` for one login across subdomains
  (must cover every shared app; the CSRF cookie stays host-only); per-app `sessions.cookie`
  overrides and, for isolated apps, `activeSeconds`/`idleSeconds`; `security.noindex`
  (`X-Robots-Tag: noindex`); `csrf: false` for Bearer-only APIs (no CSRF cookie;
  `ctx.verifyCsrf()` then rejects every request not authenticated by Bearer). Settings are
  validated once per app and written to `dist/server/session-manifest.json`.
- **`cors` for API routes** (`origins`, `credentials`, `methods`, `allowHeaders`, `exposeHeaders`,
  `maxAge`): answers preflights, echoes allowed origins (exact or `https://*.example.com`), off by
  default; invalid origins and `credentials` with `"*"` are config errors.
- **`apiDir`** (`defineApp({ apiDir: "endpoints" })`) moves the API route folder; URLs stay under
  `/api`; the default stays `"api"`.
- **`prebuild`** (`defineApp({ prebuild: [...] })`): commands run in the app directory before
  `devora build`/`deploy`, with `node_modules/.bin` on `PATH`; a non-zero exit stops the build.
- **Shell redesign** (theme.ts, branding.tsx), still dependency-free and CSP-safe: the footer stays
  at the bottom of short pages (the `<div id="root">` wrapper had kept `main` out of the flex
  column; measured gap went from 452–478 px to 0 at 375/768/1440 px); tokens for type, spacing,
  radii, borders, shadows and focus rings in both themes; a centred 760 px reading column; a sticky
  header whose nav wraps on narrow screens; styled cards, `.devora-grid`, code blocks and labelled
  form fields; visible focus rings; logo images with intrinsic sizes (CLS 0); button text contrast
  raised from 3.7–4.0:1 to 5.2–5.7:1 and every text token at 5.5:1 or more. New optional
  `footerLinks` prop.
- **Types:** `CsrfField` returns `ReactElement` (was `unknown`, TS2786); the React bindings in
  `RenderRouteDeps`/`RenderStreamingDeps` accept React's real signatures (TS2322 in every
  `entry-server.tsx`); `ctx.session`/`setSession()` can be typed once through
  `declare module "@devorajs/core" { interface Register { session: ... } }`.
- **React 19:** peer range `^18.3.0 || ^19.0.0`, after a fresh scaffold on React 19.3.0 passed
  typecheck, the browser suite in dev and production, and both platform functions.
- Error messages link the docs instead of `ROADMAP.md`, which isn't in the package.
- `engines: { node: ">=20" }`.

### `@devorajs/cli` 0.3.2

- **Terminal output:** `dev`, `build` and `start` open with a 5-line `d›` mark in the logo's
  gradient (truecolor, 256-color and 16-color fallbacks), the CLI version and, for `dev`,
  `ready in N ms`; `build` ends with `✓ built N apps in N s`. `NO_COLOR`, `FORCE_COLOR` (which wins,
  as in Node), piped output and CI get plain text; under 43 columns the header is one line.
- **`devora dev` routes:** all pages per app; API routes listed up to 10 per app and counted above
  that; `--routes` or `DEVORA_ROUTES=all` lists them all.
- **`--quiet`** on `dev`, `build` and `start`: no header, route tables or progress lines, Vite at
  `warn`; warnings, errors and app URLs still print.
- **Route-imported CSS is linked** in SSR, streaming, SSG/ISR and error-page HTML (dev: Vite's
  module graph; production: the SSR build's chunk metadata, `dist/server/route-css-manifest.json`,
  files in `dist/client/assets`). Images and fonts imported by server code are published too.
- **Islands are found in every module the app imports,** not just route files (shared components,
  workspace packages), and `island()` calls are checked with the parser.
- **`devora build --out <dir>`** with `--adapter=vercel --app=<name>`, for a Vercel project whose
  Root Directory is the repo root.
- **Preflight checks** before a Vercel/Netlify build: supported runtime; `api/` at the Vercel
  project root; `--out` not a `.vercel/output` directory; session secret per auth mode;
  `shared.sessions.store` unset or `"memory"`; an isolated app's secret variable name; Netlify
  `apiDir` missing from `included_files`.
- **`devora add --kind=pages|api`;** in a project whose apps are all backend-only, the default is
  an API app (it used to generate a pages app). New apps use `apiDir: "endpoints"`.
- **Dev server:** ignores `dist/`, `.vercel/`, `.netlify/` and `netlify/functions/` (an adapter
  build during dev reloaded open pages once per written file); pre-bundles the framework's client
  dependencies so the first page load doesn't trigger a re-optimization; no "Could not
  auto-determine entry point" warning for backend-only apps; pre-bundling also works when a
  project pins esbuild 0.28 under Vite 5.
- **`.env` loading**, **`PORT`/`HOST`** for `devora start` (new `--host`), `--adapter`
  validation, and a log line whenever `NODE_ENV` is changed (see Behavior changes).
- **Vite 6:** `vite` `^5.4.0 || ^6.0.0`, after a scaffold on Vite 6.4.4 passed the browser suite in
  dev and production and both platform functions. Vite 7 is untested.
- `engines: { node: ">=20" }`. `devora --version` reports 0.3.2.

### `@devorajs/adapter-node` 0.2.1 (first published version; 0.2.0 had no build output)

- **Published on npm** for self-hosted setups that want their own entry point instead of
  `devora start` (which bundles it and is unchanged). The one export is `createNodeServer()`;
  the README has a usage example. Built to `dist/` with types; requires `@devorajs/core` `^0.3.2`.
- Reads `PORT`/`HOST` through `devora start`, takes `apiDir`, `trustProxy`, `head`,
  `maxBodyBytes` and `cors`, and logs a clear line when the port is taken or the host can't be
  bound.
- Smoke test (`scripts/smoke-adapter-node.mjs`, run in CI): installs the packed tarball in an
  empty folder and imports it with plain Node.

### `@devorajs/adapter-vercel` 0.2.3 (0.2.2 had no build output)

- Runtime chosen instead of hardcoded `nodejs20.x` (see Behavior changes); the build prints which
  one and why.
- **CommonJS dependencies work:** both esbuild passes prepend a `createRequire` banner. Before, a
  bundled CommonJS package calling `require("events")` (`pg`) built green and failed every request
  with `Dynamic require of "events" is not supported`.
- `apiDir`, `--out` and a cleared `.vercel/output`; `noindex` as a header route so static files
  carry it; `trustProxy` on by default in the function.
- Backend-only apps build again (`react` is resolved from `@devorajs/core`'s install location when
  the app doesn't depend on it); the app's error page is bundled into the function.
- The old "NOT deployed … see ROADMAP.md #4" log line is replaced by what was written, the runtime
  and a link to the deployment guide.
- Requires `@devorajs/core` `^0.3.2`; `engines: { node: ">=20" }`.

### `@devorajs/adapter-netlify` 0.2.3 (0.2.2 had no build output)

- **CommonJS dependencies work** (the same `createRequire` banner).
- **Fix: several `Set-Cookie` headers in one response** were comma-joined into one malformed
  header by the function's response shim.
- The function passes the request's real scheme and `context.ip`; `trustProxy` on by default;
  `noindex` through `_headers`; `apiDir`; backend-only apps build again; the error page is
  bundled; the new log line.
- Requires `@devorajs/core` `^0.3.2`; `engines: { node: ">=20" }`.

### `create-devora` 0.3.1

- New projects depend on `@devorajs/core` and `@devorajs/cli` `^0.3.2`. The ranges now come from
  those packages' own versions at build time; 0.3.0 still wrote `^0.3.0`.
- Prints the mark and its version first and a numbered "Next steps" block (`cd`, install when it
  was skipped, `dev`) last.
- New apps get `apiDir: "endpoints"`, an `error.tsx`, a redesigned landing page and login form,
  `typescript` and `@types/*` devDependencies, a root `tsconfig.json` and a `typecheck` script.
  CI typechecks fresh full-stack and backend-only scaffolds against the packed packages.

## 0.3.1 — 2026-09-24 (scaffolder scope, hotfix #12)

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

## 0.3.0 — 2026-09-23 (pre-v3 hotfixes)

- **`@devorajs/core` 0.3.0**, **`@devorajs/cli` 0.3.0**, **`@devorajs/adapter-vercel` 0.2.0**,
  **`@devorajs/adapter-netlify` 0.2.0**, **`create-devora` 0.2.0**: version bumps for everything
  below (minor bumps: the session change is breaking). `create-devora` also now pins new projects
  to `@devorajs/core`/`@devorajs/cli` `^0.3.0` — it was still pinning `^0.1.0`, which is how new
  projects ended up on a core without `defineModule`/`apiRoute` (hotfix #1).

See `docs/history/devora-pre-v3-hotfixes.md` for the evidence behind each item and exactly what changed.

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
- **Docs**: `README.md`, `docs/guides/DEPLOYING.md`, `docs/history/VERIFICATION.md`, and every package's own `README.md`
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
  `@devorajs/adapter-node`/`adapter-vercel`/`adapter-netlify`. See `docs/history/BUILD-LOG.md` for the detailed
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

## Earlier releases, reconstructed from git history

Dates and package versions below were not recorded in this changelog when they happened. They are
rebuilt from git commits and npm publish times, and every entry is marked "reconstructed from git
history". Nothing here comes from memory. Where git cannot say something, the last section says so.

### 2026-09-15 (reconstructed from git history)

- Fixes from the Phase 4 security audit (commit b8bdc09): rejected island imports no longer poison the cache; unresolved Suspense boundaries time out instead of hanging a connection; backpressure handling for streamed responses; the CSP nonce also applies to `script-src-elem`; session cookie signatures include the cookie name; request body size limits; proxy-generation domain input validation. (The 2026-09-16 entry above summarises these fixes.)
- API routes enforce a method allowlist so an undeclared method no longer falls through silently (commit 36e9e53).

### 2026-09-14 (reconstructed from git history)

- `devora split`, `devora sync`, `devora status` for managing apps as git submodules (a440532); history-preserving `git subtree split` and clearer errors (e374ef5).
- `renderStreaming`, `hydrateCsr`/`hydrateIslands` client helpers and tests, in the same commit as the repo-splitting commands.

### 2026-09-13 (reconstructed from git history)

- "Phase 0" of v2: `architecture-v2.md`, version bumps for adapters and CLI, scaffold changes (a68843a).
- Generic API route handling and middleware (21cee6d); backend-only app mode (2b55352).
- `getStaticParams()` for dynamic `ssg`/`isr` routes, `resolveStaticRoutePath()`, and a module dispose hook in dev (45f7974); AUTH/DATABASE/DRIZZLE/PRISMA guides under `packages/backend/`.

### 2026-09-12 (reconstructed from git history)

- README description spacing fix (e9cb6a2). No code change.

### Package notes (reconstructed from git history and npm publish times)

- `@devorajs/core` 0.1.2 (published 2026-09-09 12:42 UTC): npm version for the 2026-09-09 entry (dynamic routes, `devora deploy` fixes, `NODE_ENV`).
- `@devorajs/core` 0.2.1 (2026-09-16 08:35 UTC): footer structure in the branding component and theme styles (ebee286).
- `@devorajs/core` 0.2.2 (2026-09-16 09:26 UTC): footer style changes and a package `exports` restructure so the published package resolves `dist` through `publishConfig` (d1a593c, 92f88ea).
- `@devorajs/core` 0.2.3: appears in package.json (08e1e81: heading/list styles, exports) but is not on npm; the next published core is 0.3.0.
- `@devorajs/adapter-vercel` 0.1.3 and 0.1.4 and `@devorajs/adapter-netlify` 0.1.4 to 0.1.6 (2026-09-16, published 10:07-10:37 UTC): version bumps while the `scripts/publish-package.mjs` publishing script was being made correct (af54997, 08e1e81, be55165, 5c2d781).

Not recoverable from git: the reason for the 0.2.1/0.2.2 publish order beyond the commit messages; which exact commit each publish was taken from (publish times only bracket commits).
