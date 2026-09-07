# Project brief for Claude Code

Read `architecture-v1.md` first (full spec — vision, security defaults, rendering model, CLI,
deployment adapters, explicit v1 boundaries). This file is the fast-start summary + current state.

## What this is

**Devora.js** — a Vite-based, security-first web framework whose headline feature is **native
multi-app support**: one project can declare multiple apps (marketing site, product app, admin
panel) that share a core and a backend, but build/deploy independently. Not another Next.js — the
explicit design reaction to Next.js's implicit caching and undocumented build format (see doc §2,
§5, §13).

## Locked decisions (do not re-litigate without asking)

- **One shared backend by default.** `packages/backend` is the single source of truth all apps call
  into. Per-function override exists (see `apps/admin/routes/bulk-import.tsx`) but is the exception.
- **Shared auth by default**, per-app `auth: "isolated"` override (admin panel uses this). Auth
  itself is opt-in per app: `auth: "none"` (marketing site uses this) disables sessions entirely
  for that app — no session secret required, `ctx.setSession()`/etc. throw a clear error if called.
- **React**, not Solid/Qwik — keeps the door open to React Native in v3.
- **No built-in ORM/auth/file storage in v1** — bring your own. Don't add one.
- **No RSC-style server/client serialization protocol in v1** — too large, too security-sensitive.
- **Security is a default, not opt-in**: no `eval`/dynamic `Function()` anywhere in framework
  internals, ever — including in tooling you might be tempted to add (e.g. a plugin loader).
- Any new dependency added to `packages/core` needs a one-line entry in
  `packages/core/DEPENDENCIES.md` justifying it.

## Current repo state

Scaffolded and structurally real:
- `devora.config.ts` + `packages/core` config loader (uses `jiti`, not `eval`)
- `devora` CLI: `dev`, `build`, `start`, `deploy` (multi-app Vercel/Netlify orchestration), `new`,
  `add` (alias for `new`), `remove`/`rm` (undoes `new`/`add`), `list`/`ls`,
  `generate:proxy --target=nginx|caddy` — the proxy generator actually reads app domains from
  `devora.config.ts` and writes a working config. The bin itself now runs directly
  (`pnpm exec devora ...`, no `tsx` needed) — see "Also now real" below.
- `packages/backend/functions/settings.ts` — shared backend example, called from
  `apps/dashboard/routes/settings.tsx`
- Three apps (`marketing`, `dashboard`, `admin`) with `app.config.ts`, `vite.config.ts`, real routes

**Now real:**
- The SSR request handler — `renderMode: "ssr"` routes get a real HTTP response (route matched,
  `action` then `loader` run, component rendered to HTML). Verified end-to-end against
  `apps/dashboard/routes/settings.tsx` and `apps/admin/routes/bulk-import.tsx`. See `ROADMAP.md`
  #1 for what it does and doesn't cover.
- Request context / sessions — `ctx.setSession()`/`ctx.requireAuth()`/`ctx.session` are backed by a
  real signed cookie (`packages/core/src/session.ts`, HMAC via Node's built-in `crypto`, no new
  dependency). This is where "shared auth by default, per-app isolated override" (the locked
  decision above) stops being config-shape and starts being enforced: shared apps get one
  project-wide cookie, `apps/admin` (`auth: "isolated"`) gets its own cookie name and can be given
  its own secret. Verified end-to-end, including that a tampered cookie is rejected. Checking who
  the caller *is* stays bring-your-own (§6/§11) — see `ROADMAP.md` #2.
