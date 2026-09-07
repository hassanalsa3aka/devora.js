# Devora.js (v1 skeleton)

Repo scaffold for Devora.js, the framework described in `architecture-v1.md` (marketing/dashboard/
admin multi-app, one shared backend by default, security-first, no built-in ORM/auth).

## What's wired up for real

- `devora.config.ts` — loaded and validated by `packages/core/src/loadProjectConfig.ts` (exposed as
  `@devora/core/config-loader`) via `jiti` (no `eval`, see `packages/core/DEPENDENCIES.md`).
- **The SSR request handler** (`renderMode: "ssr"`, still the default a route gets if it declares no
  `renderMode` at all): `devora dev` matches a request to a route file
  (`packages/core/src/router.ts`, file-based, static segments only for now — dynamic segments like
  `[id].tsx` still aren't supported), loads it and the app's `entry-server.tsx` through Vite's SSR
  module graph, runs `action` (on `POST`) then `loader`, and renders the component to a real HTML
  document (`packages/core/src/html.ts`) — see `packages/cli/src/server/ssrMiddleware.ts`. Verified
  end-to-end against `apps/dashboard/routes/settings.tsx` (GET renders, POST reaches the shared
  backend function and its intentional "no DB client" stub error) and
  `apps/admin/routes/bulk-import.tsx`. *This bullet describes the original, `"ssr"`-only slice —
  `"ssg"`/`"csr"`/`"isr"` are real too now (only `"streaming"` still 404s, deferred to v2); see
  "Also now real" below and `ROADMAP.md` #12.*
- `devora dev` / `devora build` — actually spin up / build real Vite dev servers per app,
  reading `apps/<name>/vite.config.ts`.
- `devora new <name>` — scaffolds a new `apps/<name>` and registers it in `devora.config.ts`. Asks
  per-app whether this app needs auth/sessions (`--auth shared|isolated|none`, prompted
  interactively if omitted and a real TTY, defaults to `shared` non-interactively) — see the
  sessions entry below.
- `devora generate:proxy --target=nginx|caddy` — reads app domains straight out of
  `devora.config.ts` and writes a working reverse-proxy config. This is the piece that was a
  manual "copy this nginx example" step before — now it's generated.
- **Request context / sessions** (§3's shared-vs-isolated auth, now enforced) — **and opt-in per
  app**: `AuthMode` is `"shared" | "isolated" | "none"` (`packages/core/src/config.ts`). `ctx
  .setSession()` signs an HMAC cookie (`packages/core/src/session.ts`, Node's built-in `crypto`, no
  new dependency); `ctx.requireAuth()` throws without a valid session and rejects a tampered
  cookie. Shared apps get one project-wide cookie; an `auth: "isolated"` app (e.g. `admin`) gets
  its own cookie name and can be given its own secret via `DEVORA_SESSION_SECRET_<APP>`. An app
  with **no login at all** (e.g. `apps/marketing`) sets `auth: "none"` — it never reads, and never
  requires, any `DEVORA_SESSION_SECRET*` variable (no dev warning, no production throw), and its
  `ctx.setSession()`/`clearSession()`/`requireAuth()`/`verifyCsrf()` all throw a clear, explicit
  error explaining sessions are disabled for this app, instead of silently no-op'ing — a route in a
  `"none"` app that calls one of these is caught at build time too (`devora build`/`devora dev`
  scan route source for the call and fail immediately, before the request that would have thrown —
  see `packages/cli/src/build/checkNoAuthUsage.ts`). This exists because forcing every app to
  configure a session secret it never uses was the wrong default — a marketing site with no login
  shouldn't have a deploy-time dependency on session config. Verified end-to-end in both states:
  `POST /settings` fails `requireAuth()` with no session, `POST /login` (demo route, `apps/
  dashboard/routes/login.tsx`) sets one, `POST /settings` with that cookie then passes
  `requireAuth()`; separately, `apps/marketing` builds/runs/deploys to all three targets (adapter-
  node, `--adapter=vercel`, `--adapter=netlify`) with zero session env vars set anywhere and no
  warning printed — see `ROADMAP.md` #2. Checking *who* the caller is stays bring-your-own (§6/§11)
  — the demo login route trusts any submitted username on purpose, to isolate what the framework
  actually provides (the carrier) from what it deliberately doesn't (credential verification).
- **CSP/HSTS/X-Frame-Options** (§7 "security is a default, not opt-in"): every response from
  `devora dev` carries these headers, even for an app with no `security` block in
  `app.config.ts` at all (`app.config.ts` is now actually loaded — it wasn't before). Per-app
  overrides (`security.csp`/`frameOptions`/`hsts`) work — verified by temporarily overriding
  `frameOptions` on `apps/admin` and confirming the header changed only there. Defaults:
  `default-src 'self'` (blocks injected/inline/eval'd scripts) with `style-src 'self'
  'unsafe-inline'` (a deliberate tradeoff so React's `style={{...}}` prop doesn't silently break),
  `X-Frame-Options: DENY`, 2-year HSTS. See `packages/core/src/securityHeaders.ts` and
  `ROADMAP.md` #5, including a known dev-mode-only gap (Vite's own 404 fallback overwrites these
  headers with its own — doesn't affect matched routes, and disappears once real prod serving
  exists per #4).
- **SEO primitives** (§8): `meta()` now renders OG tags too — `og:title`/`og:description` fall back
  to `title`/`description` automatically, no route changes needed to get them (see
  `apps/dashboard/routes/login.tsx` for an explicit-override example). `/sitemap.xml` is served per
  app, generated from that app's real route tree via the same file-scanning `router.ts` uses for
  routing, so it can't drift out of sync — but only for an app that opts in with `sitemap: true` in
  `app.config.ts` (`AppRuntimeConfig.sitemap`, default off). Opt-in, not opt-out, on purpose: a
  newly scaffolded internal app stays unlisted with zero extra config. Only `apps/marketing` (the
  actually-public app) has it on; `apps/dashboard`/`apps/admin` don't. Verified: marketing's
  `/sitemap.xml` returns real content, dashboard's and admin's both 404. See
  `packages/core/src/sitemap.ts` and `ROADMAP.md` #7.
- `packages/backend/functions/settings.ts` — the shared backend example from the doc, called
  directly from `apps/dashboard/routes/settings.tsx`.
- `apps/admin/routes/bulk-import.tsx` — the per-app override case (function lives only in admin).
- **Islands / partial hydration** (§5, dev AND production): `island(() => import("./X"))` +
  `<Island>` do real work — SSR renders the island's actual content (not a placeholder), and a
  client script hydrates it independently. In dev, resolves to a `/@fs/<path>` URL
  (`packages/cli/src/islandsPlugin.ts`); in a real production build, a real hashed client asset URL
  from an actual client build (`packages/cli/src/build/buildAppClient.ts` +
  `islandsBuildPlugin.ts`, orchestrated by `buildAppServer.ts`) — an app with zero islands pays
  nothing extra for this. See `apps/dashboard/routes/index.tsx`'s counter demo,
  `packages/core/src/islandComponent.tsx` (the two-pass-render mechanism). Verified end-to-end in
  both modes: the resolved URL and hydration bootstrap script are both genuinely fetchable in dev,
  and in production, `data-island-url`/the script `src` are real hashed asset paths that were
  independently fetched and confirmed to serve real, minified production JS. Along the way, found
  and fixed a real bug — a shared regex used to discover `island()` calls didn't handle a TS
  generic type argument (`island<Props>(...)`, the exact syntax the demo uses), silently finding
  zero islands until traced; the three separate copies of that regex are now one shared constant in
  `packages/core/src/islandCallPattern.ts`.
- **A real SSR production build + `adapter-node`, fully verified**: `devora build` now does a
  real `vite build --ssr` (every route + `entry-server.tsx` as named entries —
  `packages/cli/src/build/buildAppServer.ts`); `devora start` boots `adapter-node`, a real
  `http.Server` serving that build via `packages/core/src/prodRequestHandler.ts`. Checked point by
  point against dev-mode behavior, not just "it started": SSR content, security headers, sessions
  (including that an error is logged server-side but not leaked to the client — correct prod
  behavior), the shared-backend DB-stub error, and sitemap.xml. (At the time this bullet was
  written, marketing's `ssg` route still 404'd the same way in prod as in dev — `ssg` is real now,
  see "Also now real" below and `ROADMAP.md` #12.) See `ROADMAP.md` #4.
- **`adapter-vercel` / `adapter-netlify` — the generated function actually runs outside this repo,
  verified, not just structurally plausible**: both copy the app's actual build output — server
  *and* client, including island assets — into their platform's function/static format, generate a
  function calling the same `createProdRequestHandler` adapter-node uses, then run it through a real
  `esbuild` bundling pass (`bundleForDeploy`, a genuine new dependency of both adapter packages) so
  `@devora/core` resolves without the surrounding monorepo. Verified in the strictest way available
  without an actual platform: copied the real generated function to a directory completely outside
  this repo (no ancestor `node_modules` at all) and ran it there — home page renders with real
  content, login sets a real cookie, an authenticated write reaches the same DB-stub error as
  everywhere else, an unauthenticated one is correctly blocked, and the island's real markup +
  hydration script both appear. `react`/`react-dom` were placed in a local `node_modules` by hand to
  simulate what a platform's own dependency tracer does automatically for ordinary npm packages —
  that simulation, and an actual deploy to Vercel/Netlify infrastructure, are the one thing this
  environment genuinely cannot verify (no platform access). Three real bugs (an esbuild+Node ESM
  interop failure, a related CJS default-export interop gap, and a silent two-React-Context-instances
  bug from bundling without code-splitting) were found and fixed getting here — see `ROADMAP.md` #4
  for the full account, including what was tried and ruled out.
- **SSR bundle size, fixed with a real, measured 98% reduction** — not the fix originally guessed.
  This document previously theorized the ~255KB-per-app SSR bundle bloat was a duplicated copy of
  React from `@devora/core` not being externalized; directly inspecting the bundle's actual
  `import` statements showed React was fine the whole time. The real cause: `packages/core`'s single
  barrel export mixed CLI-only config-loading code (which needs `jiti`) into the same entry point
  SSR routes import from, so every SSR build pulled in the entire `jiti` loader even though nothing
  at runtime ever calls it. Fixed by splitting it into `@devora/core/config-loader` (see
  `packages/core/src/configLoader.ts`); `apps/marketing`'s `entry-server.js` went from 259.79KB to
  5.23KB, measured before and after on the real build path, not assumed. `packages/core` also picked
  up a real, working, verified build step (`pnpm --filter @devora/core build`, confirmed importable
  by plain Node without `tsx`) as a separate, smaller improvement — kept available but not wired into
  the build pipeline, since it wasn't what fixed the bloat. See `ROADMAP.md` #4 for the full
  investigation, including what was tried and ruled out along the way.

## Also now real (four more v1 gaps, each verified end-to-end in dev AND a real production server)

- **The `devora` CLI bin runs directly** — `pnpm exec devora dev/build/start` all work now, zero
  `tsx` in the invocation. Two compounding bugs: pnpm never linked the bin (no workspace package
  depended on `@devora/cli` — fixed via a root `devDependency`), and the bin's own `.js`-suffixed
  imports over `.ts` sources fail under plain Node. Fixing just those two wasn't enough — `@devora/
  core` and every adapter package also export raw `.ts`, so the bin needs everything workspace-local
  bundled in. `packages/cli/build.mjs` does this with `esbuild` (same technique the Vercel/Netlify
  adapters' `bundleForDeploy.ts` already uses), keeping `commander`/`vite`/`esbuild`/`jiti` external.
- **`clientOnly()` is verified, not just typed** — `apps/dashboard/components/BrowserOnlyWidget.tsx`
  touches `window` at module scope; a real negative control (temporarily removing the `clientOnly()`
  wrapper) confirmed the dev server genuinely crashes with `window is not defined` without it.
- **Login UI, logout, CSRF, and a `Secure` cookie fix** — `apps/{dashboard,admin}/routes/login.tsx`
  now redirect on success (a real gap: there was previously no way for an `action` to signal a
  redirect at all — `packages/core/src/actionResult.ts` is new); `logout.tsx` is new in both apps,
  POST-only. `ctx.verifyCsrf()` (`packages/core/src/csrf.ts`) is a new ad hoc per-action check, same
  shape as `requireAuth()` — no new middleware layer. Session/CSRF cookies now get `Secure` in
  production (a real, previously-missing attribute), conditional on `NODE_ENV` so dev still works
  over plain HTTP. **Real bug closed**: `apps/admin` (`auth: "isolated"`) had no login route at all,
  so its one route's `ctx.requireAuth()` could never pass — `apps/admin/routes/login.tsx` fixes this,
  verified end-to-end.
- **`ssg`/`csr`/`isr` render modes work** (`"streaming"` deferred to v2 — see `ROADMAP.md`).
  `ssg`/`isr` pre-render at build time (`packages/cli/src/build/buildAppStatic.ts` →
  `dist/static/<route>/index.html`); `isr` regenerates synchronously once its `revalidate: { seconds
  }` window passes. `csr` never runs `loader` and ships a minimal shell + a generic `csr-client.tsx`
  bootstrap. Dev renders `ssg`/`isr` live per request on purpose (same reasoning as `/sitemap.xml`).
  **Real, previously undiscovered bug found and fixed**: Rollup's default `preserveEntrySignatures`
  was silently dropping a dynamically-`import()`-ed entry chunk's `default` export whenever nothing
  in the same build's static graph referenced it — true of every island *and* csr route chunk.
  Confirmed by `import()`-ing a real built chunk and finding `{ default: undefined }` — meaning
  **production island hydration's earlier verification was incomplete** (it checked the URL/
  content-type, never the actual export). Fixed with `preserveEntrySignatures: "strict"`, re-verified.

## Brand assets, shared page design, and new CLI commands

**`assets/icons/`** (repo root) holds the real Devora.js logo files: `devorajs-logo-withoutbg.png`
(transparent square mark, used as the header icon and favicon), `devorajs-logo-blackbg.png`/
`devorajs-textlogo-*.png`/`devorajs.png` (full lockups on a dark background, for anything outside
the app itself — a landing page hero, social preview image, etc.). These live **once**, at the repo
root, not copied per app — every app's `vite.config.ts` sets `publicDir` to point there directly
(`path.resolve(__dirname, "../../assets")`), so `/icons/<file>.png` resolves the same way in dev
(Vite's own public-dir serving) and in a real production build (`prodRequestHandler.ts`'s generic
static-file fallback, extended from only `/assets/*` hashed JS to any public file — logo, favicon,
`robots.txt`, etc. — a real gap found and fixed while wiring this up: an app with zero islands/csr
routes never ran a Vite client build at all before, so its `publicDir` never got copied to
`dist/client`, and its logo 404'd in production).

**Every page now shares one real design**, not per-app ad hoc HTML — `packages/core/src/theme.ts`
(a single `<style>` block embedded in every document via `html.ts`, dark by default using the
logo's own blue-to-purple gradient as the accent, with an automatic light variant via
`prefers-color-scheme` and zero client JS/toggle button needed) and `packages/core/src/branding.tsx`
(`<AppHeader>`/`<PageShell>` — the real logo + "devora.js" wordmark + an app-name badge). Every
route across all three apps uses `<PageShell>` instead of a bare `<main>`. A route that's also built
for the browser (`renderMode: "csr"`) must import these from **`@devora/core/client`**, not the
main `@devora/core` entry — a real bug found wiring this up: the main barrel's `export *` reaches
server-only code (`node:crypto` in `csrf.ts`, `node:fs`/`node:http` in `prodRequestHandler.ts`/
`router.ts`), which breaks outright when Vite tries to bundle it for a browser target.
`apps/dashboard/routes/csr-demo.tsx` hit this directly
(`"randomBytes" is not exported by "__vite-browser-external"`) before the dedicated client-safe
subpath fixed it.

**New CLI commands:**
- `devora add <name>` — scaffolds a new app and registers it in `devora.config.ts`, same as `new`
  (kept working, unchanged) under a friendlier name. The scaffolder itself was regenerated to match
  the framework's current shape while this was being touched — it had gone stale (still generating
  the old, since-deduplicated per-app `entry-server.tsx`, no `csr-client.tsx`, no `publicDir`
  wiring) and, more seriously, **never wrote a `package.json` at all** — a scaffolded app had no
  declared dependencies and wasn't a valid workspace member. Verified end-to-end: `devora add blog
  --domain=blog.example.com` → `pnpm install` → `devora dev --app=blog` → real header/logo/content
  → `devora build --app=blog && devora start --app=blog` → same, in production. Also asks (or
  takes `--auth`) whether the new app needs sessions, per-app — `--auth none` skips generating
  `login.tsx`/`logout.tsx`/the protected demo route entirely and writes `auth: "none"` into its
  `devora.config.ts` entry, so a scaffolded marketing-style app never gets a fake login button.
- `devora list` (alias `ls`) — prints every app registered in `devora.config.ts` (name, dir, domain,
  effective auth mode) — there was previously no way to see this without opening the config file.
- `devora remove <name>` (alias `rm`) — undoes `new`/`add`: deletes `apps/<name>` and its
  `devora.config.ts` entry. Previously had to be done by hand. Verified end-to-end: `devora add
  removetest` → `devora remove removetest` → `devora.config.ts` back to byte-identical with before
  `add` ran, `apps/removetest` gone; a `remove` on a name that's neither on disk nor in the config
  exits `1` with a clear message rather than silently succeeding. A comment placed directly above an
  entry in the config (e.g. `apps/admin`'s "isolated" note) is deliberately left alone when that
  entry is removed — safely detecting "this comment belongs only to the next entry" from plain text
  isn't reliable enough to automate; a stray comment left behind is the accepted tradeoff.

**A real design bug found by actually opening the app in a browser** (a real Playwright screenshot,
not just curling class names): `apps/admin` had no route matching `/` at all — its files were only
`login.tsx`/`bulk-import.tsx`/`logout.tsx` — so the first thing anyone naturally tries (the app's own
root URL) hit an unmatched-route 404 that bypasses the shared header/theme entirely, landing on
Vite's raw dev 404 page (a bare 404 in production). That's what "no design" actually was. Fixed with
a real `apps/admin/routes/index.tsx`. While there, `<AppHeader>`/`<PageShell>` gained an optional
`nav` prop (each app defines its own link set explicitly in a new `apps/*/nav.ts`, not guessed
inside the shared component) and the theme got a real visual pass — card-style forms with labels,
input focus rings, button hover/active states, a sticky header, a footer, `.devora-card` for
non-form content — re-verified with Playwright screenshots in both light and dark. Also silenced a
harmless but noisy Vite dev warning about `prodRequestHandler.ts`'s runtime-computed `import()` path
(required for production's pre-built-file loading; Vite's static analyzer just can't trace it) with
the `/* @vite-ignore */` comment Vite's own warning message suggests.

## Multi-app-aware Vercel/Netlify deploy orchestration

The last unbuilt item from architecture-v1.md §13's N:N risk. `devora build --adapter=vercel|
netlify` already looped over every app and wrote each one's build output, but that produced N
completely independent, uncoordinated directories — nothing tracked which platform project/site
each app belonged to, and nothing ever actually deployed anything. Confirmed before designing
anything: both platforms require one project (Vercel)/site (Netlify) per app — inherent to the
platforms, not something their build-output specs can bypass — and neither CLI has a native
"deploy N projects from one repo" primitive.

**Decision: don't invent devora-specific project/site config.** Relies on each platform's own
linking convention instead — a real user runs `vercel link`/`netlify link` once per app directory
(standard monorepo practice already), writing `.vercel/project.json`/`.netlify/state.json` there.
New `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]` rebuilds each app fresh, checks
whether it's linked, and if so shells out to the real platform CLI via `npx` (no global install
needed, matching the `devora` bin's own story) — `vercel deploy --prebuilt`/`netlify deploy
--dir=dist/client`, both with `[--prod]`. An unlinked app is skipped with a clear instruction, not
silently ignored; one app's failure doesn't abort the rest; a final summary reports
deployed/skipped/failed per app.

**Verified for real, the same discipline the original adapter work established:** confirmed
`devora deploy --adapter=vercel --app=dashboard` with no link file builds, prints the instruction,
and exits 1 **without invoking `vercel` at all**; confirmed a project-wide run with nothing linked
reports a clean 3-skipped/0-failed summary and exits 0. Then, with a fake `.vercel/project.json`
written in, confirmed the command genuinely invokes the real Vercel CLI (downloaded and ran Vercel
CLI 59.11.7) — which correctly failed with `Error: No existing credentials found`, a real platform
auth error, not a devora crash. Same test repeated for Netlify with a fake `.netlify/state.json` →
real Netlify CLI invoked, failed with its own real `NETLIFY_AUTH_TOKEN is not set` error. Both
`npx vercel --version`/`npx netlify-cli --version` were independently confirmed invocable without
any account before any of this was designed around them. Full regression pass after: `devora
build`/`--adapter=vercel`/`--adapter=netlify` (with and without `--app`) produce identical output to
before (the per-app build step was extracted into a new shared `packages/cli/src/build/
buildForAdapter.ts`, used by both `build.ts` and `deploy.ts` — a pure refactor); `devora dev`/`devora
start` unaffected. **What can't be verified here**: an actual authenticated deploy succeeding (needs
a real account/token — same irreducible boundary as the underlying build output itself). Domain
auto-binding (`vercel domains add` using the domain already in `devora.config.ts`) was deliberately
not built — a real external side effect on the user's account untestable without one; a natural,
separately-scoped follow-up, not silently dropped.

## Deploying to Vercel or Netlify

Verified end-to-end against real, live deployments — all three apps (`marketing`, `dashboard`,
`admin`) confirmed working in production on both platforms, not just built locally. This section
is the step-by-step, including the real gotchas that only showed up once actual deploys were
attempted (see `ROADMAP.md` #4 for the full bug-by-bug account).

**The model: one platform project (Vercel) / site (Netlify) per app, not one for the whole repo.**
This is inherent to how both platforms work (architecture-v1.md §13's N:N shape), not something
devora invents — a multi-app project means multiple platform projects, each rooted at its own
`apps/<name>` directory.

### Vercel

1. In the Vercel dashboard: **Add New → Project**, import this repo, and set **Root Directory** to
   `apps/<name>` (e.g. `apps/marketing`). Repeat as a separate project for each app you want to
   deploy.
2. Nothing else needs configuring in the dashboard — `apps/<name>/vercel.json` is already committed
   and handles the rest: `"framework": null` stops Vercel's zero-config Vite detection (which
   otherwise runs a plain `vite build` and fails with `Could not resolve entry module "index.html"`,
   since this isn't a conventional Vite SPA), and `"buildCommand"` points at `devora build --adapter=
   vercel` for that specific app.
3. **Environment variables** (Project Settings → Environment Variables, scoped to **Production**):
   only needed if that app's `auth` mode (in `devora.config.ts`) is `"shared"` or `"isolated"` — an
   app with `auth: "none"` (e.g. `marketing`) needs none of this at all.
   - `auth: "shared"` → set `DEVORA_SESSION_SECRET` (generate with `openssl rand -base64 32`).
   - `auth: "isolated"` (e.g. `admin`) → set `DEVORA_SESSION_SECRET_<APPNAME>` (uppercase app name,
     e.g. `DEVORA_SESSION_SECRET_ADMIN`).
   - Adding or changing an env var does **not** apply to an already-built deployment — redeploy
     after saving it (Deployments → latest → **Redeploy**), or it'll still throw.
4. Deploy. If you hit a 500 with `Cannot find package 'react'` in the function logs: that's already
   fixed as of this repo's current state (the adapter vendors `react`/`react-dom`'s real package
   files into the function directly — see `ROADMAP.md` #4) — make sure you're on a commit that
   includes it, and that `packages/cli/dist/index.js` is the current committed build (see "Install &
   try it" above for why that file is committed at all).

### Netlify

1. In the Netlify dashboard: **Add new project → Import an existing project**, pick this repo, and
   set **Base directory** to `apps/<name>`. Repeat per app, same as Vercel.
2. `apps/<name>/netlify.toml` is already committed and sets the build command, publish directory
   (`dist/client`), the SSR redirect, and Netlify Functions directory — but **Netlify's dashboard
   Build settings take precedence over `netlify.toml` when both are set**, unlike Vercel. If the
   site was created by pointing Netlify at a `vite.config.ts` it auto-detected (common on first
   import), it likely already has its own `Build command`/`Publish directory` saved, which will
   silently override the committed file and fail with the same `Could not resolve entry module
   "index.html"` error. Fix it once, per site: **Site configuration → Build & deploy → Build
   settings → Edit settings**, and either clear the **Build command** and **Publish directory**
   fields entirely (so Netlify falls through to reading `netlify.toml`), or set them explicitly to
   match it:
   - Build command: `cd ../.. && node packages/cli/dist/index.js build --app=<name> --adapter=netlify`
   - Publish directory: `dist/client`
3. **Environment variables** (Site configuration → Environment variables) — identical rules to
   Vercel above: only needed for `"shared"`/`"isolated"` auth apps, same variable names, same
   redeploy-after-adding requirement.
4. Deploy — use **Trigger deploy → Clear cache and deploy site** the first time after changing
   dashboard Build settings, to rule out a stale cached config from an earlier failed attempt.

### Both platforms

- Regenerating an app's `vercel.json`/`netlify.toml` is only needed if you change its name or
  deploy topology — `devora new`/`devora add` scaffold both automatically for a new app.
- Neither file is touched by `devora build` itself (they're static, committed config — the exact
  thing that was wrong before: `netlify.toml` used to only exist as build *output*, which is too
  late for the build that's supposed to produce it — see `ROADMAP.md` #4).
- `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]` is a separate, optional
  convenience for pushing from the CLI via each platform's own `vercel link`/`netlify link`
  mechanism instead of git-integration deploys — see "Multi-app-aware Vercel/Netlify deploy
  orchestration" above. Not required for either of the flows above, which both deploy on every git
  push once configured.

## Running in Docker

Verified end-to-end against real `docker build`/`docker run`/`docker compose` — one app per
container, real login/CSRF/tampered-cookie regression re-run inside a running container (not just
built), and all three apps confirmed running concurrently with no port collisions via `docker
compose up`. `adapter-node` — not the Vercel/Netlify adapters — is what actually runs here: a real
`pnpm install` inside the image resolves `react`/`react-dom` normally, so none of the vendoring
`adapter-vercel`/`adapter-netlify` need (see `ROADMAP.md` #4) is necessary here at all.

```bash
# One app per image — APP_NAME is required, no default.
docker build --build-arg APP_NAME=marketing -t devora-marketing .
docker run -p 4173:4173 devora-marketing
# auth: "shared"/"isolated" apps need their secret passed in, same variables
# as everywhere else (.env.example documents each one):
docker run -p 4173:4173 -e DEVORA_SESSION_SECRET=... devora-dashboard

# All three together, on the same host ports a real bare-VPS nginx/Caddy
# config would target (see "Self-hosting on a VPS" below):
cp .env.example .env   # fill in the two session-secret vars
docker compose up --build
```

`Dockerfile` is deliberately "fat but correct" — a full monorepo `pnpm install` in both stages, one
base image (`node:20-slim`, no alpine swap — see `ROADMAP.md` #6's already-documented native-addon
risk) for build and runtime alike, not a hand-pruned dependency list. `.dockerignore` excludes
`node_modules`/`dist` from the build context except `packages/cli/dist/index.js`, which is committed
to git on purpose (same reason `.gitignore` carries the identical exception) and is what the image's
build stage actually runs. One real gotcha found building this for real, not assumed: the base
image's `corepack enable` with no pin grabs whatever pnpm is *latest* at build time — a real build
against pnpm 12 failed with `ERR_PNPM_IGNORED_BUILDS` (a newer default-deny on install scripts like
esbuild's, that pnpm 9.9.0 — what this project has actually been developed and verified against
everywhere else — doesn't have). Fixed with `corepack prepare pnpm@9.9.0 --activate` **inside the
Dockerfile only** — not via root `package.json`'s `"packageManager"` field, which was deliberately
removed project-wide for Yarn/corepack compatibility (see "Cross-package-manager notes" above) and
stays that way.

## Self-hosting on a VPS (adapter-node + nginx/Caddy)

`devora generate:proxy --target=nginx|caddy` (§10) reads every app's domain straight out of
`devora.config.ts` and writes a working reverse-proxy config — verified for real, not just by
inspecting the output: installed the generated config into a real local nginx and a real local
Caddy binary, ran `devora start` for all three apps, and confirmed nginx correctly routes each
domain (via `Host` header, no real DNS needed for local verification) to distinct, correct
per-app content; `caddy validate` confirms the generated Caddyfile is valid and correctly plans
automatic HTTPS + HTTP→HTTPS redirect once pointed at a real, DNS-resolving domain.

```bash
devora build --app=marketing && devora build --app=dashboard && devora build --app=admin
devora start                              # all three, sequential ports (see below)
devora generate:proxy --target=nginx      # or --target=caddy
# install the generated nginx.conf/Caddyfile the normal way for your distro/
# package manager, then reload nginx/caddy.
```

**A real, previously unnoticed bug fixed getting this to actually work end-to-end**: `devora
generate:proxy` and `devora start` used to compute each app's port completely independently —
`4000` in one, `4173` in the other — so following this exact documented workflow produced a proxy
config pointing at ports nothing was actually listening on. Both commands now share one function
(`packages/cli/src/build/portScheme.ts`), so they can't drift apart again; verified by generating a
config and confirming its ports match `devora start`'s real bound ports exactly, not just
eyeballing both outputs separately.

nginx's generated config is plain HTTP only (`listen 80`) — there's no way to issue a real TLS
certificate without a real, DNS-resolving domain, so nothing here fakes that. The documented next
step on a real VPS is `certbot --nginx -d <domain>`, which rewrites the block in place to add
HTTPS. Caddy needs no such step — automatic HTTPS via ACME is Caddy's default behavior for any
domain it can prove ownership of.

For keeping `devora start` running/restarting on a real VPS: `deploy/devora.service` is a systemd
unit template (`Restart=on-failure`, loads secrets from an `EnvironmentFile=`), with a `pm2`
one-liner alternative in its own comments — not something verifiable without a real systemd host,
so treat it as a starting point to adapt, not a drop-in guarantee.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on every push/PR: installs under **all three** package managers
(pnpm/npm/yarn, matching the cross-manager verification above) to catch the exact class of "works
under pnpm, breaks under npm" bug this project has hit before, then — using the pnpm leg — runs a
real `devora build` for every app, **and** `--adapter=vercel`, **and** `--adapter=netlify`. That
last part is the actual point: every individual command in this workflow was re-run locally against
this repo's current state before being placed in the YAML, and this exact build sequence is what
would have caught all three real deploy bugs from this session (`ROADMAP.md` #4: the missing
`react`/`react-dom` in the Vercel function, `devora build` silently depending on the caller's
`NODE_ENV`, and `netlify.toml` only ever existing as build output) before any of them ever reached a
live deployment, rather than after. What this can't verify from here: an actual GitHub Actions run
needs a real push — no `gh` CLI/runner access in this environment, the same boundary as an
authenticated Vercel/Netlify deploy elsewhere in this document.

## What's still a stub, deliberately

- **`"streaming"` render mode**: deferred to v2, not silently dropped — the island two-pass render
  (`IslandCollectorContext`) assumes a synchronous second `renderToString` pass, incompatible with
  `renderToPipeableStream`/`renderToReadableStream`. Needs a Suspense-boundary-based rewrite.
- **DB client**: `packages/backend/db/index.ts` throws on use — bring your own ORM per §6/§11. A
  real Drizzle+`better-sqlite3` client was wired in and verified end-to-end (login → real DB write
  → confirmed via direct sqlite inspection, including upsert), then reverted — see `ROADMAP.md` #6
  for a genuine issue it surfaced: a native-addon crash when Vite's SSR module graph reloaded
  `db/index.ts`'s module-scope connection. Worth reading before picking a real driver.
- **`isr` on Vercel/Netlify**: the disk cache buildAppStatic.ts/isrCache.ts use is fully verified
  only under `adapter-node`'s long-lived process — a serverless function's filesystem isn't
  guaranteed to persist or be shared across invocations, so `isr` there is structurally weaker
  (the initial build's static output is still copied in and served correctly; ongoing regeneration
  on that platform is the unverified part).

## Install & try it

This repo installs and runs with **npm, Yarn, or pnpm** — verified with fresh installs under all
three, not just assumed from the config. Every workspace cross-dependency uses a plain `"*"` version
(not the `workspace:` protocol, which only pnpm understands), and the root `package.json` declares a
standard `"workspaces"` array so npm/Yarn recognize the layout.

**pnpm is recommended** — it's what this project has been developed and most thoroughly exercised
against, and its strict, non-hoisted `node_modules` is what caught every undeclared/phantom
dependency during development (see "Cross-package-manager notes" below). npm and Yarn are fully
supported and verified, not second-class — pick whichever your team already uses.

```bash
# pnpm (recommended) — the devora bin now works directly, no tsx needed
pnpm install
pnpm exec devora dev --app=dashboard
pnpm exec devora build --app=dashboard
pnpm exec devora start --app=dashboard   # serve a build (adapter-node)

# npm / Yarn — same bin, same flags
npm exec devora dev --app=dashboard
yarn devora dev --app=dashboard

# root dev/build scripts still work too (unchanged, still tsx-based)
pnpm run dev -- --app=dashboard
pnpm run build -- --app=dashboard
```

**One invocation works identically across all three now — no manager-specific form to remember.**
`pnpm run dev -- --app=admin` used to start every app instead of just one: pnpm (unlike npm/Yarn)
forwards a literal `"--"` through to the underlying script instead of stripping it, so `commander`
saw `--app=admin` as a positional argument and ignored it. Fixed at the source rather than
documented as something to work around: `packages/cli/src/index.ts` now strips any literal `"--"`
token from `process.argv` before `commander` ever parses it — this CLI has no legitimate use for
`--` as an end-of-options marker, so it's safe to remove unconditionally. Verified explicitly across
all three managers, both with and without the separator, and confirmed the plain no-flags case
(starts every app) still works correctly too.

### Cross-package-manager notes

- **pnpm needs one piece of config that npm/Yarn don't** — the root `.npmrc` sets
  `link-workspace-packages=true`. Without it, pnpm treats a plain `"*"` on `@devora/core` (etc.) as
  "fetch this from the real npm registry" rather than "link the local workspace package," and fails
  outright with `ERR_PNPM_FETCH_404` (confirmed by actually running `pnpm install` without this
  setting, not assumed). npm and Yarn don't need this — their workspace resolution prefers a
  matching local workspace package regardless of the version specifier. npm doesn't understand this
  setting either, but only warns rather than failing: `npm warn Unknown project config
  "link-workspace-packages". This will stop working in the next major version of npm` — harmless
  today, but a real npm-version-specific line item worth knowing about if npm keeps its word.
- **No `packageManager` field, on purpose.** It was removed rather than kept as a soft pin: modern
  Node's `yarn` command is a corepack shim by default, and corepack enforces the `packageManager`
  field strictly — confirmed by testing directly, `yarn --version` was flatly refused with "This
  project is configured to use pnpm" while the field was present. Keeping it would have silently
  defeated the entire point of this section. npm was unaffected (it isn't corepack-routed on a
  standard Node install), but there was no reason to leave a working Yarn setup dependent on that.
- **No undeclared/phantom dependencies found** — audited every package's actual imports against its
  own `package.json` (not just eyeballed): everything resolves to either a Node builtin or something
  that package genuinely declares. This matters more than it might sound: npm/Yarn's flat, hoisted
  `node_modules` would silently *tolerate* a package using a dependency it never declared itself (as
  long as some sibling package happened to declare it, hoisting would expose it anyway) — pnpm's
  strict, non-hoisted linking would not, and throws immediately if it happens. Since this codebase
  was built and tested almost entirely under pnpm, that strictness already forced every dependency to
  be declared where it's actually used — npm/Yarn's looser hoisting doesn't introduce new risk here,
  it just happens to be more forgiving of a mistake pnpm wouldn't have allowed to ship in the first
  place.
- Each manager resolved slightly different transitive versions of shared deps like `esbuild`
  (`0.28.2` under npm's root `tsx`, `0.21.5` under the adapters' pinned range) — expected, harmless,
  not a bug; each package's own declared range was satisfied either way.

The `devora` bin (`packages/cli/dist/index.js`, built by `pnpm --filter @devora/cli build` — a real
`esbuild` bundle, wired to run automatically on install via a `prepare` script) runs directly under
all three package managers — re-verified specifically for this bin mechanism (a separate check from
the multi-manager pass above, which predates the bin working at all): fresh `npm install`/`yarn
install`/`pnpm install`, each confirming `prepare` actually produced `dist/index.js`, then
`{npm exec,yarn,pnpm exec} devora list/dev/build/start`, each hitting a real running server (dev and
prod) and a real registered-app listing — not just `--help`. Cleaned back up to pnpm afterward, same
as the earlier pass. The root `dev`/`build` scripts still invoke the CLI via `tsx` too (unchanged,
both paths work) — that's not a workaround for anything anymore, just an equally-valid second way to
invoke the same commands.

`devora generate:proxy --target=nginx` works standalone right now — try it from the repo root.

## Suggested next slice

See `ROADMAP.md` for the full, ordered list — every item now has real work behind it. What's left:
1. An actual Vercel/Netlify deployment — genuinely blocked on real platform access this environment
   doesn't have. Local testing closed the dependency-resolution gap as far as it can be closed
   without a real platform; whether their actual dependency tracers behave the way that testing
   simulated them is the one thing left unverified. `isr`'s disk-cache regeneration is the other
   thing specific to those platforms that can't be verified without real access (see above).
2. `"streaming"` render mode — deferred to v2, needs a Suspense-boundary-based island rewrite
   (see above and `ROADMAP.md`).