- CSP/HSTS/X-Frame-Options — every response carries these by default (§7 "security is a default,
  not opt-in"), even when an app declares no `security` block; `app.config.ts` is now actually
  loaded (it wasn't before) so per-app overrides work. Verified end-to-end including a per-app
  override. One documented dev-mode-only gap: Vite's own 404 fallback overwrites these headers on
  truly unmatched routes — doesn't affect real routes, resolves itself once #4 (adapters) exists.
  See `ROADMAP.md` #5.
- SEO primitives — `meta()` renders OG tags (falling back to title/description automatically); a
  real `sitemap.xml` is served per app, generated from the same file-based route scan routing
  itself uses, so it can't drift out of sync — gated behind `sitemap: true` in `app.config.ts`
  (opt-in, default off: a newly scaffolded internal app stays unlisted with no extra config, only
  a public app has to remember to turn it on). Only `apps/marketing` has it on. Verified end-to-end
  per app, including the opt-in gate itself. See `ROADMAP.md` #7.
- DB client — checked, not changed. A real Drizzle+`better-sqlite3` client was wired into
  `packages/backend/db/index.ts` and verified end-to-end (real writes, real upsert, `requireAuth()`
  still gating correctly), then reverted — the stub still throws intentionally (§6/§11: bring your
  own, don't add one). The check surfaced a real issue worth knowing before picking a driver: a
  native-addon crash when Vite's SSR module graph reloaded the module holding the connection. See
  `ROADMAP.md` #6 for the full writeup and a recommendation.
- Islands / partial hydration, dev AND production — `island()` + `<Island>` do real work in both:
  SSR renders the real content, a client script hydrates it independently, using a real hashed
  asset URL from a real client build in production (not just dev). Verified end-to-end in both
  modes. Along the way: a macOS case-insensitive-filesystem file collision (`island.ts` vs. the
  original `Island.tsx`, renamed to `islandComponent.tsx`); a shared regex for finding `island()`
  calls that didn't handle a TS generic argument, silently finding zero islands until traced
  (fixed by consolidating three separate copies into one, `islandCallPattern.ts`); a Vercel routing
  bug where every request, including island asset requests, hit the function instead of static
  file serving. Added `react` as a real `packages/core` dependency for this (justified in
  `DEPENDENCIES.md`, per the locked-decision process above — not a workaround of it). See
  `ROADMAP.md` #3 and #4.
- A real SSR production build (`devora build`) and `adapter-node` (`devora start`) — fully
  verified point-by-point against dev-mode behavior: SSR content, security headers, sessions
  (including that errors are logged server-side but not leaked to the client, correct prod
  behavior), the shared-backend DB-stub error, sitemap.xml, island hydration. `adapter-vercel`/
  `adapter-netlify` package the same real build output (server *and* client) and generate a
  function calling the same production handler, then run it through a real `esbuild` bundling pass
  (`bundleForDeploy`, a genuine new dependency of both adapter packages) so the function is actually
  executable outside this monorepo — verified by copying the real generated function to a directory
  completely outside this repo (no ancestor `node_modules`) and running it there: real content,
  login, an authenticated write reaching the same DB-stub error, an unauthenticated one correctly
  blocked, island markup and hydration script both present. `react`/`react-dom` were placed in a
  local `node_modules` by hand to simulate what a platform's own dependency tracer does for ordinary
  npm packages — that simulation, and an actual deploy, are what's still unverified (no platform
  access here) — stated explicitly in `ROADMAP.md` #4. Several real bugs were found and fixed along
  the way: neither generated function originally caught errors from the handler (crashed instead of
  returning a 500); Vercel's routing sent every request to the function including static asset
  requests, which the bundle didn't have (fixed by restoring `{ "handle": "filesystem" }` and
  copying client assets); bundling react-dom inline hit a real esbuild+Node ESM interop failure,
  fixing that a different way then hit a CJS default-export interop gap, and bundling each route
  file separately (no code-splitting) gave each its own copy of `@devora/core`, silently breaking
  island hydration via two non-identical React Context objects — see `ROADMAP.md` #4 for the full
  account of each.
- SSR bundle size — fixed with a measured 98% reduction, correcting this document's own earlier
  wrong theory. Previously blamed on "no build step for `packages/core`" causing a duplicated React
  copy; inspecting the actual bundle showed React was already correctly externalized, and the real
  cause was `packages/core`'s single barrel export pulling the CLI-only `jiti`-dependent config
  loaders into every SSR build, even though SSR code never calls them. Fixed by splitting them into
  `@devora/core/config-loader` (`packages/core/src/configLoader.ts`); measured before/after on the
  real build path: `apps/marketing`'s `entry-server.js` 259.79KB → 5.23KB. Full regression pass
  confirmed nothing else broke. `packages/core` also picked up a real, verified build step
  (`pnpm --filter @devora/core build`, confirmed plain-Node-importable without `tsx`) as a smaller,
  separate improvement — kept available, not wired into the build pipeline, since it wasn't what
  fixed the bloat. Two real latent type errors were found and fixed getting `tsc` to run cleanly
  (this package had never actually been type-checked with real `@types/node`/`@types/react`
  installed before). See `ROADMAP.md` #4 for the full investigation.
- Multi-package-manager support — verified with fresh installs under npm, Yarn (classic, via
  corepack), and pnpm, not just declared. Every `workspace:*` version string became a plain `"*"`,
  and root `package.json` gained a `"workspaces"` array for npm/Yarn. One real, pnpm-specific
  breakage found doing this: without `link-workspace-packages=true` in a new root `.npmrc`, plain
  `"*"` makes pnpm try to fetch `@devora/core` from the real npm registry instead of linking it
  locally, failing with `ERR_PNPM_FETCH_404` — confirmed by actually running the install without
  that setting first (npm doesn't understand this setting either, but only warns, not fails — worth
  knowing if a future npm major makes that a hard error). The `"packageManager": "pnpm@9.9.0"` pin
  was removed entirely (not kept as a soft default) after confirming directly that a standard Node
  install's `yarn` command is a corepack shim that *enforces* this field and refuses to run when it
  doesn't match — keeping it would have silently defeated the whole point of adding multi-manager
  support. A full phantom-dependency audit (every package's real imports checked against its own
  declared dependencies, not eyeballed) found none — see `README.md`'s "Cross-package-manager notes"
  for why that's not surprising given this codebase's pnpm-strict development history.
- The `pnpm`-specific `--` separator quirk (below, previously worked around per-manager) is now
  fixed at the source instead: `packages/cli/src/index.ts` strips any literal `"--"` token from
  `process.argv` before `commander` parses it — this CLI has no positional arguments for any
  command, so `--` has no legitimate use here. Verified explicitly across all three managers, with
  and without the separator, plus the plain no-flags case (starts every app) to confirm the argv
  filtering doesn't break the normal path. One shared invocation now, not three slightly different
  ones.

**Also now real (four v1 gaps closed in one pass, each verified end-to-end in dev AND a real
`devora build && devora start` production server, not just built):**
- **The `devora` CLI bin actually runs** — `pnpm exec devora dev/build/start` all work with zero
  `tsx` anywhere in the invocation. Two compounding bugs, not one: pnpm never linked the bin at all
  (no workspace package declared `@devora/cli` as a dependency — fixed by adding it to root
  `devDependencies`), and even a linked bin would fail under plain Node because `src/index.ts`'s
  relative imports use `.js` specifiers over `.ts` sources. A third, undocumented issue found while
  fixing this: `@devora/core` and every `@devora/adapter-*` package's `exports` also point at raw
  `.ts` — so even a correctly-compiled bin would immediately fail again the moment it imports them.
  Fixed by bundling the whole CLI with `esbuild` (`packages/cli/build.mjs`, reusing the exact
  technique `adapter-vercel`/`adapter-netlify`'s `bundleForDeploy.ts` already uses), keeping real npm
  packages (`commander`, `vite`, `esbuild`, `jiti`) external and inlining every workspace package.
- **`clientOnly()` verified for real** — a new `apps/dashboard/components/BrowserOnlyWidget.tsx`
  touches `window` at *module scope*, proving (via a real negative control: removing the
  `clientOnly()` wrapper and confirming the dev server genuinely crashes with `window is not
  defined`) that the primitive actually prevents the crash, not just plausibly should. Renders
  nothing server-side by design (§9's actual promise is "no crash," not "SSR content") — that's
  final v1 behavior, not a gap.
- **Login UI, logout, CSRF, `Secure` cookie** — `renderRoute()` can now return a real redirect (new
  `actionResult.ts`), closing a real prerequisite gap where `login.tsx` had no way to avoid
  re-rendering its own form with a 200 after success. `apps/{dashboard,admin}/routes/logout.tsx` are
  new, POST-only (never a bare link — that's a CSRF-adjacent footgun). CSRF is a new `ctx.verifyCsrf()`
  method (`packages/core/src/csrf.ts`), ad hoc per-action like `requireAuth()` already is — no new
  middleware layer. `session.ts`'s cookies now get `Secure` in production (never before, even then —
  a real gap), conditional on `NODE_ENV` so dev over plain HTTP still works. **A real, previously
  undocumented bug closed along the way**: `apps/admin` (`auth: "isolated"`) had no login route at
  all, making its one route's `ctx.requireAuth()` permanently unsatisfiable — `apps/admin/routes/
  login.tsx` is new and fixes this for real, verified end-to-end.
- **`entry-server.tsx` de-duplicated** — confirmed byte-for-byte identical across all three apps;
  the real logic now lives once in `packages/core/src/renderRoute.ts`, each app's file shrunk to a
  4-line shim supplying only the React bindings that genuinely can't be shared. Pure refactor,
  re-verified against every prior end-to-end test with no behavior change.
- **`ssg`/`csr`/`isr` render modes are real** (`"streaming"` explicitly deferred to v2 — see
  `ROADMAP.md` for why). `ssg`/`isr` get a real build-time pre-render step (new
  `packages/cli/src/build/buildAppStatic.ts`, `packages/core/src/isrCache.ts`) writing to
  `dist/static/<route>/index.html`; `isr` regenerates synchronously once stale
  (`revalidate: { seconds }`, now actually attached to `RouteModule`). `csr` never runs `loader`
  anywhere and ships a minimal shell + a new generic `csr-client.tsx` bootstrap per app. Dev
  deliberately renders `ssg`/`isr` live per request (same reasoning `/sitemap.xml` already used) —
  only a real production build exercises the "rendered once, cached" semantics.
  `AppRuntimeConfig.defaultRenderMode` (previously dead config, set in `apps/marketing/app.config.ts`
  but never read anywhere) is now actually threaded through and verified (`apps/marketing/routes/
  about.tsx` has no explicit `renderMode` and correctly inherits `ssg`). **A real, previously
  undiscovered bug found and fixed getting here**: Rollup's default `preserveEntrySignatures`
  silently dropped a dynamically-`import()`-able entry chunk's `default` export whenever nothing in
  the same build's static graph referenced it — true of every island *and* every csr route entry.
  Confirmed by directly `import()`-ing a built chunk and finding `{ default: undefined }`, not
  assumed from a passing content-type check (which is all earlier island verification had actually
  checked). Fixed with `preserveEntrySignatures: "strict"` in `buildAppClient.ts` — this means
  **production island hydration's earlier "verified" claim was incomplete**; it's genuinely fixed and
  re-verified now (real exports, confirmed by import, in addition to the URL/content-type checks
  already done).

**Brand assets + shared page design + two new CLI commands** — the real Devora.js logo now lives at
`assets/icons/` (repo root, one copy, not duplicated per app — every app's `vite.config.ts` sets
`publicDir` there); every route across all three apps uses a new shared `<PageShell>`
(`packages/core/src/branding.tsx`) with a real header (logo + wordmark + app-name badge) and one
theme (`packages/core/src/theme.ts` — dark by default using the logo's own gradient, automatic light
variant via `prefers-color-scheme`, no JS toggle needed). **Two real bugs found wiring this up, not
anticipated in advance**: (1) an app with zero islands/csr routes never ran a Vite client build at
all, so its `publicDir` never reached `dist/client` — its logo 404'd in production until
`buildAppClient.ts` was fixed to copy `publicDir` unconditionally; (2) a `csr` route importing
`PageShell` from the main `@devora/core` entry broke that route's *browser* build outright
(`"randomBytes" is not exported by "__vite-browser-external"` — the main barrel's `export *` reaches
`node:crypto`/`node:fs` code that can't bundle for a browser target) — fixed with a new, genuinely
browser-safe `@devora/core/client` subpath, same reasoning `./config-loader` already existed for.
Also new: `devora add <name>` (friendlier alias for `new`, same action — the scaffolder itself was
regenerated while touching this, since it had gone stale and, more seriously, never wrote a
`package.json` at all, so a scaffolded app wasn't a valid workspace member), `devora remove <name>`/
`rm` (undoes `new`/`add` — deletes `apps/<name>` and its `devora.config.ts` entry; previously manual),
and `devora list`/`ls` (prints every app in `devora.config.ts`). All verified end-to-end, including a
real scaffolded app taken through `pnpm install` → `devora dev` → `devora build` → `devora start` →
`devora remove`, confirming `devora.config.ts` came back byte-identical to before it was added.

**Design follow-up, from actually using the app in a real browser (not just curl)** — a real bug
surfaced this way that curl-based verification had missed entirely: `apps/admin` had **no route
matching `/` at all** (only `login.tsx`/`bulk-import.tsx`/`logout.tsx`) — a visitor landing on
admin's root URL, the first thing anyone naturally tries, hit an unmatched-route 404 that bypasses
the shared header/theme completely (Vite's raw dev 404 in dev, a bare 404 in prod) — this is exactly
what "no design at all" looked like, confirmed by a real Playwright screenshot showing a blank
`Cannot GET /` page before the fix. New `apps/admin/routes/index.tsx` closes it. Along the way:
`branding.tsx`/`theme.ts` got real navigation (`AppHeader`/`PageShell` accept an optional `nav`
prop; each app defines its own link set explicitly in a new `apps/*/nav.ts` — not guessed from
`appName` inside the shared component, keeping with "explicit over implicit") and a genuine
visual pass (card-style forms with labels, focus rings, button hover/active states, a sticky header,
a footer, `.devora-card` for non-form content) — verified with real Playwright screenshots in both
light and dark, not just class-name presence via curl. Also silenced a real (harmless) Vite dev
warning: `prodRequestHandler.ts`'s `importBuilt()` uses a runtime-computed `import()` path (required
— production loads pre-built files by a key resolved from the request), which Vite's static
import-analyzer can't trace and warns about on every `devora dev` run even though that function
never executes in dev; `/* @vite-ignore */` was the correct, Vite-suggested fix, not a workaround.

**Multi-app-aware Vercel/Netlify deploy orchestration — the last unbuilt item from §13's N:N risk,
now closed.** `devora build --adapter=X` already looped over every app but produced N completely
uncoordinated output directories with no project/site identity and no way to actually deploy
anything. New `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]` rebuilds each app
fresh, relies on each platform's own linking convention (`vercel link`/`netlify link` →
`.vercel/project.json`/`.netlify/state.json`, deliberately not a devora-invented config field — see
ROADMAP.md #13), and shells out to the real platform CLI via `npx` for every linked app, skipping
unlinked ones with a clear instruction rather than failing. Verified for real: confirmed no `vercel`
invocation happens at all when unlinked; confirmed a fake link file makes the command genuinely
invoke the real Vercel CLI (downloaded and ran v59.11.7), which correctly failed with a real
`No existing credentials found` auth error — not a devora crash — same proof repeated for Netlify.
What can't be verified: an actual authenticated deploy (needs a real account) and domain
auto-binding, deliberately not built this pass (a real external account side effect).

**Sessions/auth made opt-in per app, not a project-wide always-on requirement.** Every app used to
pay the "`DEVORA_SESSION_SECRET` required or crash in production" cost even with no login route at
all (`apps/marketing`, concretely). `AuthMode` (`packages/core/src/config.ts`) is now `"shared" |
"isolated" | "none"` — a real third literal, not `auth: undefined` (which already means "inherit
the project default" via `resolveAuthMode`, and can't be repurposed without breaking that). `"none"`
opts an app out of the *entire* cookie/session/CSRF carrier: `resolveSessionCookieOptions()` (the
function whose `resolveSecret()` throws in production without a configured secret) is never even
*called* for a `"none"` app, in either `ssrMiddleware.ts` (dev) or `prodRequestHandler.ts`
(production/adapter-node/Vercel/Netlify) — skipping its result wouldn't have been enough, since the
throw happens as a side effect of the call itself, at handler-creation time. Instead a `"none"` app's
`ctx` is `session.ts`'s new `createNoAuthContext()`: `session` is always `undefined`, and
`requireAuth()`/`setSession()`/`clearSession()`/`verifyCsrf()` all throw a clear, specific error
("this app has sessions disabled...") rather than silently no-op'ing. A second, build-time layer
(`packages/cli/src/build/checkNoAuthUsage.ts`, same plain-regex-over-raw-source approach
`discoverIslandFiles.ts` already uses) scans a `"none"` app's route files for `ctx.<method>(` calls
and fails `devora build`/`devora dev` immediately, before the request that would have thrown ever
arrives — wired into `buildForAdapter.ts` (so every adapter target inherits it) and `dev.ts`.
`devora new`/`devora add` now ask per-app whether the new app needs auth (`--auth
shared|isolated|none`, prompted interactively via a TTY-aware `readline` if omitted, defaulting to
`shared` non-interactively so scripted/CI use never hangs) and skip generating `login.tsx`/
`logout.tsx`/the protected demo route for a `"none"` choice. Applied to all three existing apps as
the real test case: `apps/marketing` is now `auth: "none"` in `devora.config.ts` (it had no login
route before this change either — confirmed by grep, not assumed) and verified end-to-end with
literally zero `DEVORA_SESSION_SECRET*` set anywhere — `devora dev`, `devora build`, `devora start`
(adapter-node), and `devora build --adapter=vercel`/`--adapter=netlify` all succeed with no warning
printed at all; a deliberately-added test route calling `ctx.setSession()` in `apps/marketing`
confirmed the build-time check fails immediately with the file and method named, before removal.
`apps/dashboard`/`apps/admin` stay `auth: "shared"`/`"isolated"` — full existing regression
re-verified unchanged: login → `requireAuth()` passing → logout → CSRF verification → a tampered
session cookie correctly rejected (falls back to `undefined` session, `requireAuth()` throws) for
both the shared cookie (`dashboard`) and the isolated one (`admin`, its own `devora_session_admin`
cookie name and `DEVORA_SESSION_SECRET_ADMIN`).

**Not yet real** (see `README.md` "What's still a stub" and `ROADMAP.md` for the authoritative
list):
- `"streaming"` render mode — deferred to v2, not silently dropped. The island two-pass render
  mechanism (`IslandCollectorContext`) fundamentally assumes a synchronous second `renderToString`
  pass, which `renderToPipeableStream`/`renderToReadableStream` don't support; making it work needs a
  Suspense-boundary-based island rewrite, real v2-sized work.
- Real Vercel/Netlify deployment beyond what's now verified — the user did a real, live Vercel
  deployment of all three apps (not this environment; no platform access here), which surfaced two
  real bugs local simulation had gotten wrong: (1) "the platforms' own dependency tracers behave
  the way local testing simulated them" was false for Vercel specifically — its Build Output API
  v3 never traces a function you hand it pre-built, so `react`/`react-dom` (left `external` by
  `bundleForDeploy.ts`) were never actually included; fixed by having the adapters vendor the real
  resolved package trees in themselves (see ROADMAP.md #4's new bullets). (2) `devora build` never
  set `NODE_ENV` itself and silently depended on the caller having done so — invisible in every
  local test here because it was always exported by hand first — which broke Vite's production JSX
  transform specifically on Vercel's custom-`buildCommand` path; fixed by having `devora build` set
  `NODE_ENV=production` unconditionally (`packages/cli/src/commands/build.ts`). Both fixes verified
  against real deployments (marketing, dashboard, admin all confirmed working live) — this closes
  the specific "unverified" gap this section used to describe; what remains genuinely unverified is
  everything this environment still can't reach directly (Netlify's actual deploy, in particular —
  fixed defensively the same way but never exercised against real Netlify infrastructure).
  `isr`'s disk cache is additionally only verified/reliable under `adapter-node`'s long-lived
  process — a serverless function's filesystem isn't guaranteed to persist or be shared across
  invocations.

`pnpm install` (the recommended manager, and the state the repo is currently left in) has been run;
fresh `npm install`/`yarn install` were also each run and exercised, then cleaned up back to pnpm.
The SSR handler, session wiring, security headers, SEO primitives, islands (dev and production,
including the exports bug above), a real production build + adapter-node, the bundle-size fix, the
Vercel/Netlify functions (run standalone outside the monorepo, not just booted from within it), the
CLI bin, `clientOnly()`, login/logout/CSRF, `ssg`/`csr`/`isr` render modes, and multi-app deploy
orchestration have all been exercised against running servers/real external CLIs — not just built —
and (temporarily, then reverted) so was a real DB client.

**Pre-publish cleanup (before this repo went public on GitHub)** — see ROADMAP.md's "Pre-publish
cleanup" section for the full account. Summary: secrets scan came back clean (no hardcoded
keys/tokens, no `.env` file, nothing to leak); added `LICENSE` (MIT) and `.env.example`; fixed a
real `.gitignore` gap (no `.env` exclusion existed); and renamed `@project/core`/`@project/backend`
→ `@devora/core`/`@devora/backend` across every `package.json`, import, and doc — `packages/core`
turned out to be 100% framework internals now (not the user-space code its old `@project/*` naming
implied), while `packages/backend` and every scaffolded app genuinely are user-owned and correctly
kept `@project/*`. Full regression (all CLI commands, all three apps, cross-package calls) re-run
under both pnpm and a fresh npm install after the rename.

## Suggested next task

Every `ROADMAP.md` item now has real work behind it. What's left of the locally-closeable work is
`"streaming"` (deferred to v2, see above) and the disk-cache/serverless mismatch for `isr` under
Vercel/Netlify specifically. What's left overall is an actual Vercel/Netlify deployment, which needs
real platform access this environment doesn't have — not something to attempt locally. Confirm with
me before starting something not on that list.

## Working style

- Keep the "explicit over implicit" principle (§2.2) — no hidden caching, no convention-over-
  configuration magic beyond file-based routing itself.
- Ask before deviating from a locked decision above; otherwise proceed and just flag tradeoffs.
