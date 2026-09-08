# Roadmap to v1

This document tracks the gap between the current scaffold and a *real* v1, ordered by what
unblocks what. It exists so "make this framework succeed" is a checklist, not a vibe. Source of
truth for scope stays `architecture-v1.md`; this file is derived from it and should be updated as
work lands, not treated as a spec of its own.

## Definition of success (from architecture-v1.md §14)

> v1 is "done" when: a solo/small team can build a real project with a marketing site + app + admin
> panel sharing auth and a core, deploy each independently, get good SEO out of the box, and not
> hit a single `window is not defined` crash from a client library — all without needing to read
> framework internals to understand why something cached or didn't.

Unpacked, that requires five things to all be true at once:

1. Routes actually render (SSR/SSG/CSR/streaming/ISR per `renderMode`) — SSR (#1), SSG/CSR/ISR
   (#12) all done; only `"streaming"` remains, explicitly deferred to v2 (see #12).
2. Auth/session context is real, shared by default, isolable per app — done (#2, #10).
3. Client-only libraries (three.js, fabric.js, etc.) never crash on the server — done (#9),
   `clientOnly()` itself now verified with a real negative control, not just islands as an analog.
4. Each app deploys independently to at least one real target — `adapter-node` is real and fully
   verified (#4); Vercel/Netlify write structurally correct output reusing the same build, and a
   real multi-app deploy *orchestration* layer now exists (#13, link-detection and CLI wiring
   verified for real) — but an actual authenticated deploy to either platform still isn't
   verified against real platform deployment (no access here) — see #4's and #13's detail.
5. SEO primitives work — done (#7): OG tags + per-app opt-in sitemap.xml, both verified.

Four of five are now unconditionally true (#2, #3, #5, and #1 for every mode except the explicitly-
deferred `"streaming"`); #4 is true for the self-hosted target specifically, with real platform
deployment honestly scoped as not-yet (and `isr` specifically weaker there — see #12).

## Work items, in dependency order

### 1. SSR request handler (blocks nearly everything else) — ✅ done
Turns a route module (`loader` + component + optional `action`) plus its `renderMode` into a real
HTTP response, for `renderMode: "ssr"`. Verified end-to-end: `GET /settings` on `apps/dashboard`
server-renders the real component; `POST /settings` runs `action`, which calls the shared backend
function, which throws its intentional "no DB client configured" stub error (proving the whole
call chain — form parsing → action → shared backend — is really wired, not mocked);
`apps/admin/routes/bulk-import.tsx` renders too; `apps/marketing`'s `renderMode: "ssg"` route
honestly 404s instead of mis-rendering, since only `"ssr"` is implemented.
- **Where:** `packages/core/src/router.ts` (file-based matching, static segments only — no
  `[id].tsx` yet), `packages/core/src/html.ts` (document shell, no hydration script — see below),
  `packages/core/src/route.ts` (the `RouteModule` contract), `apps/*/entry-server.tsx` (per-app
  Vite-SSR entry point — keeps `react-dom/server` resolving against each app's own dependencies
  instead of adding React to `packages/core`), `packages/cli/src/server/ssrMiddleware.ts` (request
  handling, wired into `devora dev` via `server.middlewares.use(...)` with `appType: "custom"`).
- **Two pre-existing gaps found and fixed/flagged while verifying this:**
  - Root `package.json` never listed `@devorajs/core` as a dependency, so pnpm never linked it at
    the repo root and `devora.config.ts` (which imports `@devorajs/core/config`) couldn't
    resolve at all — the CLI was unusable before this fix, unrelated to SSR specifically. Fixed.
  - The `devora` bin still doesn't run directly (`pnpm exec devora dev` fails) — Node's
    native loader won't map this codebase's `.js`-suffixed relative imports back to `.ts` sources.
    Worked around with `tsx` for testing (see `README.md`); not fixed, since it's CLI packaging,
    not SSR. Worth a follow-up before v1 (small — likely a `tsx`/`ts-node` shebang or a build step).
- **What was deliberately still missing at the time this item landed** — since closed for
  `ssg`/`csr`/`isr` by #12 (`"streaming"` remains not implemented, deferred to v2, see #12): no
  render mode besides `"ssr"` was implemented; no hydration script is emitted (full-page hydration
  isn't this framework's model — only islands hydrate, and islands don't exist yet at this point in
  the sequence, so nothing on an SSR page is interactive); no security headers (#5); dynamic route
  segments still aren't supported (unchanged, real remaining gap — see architecture doc §4).
- **Unblocked:** request-context plumbing (#2), islands (#3), SEO primitives (#5), and gives the
  adapters (#4) something real to serve instead of static config.

### 2. Request context (`ctx.requireAuth()` / `ctx.session`) — ✅ done
`loader`/`action`/server functions now receive a real, signed session via `ctx` — not a stub.
`ctx.setSession(data)` signs an HMAC-SHA256 cookie (Node's built-in `crypto`, no new dependency);
`ctx.requireAuth()` throws when there's no valid session; a tampered cookie is rejected
(`timingSafeEqual` signature check) rather than silently trusted. Verified end-to-end on
`apps/dashboard`: `POST /settings` with no session → `requireAuth()` throws; `POST /login` (demo
route, `apps/dashboard/routes/login.tsx`) sets a session cookie; `POST /settings` with that cookie
→ passes `requireAuth()` and reaches the same DB-stub error as before, proving the whole chain
(cookie → verified session → `ctx.session` → `requireAuth()` passing) is real, not mocked; a
hand-tampered cookie is correctly rejected.
- **Where:** `packages/core/src/session.ts` (signing/verification/cookie-option resolution — the
  actual carrier), `packages/core/src/serverFn.ts` (extended `RequestContext` with `setSession`/
  `clearSession`), `apps/*/entry-server.tsx` (builds the real `ctx` via `createRequestContext`,
  returns any `Set-Cookie` to apply), `packages/cli/src/server/ssrMiddleware.ts` (resolves the
  per-app cookie name/secret once, threads the request's `Cookie` header through, applies the
  response's `Set-Cookie`).
- **Deliberately still bring-your-own (§6/§11):** nothing here checks credentials — `login.tsx` is
  a demo that trusts any submitted username specifically to prove the carrier works; a real app
  swaps that one line for a real password/token check before calling `ctx.setSession()`.
- **Shared vs. isolated, now enforced, not just config-shape:** shared apps get one project-wide
  cookie (`devora_session`, secret from `DEVORA_SESSION_SECRET`); an app with `auth: "isolated"`
  (e.g. `apps/admin`) gets its own cookie name (`devora_session_<app>`) and can be given its own
  secret via `DEVORA_SESSION_SECRET_<APP>` — so a dashboard session cookie is structurally incapable
  of authenticating against the admin panel. (Renamed from `fw_session`/`FRAMEWORK_SESSION_SECRET`
  when the project was named Devora.js; the `@project/core`/`@project/backend` package-scope side
  of that same rename was finished later, as part of pre-publish cleanup — see "Pre-publish
  cleanup" near the end of this document.)
- **Dev ergonomics vs. safety:** with no secret set, dev mode uses an insecure, clearly-logged
  fallback secret; production (`NODE_ENV=production`) throws instead of silently using it.
- **Not done at the time this item landed** — since closed by #10: login UI, logout route, and CSRF
  protection on the cookie-based form flow.
- **Since made opt-in per app, not a project-wide always-on requirement.** Every app used to pay
  the "secret required or crash in production" cost above even with no login route at all
  (`apps/marketing`, concretely — it never had one). `AuthMode` (`packages/core/src/config.ts`) is
  now `"shared" | "isolated" | "none"`: a real third literal, not `auth: undefined` (which already
  means "inherit the project's `shared.auth` default" via `resolveAuthMode` and can't be
  repurposed without breaking that inheritance). `"none"` opts an app out of the *entire*
  cookie/session/CSRF carrier — `resolveSessionCookieOptions()` (whose `resolveSecret()` is exactly
  what throws in production without a configured secret) is never even *called* for a `"none"` app
  in either `ssrMiddleware.ts` (dev) or `prodRequestHandler.ts` (production/adapter-node/Vercel/
  Netlify); skipping only its *result* wouldn't have been enough, since the throw is a side effect
  of the call itself, at handler-creation time, not per-request. A `"none"` app's `ctx` is
  `session.ts`'s new `createNoAuthContext()` instead: `ctx.session` is always `undefined`, and
  `requireAuth()`/`setSession()`/`clearSession()`/`verifyCsrf()` all throw a clear, specific error
  ("this app has sessions disabled ... set auth: shared or isolated if it needs login") rather than
  silently no-op'ing — a silent no-op would be a confusing way to discover a login button does
  nothing. A second, build-time layer catches the common case earlier: `packages/cli/src/build/
  checkNoAuthUsage.ts` scans a `"none"` app's route source for `ctx.<method>(` calls (same
  plain-regex-over-raw-source approach `discoverIslandFiles.ts` already uses for `island()` calls,
  deliberately not a full AST parse — same false-negative tradeoff accepted: a renamed/destructured
  `ctx` defeats the scan, and the runtime throw above is what catches that case instead), and fails
  `devora build`/`devora dev` immediately with the offending file and method named, before the
  request that would have thrown ever arrives. Wired into `buildForAdapter.ts` (so the check runs
  for every adapter target, computed unconditionally, not just inside the vercel/netlify branch)
  and `dev.ts`. `devora new`/`devora add` now ask per-app whether the new app needs auth (`--auth
  shared|isolated|none`, prompted interactively via a TTY-aware `readline/promises` if omitted,
  defaulting to `shared` when stdin isn't a TTY so scripted/CI use never hangs) and skip generating
  `login.tsx`/`logout.tsx`/a protected demo route for a `"none"` choice — no fake login route in an
  app that said no to auth. Applied to all three existing apps as the real test case: `apps/
  marketing` is now `auth: "none"` in `devora.config.ts` — confirmed by grep that it had no
  `ctx.*` calls anywhere in its routes before this change either, so this wasn't papering over an
  existing dependency — and verified end-to-end with literally zero `DEVORA_SESSION_SECRET*` env
  vars set anywhere: `devora dev --app=marketing`, `devora build --app=marketing`, `devora start
  --app=marketing` (adapter-node), and `devora build --app=marketing --adapter=vercel`/
  `--adapter=netlify` all succeeded with no warning printed at all (confirmed by inspecting captured
  stdout/stderr directly, not just checking exit codes). Negative-control verified too: a
  deliberately-added `apps/marketing/routes/__test-bad-auth.tsx` calling `ctx.setSession()` made
  both `devora build --app=marketing` and `devora dev --app=marketing` fail immediately with
  `[devora] app "marketing" has auth: "none" ... ctx.setSession()` naming the exact file, before
  any server started — then removed. `apps/dashboard`/`apps/admin` stay `auth: "shared"`/
  `"isolated"` with the pre-existing behavior completely unweakened (secret required, throws in
  production if missing, insecure dev fallback with a warning otherwise) — full existing regression
  re-run and still passing: login → `requireAuth()` passing → logout → CSRF verification → a
  hand-tampered session cookie correctly rejected (invalid HMAC signature → `currentSession` falls
  back to `undefined` → `requireAuth()` throws "no active session", not the DB-stub error a valid
  session would reach), confirmed separately for both the shared cookie (`dashboard`,
  `devora_session`) and the isolated one (`admin`, `devora_session_admin` +
  `DEVORA_SESSION_SECRET_ADMIN`).

### 3. Islands / partial hydration — ✅ done, in both dev and production
`island(() => import("./X"))` does real work: SSR renders the island's actual content (not a
placeholder), and a client hydration script boots it independently — in dev via a `/@fs/<path>`
URL, in a real production build via a real hashed client asset URL (closed as part of #4's
production-hydration gap; see that section for the build-pipeline detail). Verified end-to-end via
`apps/dashboard/routes/index.tsx`'s counter demo, in both modes.
- **Where:** `packages/core/src/island.ts` (the descriptor), `packages/core/src/islandComponent.tsx`
  (the `<Island>` wrapper + two-pass-render collector — see below), `packages/core/src/islandCallPattern.ts`
  (the shared `island(() => import(...))` regex — see the bug note below on why this is one file, not
  three), `packages/cli/src/islandsPlugin.ts` (dev-only Vite plugin resolving to a `/@fs/<path>` URL),
  `apps/*/island-client.tsx` (per-app hydration bootstrap, same pattern as `entry-server.tsx`),
  `packages/core/src/html.ts` (only emits the hydration `<script>` when a page actually used an
  island). Production-specific pieces are under #4.
- **The real technical problem this solves:** resolving an island's async `import()` inside a
  synchronous `renderToString` pass isn't supported without Suspense/streaming (not in v1 — #1).
  Solution: a two-pass render (`entry-server.tsx`) — pass one walks the tree via React context,
  collecting each unresolved island's import promise; if none were found, that render was already
  complete (the common, no-islands case pays for exactly one render, verified — non-island pages'
  output and script-tag-absence didn't change); only a page with islands pays for a second pass.
- **A real bug found and fixed, not just anticipated:** `Island.tsx` collided with `island.ts` on
  macOS's default case-insensitive filesystem — `./Island.js` and `./island.js` resolved to the
  same file, so `createIslandCollector` came back `undefined` at runtime. Cost an actual debugging
  round trip before being traced to the collision; fixed by renaming to `islandComponent.tsx`
  rather than trusting future developers to avoid the trap.
- **A real design fix found while wiring the demo:** the router treats every file under `routes/`
  as a page (§4) — a colocated `Counter.tsx` next to `index.tsx` would have become an accidentally
  publicly-servable `/Counter` route. Fixed by putting island components in a sibling `components/`
  directory instead; documented in the demo route's own comment so it isn't rediscovered the
  same way twice.
- **New core dependency, justified:** `react` was added to `packages/core` (see
  `DEPENDENCIES.md`) — `Island.tsx`/`islandComponent.tsx` has to be a real component usable
  directly in route JSX, not just types. Every app already depends on the same `^18.3.0` range and
  pnpm dedupes matching semver ranges, so this doesn't introduce a second React instance *in dev*.
  (Production is a different story — see #4's finding on this exact question.)
- **Scope boundary, explicit:** only the literal call shape `island(() => import("specifier"))` is
  recognized (regex-based plugin, not a full AST transform) — no dynamic/computed specifiers.

### 4. Adapters: real build output, not just config — ✅ all three done and verified in isolation; only the actual platform deploy itself remains unverified
There was no production SSR build pipeline at all before this — only dev-mode
`vite.ssrLoadModule`. Building one was most of this item's real work.
- **The real build (`packages/cli/src/build/buildAppServer.ts`):** every route file plus
  `entry-server.tsx` as named Vite/Rollup SSR-build entries (`vite build` with `build.ssr: true`).
  Named inputs give predictable output paths (`dist/server/<key>.js`, key = source path relative to
  the app root, extension stripped), so the production request handler can compute a route's built
  file the same way `matchRoute` finds its source file — no manifest needed for this part.
- **The production request handler (`packages/core/src/prodRequestHandler.ts`):** same
  request-handling shape as `ssrMiddleware.ts` (match → session → action → loader → render), but
  loads pre-built files via plain `import()` instead of `vite.ssrLoadModule` — no running Vite dev
  server required. Lives in `packages/core`, not the CLI, specifically so `adapter-node` can depend
  on it without a circular `cli ↔ adapter-node` workspace dependency (the CLI depends on the
  adapters for `build`/`start`; the adapters must not depend back on the CLI).
- **`adapter-node` — fully verified, not just built:** `devora start` boots a real
  `http.Server` from `dist/server`. Verified end-to-end against a real running production server
  (not just a build succeeding): SSR content renders correctly, security headers match dev-mode
  defaults exactly, sessions work (unauthenticated write → `requireAuth()` throws → generic 500 with
  the real error only in the server log, not leaked to the client — correct production behavior,
  better than dev's verbose error page in this one respect), authenticated write reaches the same
  DB-stub error as dev, sitemap.xml works, and marketing's still-unimplemented `ssg` mode 404s
  identically to dev instead of misrendering. Full parity, not assumed — checked point by point.
- **`adapter-vercel` / `adapter-netlify` — real, and verified in the strictest way available without
  an actual platform:** both copy the app's actual `dist/server` output (plus `routes/`, needed only
  for filename-based route matching, never executed) into their platform's function format, generate
  a function file calling the exact same `createProdRequestHandler` `adapter-node` uses, then run it
  through `bundleForDeploy` (see below) so it's genuinely executable outside this monorepo — not just
  logically correct when run from inside it. Verified by copying the real generated function to a
  directory completely outside this repo and running it there. What's **not** and **cannot** be
  verified here: an actual deploy to Vercel or Netlify infrastructure, and specifically whether their
  real dependency tracers behave the way this document's manual simulation of them assumed — no
  platform access in this environment. Said explicitly rather than left to be assumed from silence.
- **A second real bug found once island assets existed to route:** the Vercel `config.json` sent
  *every* request — including `/assets/*` island asset requests — to the function, and the function
  bundle only ever had `dist/server` copied into it, never `dist/client`. Static assets would have
  404'd on a real deploy. Fixed by restoring the `{ "handle": "filesystem" }` routing entry (dropped
  when the routes array was rewritten earlier, and present in the code's original pre-#4 form for
  exactly this reason) so Vercel serves a static file before falling through to the function, and by
  actually copying `dist/client` into `.vercel/output/static/`. Verified structurally: after a real
  build, `static/assets/` contains the exact files the SSR-rendered HTML's `data-island-url`
  references. Netlify needed no equivalent fix — its `publish = "dist/client"` plus an *unforced*
  catch-all redirect means Netlify's documented behavior is to serve a matching static file before
  applying the redirect; verified that `dist/client` really exists at the path `publish` points to
  after a build, but the platform behavior itself (like everything else in this bullet) is asserted
  from documentation, not from an actual deploy.
- **A real bug found via that verification, not left as a TODO:** neither generated function
  originally caught errors from `handleRequest` — an uncaught throw (even the *expected* DB-stub
  one) crashed the whole function instead of returning a 500, unlike `adapter-node`'s
  `createNodeServer`. Found by actually invoking the generated Netlify function with a real
  `Request` and watching it crash the test script. Fixed in both: wrapped in try/catch, logs
  server-side, returns a proper error response.
- **The dependency-resolution gap above — resolved, not left open.** This section previously ended
  with the generated function's `import "@devorajs/core"` only resolving from inside the monorepo,
  and called closing that "probably the single largest remaining piece of adapter work." It's
  closed: `bundleForDeploy` (`adapters/adapter-vercel/src/bundleForDeploy.ts`, duplicated in
  `adapter-netlify` — small enough that a shared package wasn't worth a new circular-dependency risk)
  runs a real `esbuild` pass (added as a genuine dependency of both adapter packages) on the
  generated function, wired into `writeVercelOutput`/`writeNetlifyConfig` so every `devora build
  --adapter=vercel|netlify` does this automatically.
  - **Proven by the strictest local test available, not assumed:** copied the *actual* generated
    function directory to `/tmp`, completely outside this repo — no ancestor `node_modules`, nothing
    to fall back on — and ran it there. Before `bundleForDeploy`: `Cannot find package
    '@devorajs/core'`, immediately, exactly as predicted. After: with real `react`/`react-dom`
    manually placed in a local `node_modules` (simulating what a platform's own dependency tracer
    does automatically for *ordinary* npm packages — react/react-dom were never the problem, and
    aren't re-implemented here), the full request chain works: home page renders with real content,
    login sets a real session cookie, an authenticated write reaches the same DB-stub error every
    other test in this document hits, an unauthenticated one is correctly blocked by
    `requireAuth()`, and the island's real markup + hydration script both appear. Ran for both
    `apps/dashboard`'s real Vercel *and* Netlify function output, independently.
  - **Three more real, previously-unknown bugs found getting there — not anticipated, found by
    actually running the isolated function and reading what broke:**
    1. Bundling `entry-server.js` + every route file *inline* (react/react-dom included) hit a real
       esbuild+Node ESM interop failure: `Dynamic require of "stream" is not supported`, from inside
       react-dom's bundled CJS internals. Switching output format to CJS to route around it
       (react-dom's own conditional `require()` calls are only safe in genuine CJS) then surfaced a
       *second*, different interop gap: esbuild's CJS output omits `default` from the static export
       hint Node's `cjs-module-lexer` uses, so a route's default-exported component silently became
       the *whole* CJS exports object one level too high — confirmed by inspecting the exact resulting
       object shape (`mod.default` was an object, not a function; `mod.default.default` was the real
       component). Neither of these is `@devorajs/core`-specific; both are real esbuild/Node bundling
       hazards.
    2. The actual fix that avoided both: keep `react`/`react-dom` **external** (not bundled) in the
       route/entry-server pass, ESM output — sidesteps the CJS-interop mess entirely, and correctly
       reflects that react/react-dom are ordinary npm packages a real platform tracer already knows
       how to include; bundling them was never the framework's job to begin with. `bundleForDeploy`
       still defensively unwraps the default-export interop shape in
       `packages/core/src/prodRequestHandler.ts` anyway — cheap insurance against the same gap from a
       different bundler.
    3. Bundling `entry-server.js` and each route file as *separate* esbuild invocations (no
       `splitting`) gave each its own independent copy of `@devorajs/core` — harmless for stateless
       exports, but `Island.tsx`'s `IslandCollectorContext` is a React Context object, and two
       separately-bundled copies are two different objects. `useContext` in a route's copy could
       never see the Provider set up by entry-server's copy — and it failed *silently* (the
       component's own `if (!collector) return null` guard), not with an error: an island quietly
       rendered nothing instead of crashing, the kind of bug that's easy to ship unnoticed.
       `splitting: true` (ESM-only, which this now is) shares one `@devorajs/core` chunk across every
       file; confirmed fixed by re-running the isolated test and seeing the island's real markup
       reappear.
  - **What this does and doesn't prove:** it proves the generated function is genuinely runnable
    outside this monorepo — the actual, unique problem this document identified. It does not prove a
    real Vercel/Netlify deployment succeeds: their own dependency tracers for `react`/`react-dom`
    were simulated by hand (copying the real packages into a local `node_modules`), not exercised,
    and remain the one thing this environment cannot verify without real platform access. That
    boundary is now much smaller than "the whole dependency story is unverified," but it hasn't
    disappeared.
- **The ~255KB-per-app bloat: the original theory here was wrong, and the real cause — and fix —
  turned out to be simpler.** `@devorajs/core`'s `package.json` `exports` pointing at raw `.ts`
  source (not compiled `.js`) is still true and still means any consumer's build bundles it inline
  rather than externalizing it. What was wrong was the explanation for *why that was expensive*:
  this section previously said the cost was "a second copy of `react`" duplicated inside the
  bundled `@devorajs/core`. Directly inspecting the actual bundle's `import` statements (not
  re-guessing) showed `react`/`react-dom` were correctly externalized the whole time — that was
  never the problem. The real cause: `packages/core/src/index.ts`'s single barrel `export *`
  re-exported `loadProjectConfig.ts`/`loadAppConfig.ts` (CLI-only, needed only by `devora dev`/
  `build`/`generate:proxy` to load `devora.config.ts`) alongside the SSR runtime primitives
  (`html.ts`, `session.ts`, etc.) that `entry-server.tsx` actually uses. Neither function is ever
  *called* by SSR code, but Rollup's tree-shaking couldn't prove `jiti` (the loaders' one real
  dependency, with side-effecting internals) was safe to drop, so every SSR build pulled in the
  entire `jiti` transpile-on-demand loader — that was the ~255KB.
  - **Fix, verified by measuring before and after, not assumed:** split the barrel.
    `loadProjectConfig`/`loadAppConfig`/`resolveAppDir` moved to a new `@devorajs/core/config-loader`
    subpath (`packages/core/src/configLoader.ts`); the four CLI files that used them
    (`dev.ts`/`build.ts`/`start.ts`/`generate-proxy.ts`) now import from that subpath instead of the
    main entry. Result, on the real (unmodified) build path: `apps/marketing`'s `entry-server.js`
    went from 259.79KB to 5.23KB; `apps/dashboard`'s `islandComponent` chunk went from 255.73KB to
    1.14KB. Full regression pass afterward (dev + production, all three apps, sessions, islands,
    sitemap, headers, `generate:proxy`) confirmed nothing else broke.
  - **What was actually tried and ruled out along the way:** `ssr.external: true` (verified to
    change nothing — the real reason, understood only after this investigation, is that
    `@devorajs/core`'s `exports` point at `.ts` source, which plain Node can't execute even if
    "externalized", so Vite has no choice but to process it); a `resolve.alias` pointing
    `@devorajs/core` at a real compiled `dist/index.js` instead of raw source (built one via `tsc`,
    confirmed with a real test — see below — that plain Node could import it; then verified the
    alias made *no measurable difference* to bundle size, because the bloat was never about
    TS-vs-compiled-JS in the first place).
  - **`packages/core` now has a real, working, verified build step anyway — kept as a documented,
    standalone capability, not wired into the hot path.** `pnpm --filter @devorajs/core build` (a
    real `"build": "tsc"` script) produces `dist/` with compiled `.js` + `.d.ts`; confirmed by
    actually importing `dist/index.js` with plain `node` (no `tsx`) and calling a real exported
    function successfully — the exact thing that failed earlier in this document (ROADMAP.md #4's
    Vercel/Netlify section) when tested against raw `.ts` source. Not wired into `devora build`
    automatically: the bloat problem it was meant to help with is already solved by the barrel
    split, and its other plausible benefit — making Vercel/Netlify's own dependency file-tracers more
    likely to succeed against a normally-shaped compiled package — can't be verified without real
    platform access anyway, so adding a subprocess-spawning step to every build for an unverifiable
    benefit wasn't worth it. Available if a future adapter push wants it.
  - **Two real, previously-uncaught bugs found for free while getting `tsc` to run cleanly:**
    `@types/node` and `@types/react` were never actually installed for `packages/core` — the package
    has always relied on Vite/`tsx` transpiling-and-running without type-checking, so `tsc` had never
    once actually run against this code with real types present. Once installed, two real type
    errors surfaced and were fixed: `securityHeaders.ts`'s `DEFAULT_FRAME_OPTIONS` was typed in a
    way that let `undefined` leak into a `Record<string, string>`; `prodRequestHandler.ts` (and
    `ssrMiddleware.ts`, same pattern) iterated `URLSearchParams` with `for...of`, which `@types/node`
    and the DOM lib type ambiguously when both are in scope — switched to `.forEach()`. Neither had
    caused an observed runtime bug, but both were real latent type-safety holes this package's
    tooling had never been able to see.
- **Islands hydrate in production too — the two-build pipeline this section originally flagged as
  unimplemented is now done.** `packages/cli/src/build/buildAppClient.ts` runs a real client-mode
  Vite build (only when an app has at least one island — `discoverIslandFiles.ts` scans route source
  for `island()` calls via a filesystem regex, before any build starts) with `build.manifest: true`;
  `packages/cli/src/build/islandsBuildPlugin.ts` is the SSR-build-time counterpart to
  `islandsPlugin.ts`, injecting the manifest-resolved hashed URL instead of a dev `/@fs/` path;
  `buildAppServer.ts` orchestrates client-build-then-SSR-build so the manifest exists in time, and
  writes `dist/server/island-manifest.json` recording the built island-client bootstrap's URL;
  `prodRequestHandler.ts` reads that once at startup and now also serves `/assets/*` (Vite's client
  build always puts hashed output there) as static files. Verified end-to-end against a real running
  `devora start` server: the rendered page's `data-island-url` and hydration `<script src>` are
  both real hashed asset paths (not `/@fs/...`, not a 404), and both were independently fetched and
  confirmed to return real, minified, production-mode JS (no dev/HMR wrapper) with the right
  `Content-Type`.
- **Two real bugs found while wiring this, not anticipated in advance:**
  (1) `discoverIslandFiles.ts`'s regex didn't match `island<{ start?: number }>(...)` — the actual
  syntax `apps/dashboard/routes/index.tsx` uses — because it read raw, untransformed source, while
  the dev/build Vite *plugins* happened to work only because a different plugin (`@vitejs/plugin-react`)
  strips TypeScript generics before their `transform` hook ever saw the code. Discovery silently
  found zero islands until this was traced. Also found: the "does this file even mention `island(`"
  fast-path pre-check in both Vite plugins had the identical blind spot (`island<Props>(` has no
  literal `"island("` substring). (2) Fixed all three by consolidating what had been three separate
  copies of the same regex into one shared `packages/core/src/islandCallPattern.ts` — the duplication
  itself is most of why the discovery copy could quietly disagree with the plugins' copies in the
  first place. See the Vercel/Netlify bullet above for a third bug (static assets never actually
  reaching the deployable output) found once real island assets existed to expose it.
- **What was still not done at the time this item landed** — production build support for
  `ssg`/`csr`/`isr` render modes, since closed by #12 (`"streaming"` remains not implemented,
  deferred to v2). The ~255KB-per-app bloat this section originally flagged as unfixed is now fixed
  (see above) — its root cause turned out not to be "no build step for core" after all, so that
  specific follow-up item is gone, though a compiled `packages/core` remains available on its own
  separate merits (see above).
- **Multi-app N:N risk from doc §13 — since closed, see #13.**
- **Two real bugs found via an actual live Vercel deployment (not local simulation) — the exact
  gap this section had flagged as unverifiable without platform access, now genuinely closed for
  these two.**
  1. `Cannot find package 'react'` at runtime. `bundleForDeploy.ts` deliberately leaves `react`/
     `react-dom` `external` (bundling them inline hits a real esbuild+Node ESM interop failure —
     see that file), on the assumption that "a platform's own dependency tracer already knows how
     to handle ordinary npm packages" — this section's own local isolation testing simulated that
     by hand-placing `react`/`react-dom` in `node_modules`. A real deploy proved the assumption
     false: Vercel's Build Output API v3 only runs its own tracer (`@vercel/nft`) when *Vercel*
     builds your function; handed a function pre-built by this adapter, it uploads exactly what's
     in the function directory and nothing more. **Fix:** `adapter-vercel`/`adapter-netlify`'s
     `writeVercelOutput`/`writeNetlifyConfig` now vendor the real, resolved `react`/`react-dom`
     package directories (recursing into each package's own `dependencies` — `scheduler`,
     `loose-envify`, `js-tokens` for react-dom's tree — not just the two top-level packages; a
     first attempt that copied only `react`/`react-dom` themselves missed these because they live
     as *sibling* symlinks in pnpm's per-package virtual-store folder, not nested inside
     `react-dom`'s own directory) straight into the function's own `node_modules`, dereferencing
     every pnpm symlink into a real file so it survives upload. Re-verified the same way this
     section's local isolation testing always has — copied the generated function to `/tmp`
     (outside any ancestor `node_modules`) and ran a real request against it — except the vendored
     files are now produced by the adapter itself, not hand-placed.
  2. `TypeError: jsxDEV is not a function`, only on `apps/admin`, only on Vercel — never reproduced
     across dozens of local `devora build` runs. Root cause: `devora build` never set
     `process.env.NODE_ENV` itself; it silently depended on the invoking shell/CI already having it
     set to `"production"`. Every local verification in this document happened to export it first,
     masking the gap entirely. `@vitejs/plugin-react` decides dev vs. production JSX transform from
     Vite's resolved `config.isProduction`, which reads `process.env.NODE_ENV` — with it unset (or
     not `"production"`), the SSR build silently emits calls to `jsxDEV` (from
     `react/jsx-dev-runtime`) instead of `jsx`/`jsxs` (from `react/jsx-runtime`). React's own
     production build deliberately ships `exports.jsxDEV = void 0` in `react-jsx-dev-runtime.
     production.min.js` — using the dev JSX runtime in production is considered a build
     misconfiguration by React itself, not something it tries to support — so calling it crashes
     immediately at render time. Vercel sets `NODE_ENV=production` reliably for a function's
     *runtime* (confirmed separately: the session-secret production-throw fired correctly), but not
     reliably for a **custom `buildCommand`**'s build step — this project's `vercel.json` uses one
     specifically to bypass Vercel's zero-config Vite detection (see the adapter section above), so
     it never benefited from whatever `NODE_ENV` handling a recognized framework's default build
     gets. **Fix:** `packages/cli/src/commands/build.ts` now sets `process.env.NODE_ENV =
     "production"` itself, unconditionally, at the top of the command — `devora build` always means
     "build for production," so there's no legitimate case where it should depend on the caller
     remembering this (§2.2 "explicit over implicit"). Re-verified by explicitly *unsetting*
     `NODE_ENV` in the shell before running `devora build --app=admin --adapter=vercel` (reproducing
     the exact condition that broke on Vercel, which no earlier local test had actually done) and
     confirming the built route file calls only `jsx`/`jsxs`, then re-running the same outside-the-
     monorepo isolation test as bug 1 above and getting real rendered HTML back, no crash.
- **A third real bug, this time from an actual live Netlify deploy — `Could not resolve entry
  module "index.html"`, the identical zero-config-`vite build`-detection failure `apps/*/
  vercel.json` already fixed for Vercel, but for a structurally different reason.** `netlify.toml`
  had only ever been written as **build output** by `writeNetlifyConfig` (and correspondingly
  `.gitignore`d, never committed) — but Netlify reads its config *before* running any build command
  at all, so a config that only appears *after* the build finishes was always too late to matter on
  the very build meant to produce it. The dashboard fell back to its own zero-config Vite detection
  instead, which fails outright on this project's shape. Unlike the Vercel case, this needed no
  code fix beyond stopping the mistake — `netlify.toml`'s content (`publish`/`functions`/the SSR
  redirect, plus a `build.command` string) has no build-time-computed values at all, identical for
  every app apart from its name, so it's now a **static, pre-committed file per app** (`apps/*/
  netlify.toml`), the exact role `vercel.json` already plays — generated once by `devora new`/`add`
  (`packages/cli/src/commands/new.ts`) and no longer touched by `devora build --adapter=netlify` at
  all (removed from `writeNetlifyConfig`; `.gitignore`'s blanket `netlify.toml` exclusion removed
  too, while `netlify/` — the real generated functions output — and `.netlify/` — Netlify CLI link
  state — stay ignored, matching the identical split `.vercel/` vs. `vercel.json` already has).
  Verified the config itself is now stable across a real build: hashed `apps/marketing/netlify.toml`
  before and after running `devora build --app=marketing --adapter=netlify`, confirmed byte-
  identical — nothing in the build path touches it anymore, so there's nothing left to race. Also
  surfaced, separately from this bug: **the Netlify site's dashboard had its own Build command
  explicitly set to `vite build` (`commandOrigin: ui` in the build log)** — Netlify's UI-configured
  build settings take precedence over `netlify.toml` when both are present, unlike Vercel (where
  `vercel.json` alone was sufficient without any dashboard change). Committing `netlify.toml` is
  necessary but not sufficient here — the dashboard's Build command / Base directory / Publish
  directory fields also need clearing (Site configuration → Build & deploy → Build settings) so
  Netlify falls through to reading the committed file, or need to be set to match it explicitly.

### 5. CSP/HSTS enforcement — ✅ done
Every response now carries `Content-Security-Policy`, `X-Frame-Options`, and (unless
`security.hsts: false`) `Strict-Transport-Security`, even when an app declares no `security` block
at all — the defaults apply until a dev opts out, not the other way around. `app.config.ts` is now
actually loaded (it wasn't before — nothing read it); `security.csp`/`frameOptions`/`hsts` there
override the defaults per app, per §7. Verified end-to-end: default headers present on
`apps/dashboard` and `apps/admin`; a temporary `security: { frameOptions: "SAMEORIGIN" }` in
`apps/admin/app.config.ts` changed the header on that app's responses (reverted after confirming).
- **Where:** `packages/core/src/securityHeaders.ts` (default values + override resolution),
  `packages/core/src/loadAppConfig.ts` (new — jiti-loads `app.config.ts`, same pattern as
  `loadProjectConfig.ts`), `packages/cli/src/server/securityHeadersMiddleware.ts` (applies headers
  to every response from an app's dev server), wired into `packages/cli/src/commands/dev.ts` ahead
  of the SSR middleware.
- **Defaults chosen, and why:** `default-src 'self'` (blocks injected/inline/eval'd script
  execution — the actual security-critical part, consistent with "no eval anywhere in framework
  internals"); `style-src 'self' 'unsafe-inline'` as a deliberate, documented tradeoff — React's
  `style={{...}}` compiles to an inline `style` attribute, which a strict `default-src` would
  otherwise silently break on every app; `object-src 'none'` and `base-uri 'self'` as standard
  hardening; `X-Frame-Options: DENY`; HSTS with a 2-year max-age + `includeSubDomains`.
- **Known dev-mode-only gap, documented not chased down:** on a true 404 (no route matches), Vite's
  own built-in fallback handler runs after this middleware and overwrites these headers with its
  own (stricter, but not the app's configured values) — confirmed via curl. Only affects `devora
  dev`'s fallback path; once real production serving exists (#4), every response goes through
  Devora.js code, not Vite's handler, and this gap disappears on its own.
- **Not addressed:** no CSP report-only mode / violation reporting endpoint; no nonce/hash support
  for a future inline script (not needed yet — SSR emits no scripts at all until islands, #3, and
  bundled island scripts will be same-origin, already allowed by `default-src 'self'`).

### 6. DB client — ✅ checked, one real issue found, not fixed here
Wired Drizzle + `better-sqlite3` into `packages/backend/db/index.ts` (real schema, real
`INSERT ... ON CONFLICT DO UPDATE`), then reverted — see below. Still throws its original stub
error today, deliberately (§6/§11 — bring your own, don't add one).

**What worked cleanly:** the shape of the integration itself. `db.settings.update(input)` calling
straight through to a real Drizzle client required no framework changes — `ctx.requireAuth()` (#2)
correctly gated the write both before and after the swap, the SSR `action` pipeline (#1) called it
identically, and a real end-to-end flow (login → POST /settings → verified via direct sqlite3
inspection, including that a second write with the same key correctly upserted rather than
duplicated) worked on the first try. The "bring your own ORM" call boundary is not the problem.

**What didn't: a real integration issue, not a hypothetical one.** Partway through testing
(after Vite re-optimized dependencies mid-session — visible in the dev log as "Re-optimizing
dependencies because lockfile has changed"), the dev server crashed outright with a native
assertion failure: `Assertion failed: (env) != nullptr` inside `better-sqlite3`'s native
`Statement` destructor, triggered during V8 garbage collection. Root cause, as far as this spike
went: `db/index.ts` opens the native SQLite handle at module scope; when Vite's SSR module graph
reloads that module (which it does — this is exactly the "loaded fresh per request through
`vite.ssrLoadModule`" design from #1), the old native handle becomes unreachable without ever
being explicitly closed, and its finalizer runs later, during GC, against a Node environment that
may already be torn down from the module's perspective. This is not a `better-sqlite3` bug
specifically — it's a general hazard for **any** ORM/driver with native bindings and a
module-scope singleton connection, under a dev server that reloads SSR modules. A pure-JS driver
(or one that manages its connection lifecycle more defensively, or is designed to be safely
re-instantiated) likely wouldn't hit this; wasn't tested here.
- **Not fixed, deliberately out of scope for a "check":** making native-binding DB drivers safe
  under Vite SSR module reload is real framework-lifecycle work (e.g., a documented pattern for a
  reload-safe singleton, or an app-shutdown/module-dispose hook the framework doesn't have yet) —
  worth a real decision, not something to paper over inside a verification spike.
- **Recommendation if this comes up for real:** either document the module-scope-native-handle
  hazard explicitly for BYO-ORM users (cheapest fix), or investigate Vite's `import.meta.hot.dispose`
  /`server.ws` module-invalidation hooks for a reload-safe connection pattern before v1 ships this
  as a guide.
- **Repo state:** clean — `packages/backend/db/index.ts` and `package.json` are back to their
  original throw-stub/no-extra-deps state; no Drizzle/`better-sqlite3` dependency was left behind.
  Verified by re-running the exact same login → POST /settings flow and confirming the original
  stub error returns.

### 7. SEO primitives — ✅ done
Per-route `meta()` now renders OG tags in addition to title/description (`og:title`/`og:description`
fall back to `title`/`description` automatically — a route needs no changes to get them, an explicit
`og` block only overrides). `sitemap.xml` is served per app, generated from that app's route tree
via the same file-based matcher as routing itself, so it can never drift out of sync with actual
routes. Verified end-to-end: `apps/dashboard`'s sitemap correctly lists `/login` and `/settings`
under its own domain (`app.example.com`); `apps/admin`'s lists only `/bulk-import` under
`admin.example.com`; `apps/marketing`'s root route renders as `https://example.com` (no trailing
slash); `/login`'s rendered `<head>` shows title, description, and og:title/og:description/og:type
all correctly falling back or overriding as designed.
- **Where:** `packages/core/src/html.ts` (OG tag rendering), `packages/core/src/sitemap.ts` (XML
  generation), `packages/core/src/router.ts`'s new `listRoutePaths` (reuses the same file-scanning
  logic `matchRoute` uses, so sitemap and routing can't disagree with each other), wired into
  `packages/cli/src/server/ssrMiddleware.ts` at `/sitemap.xml`, generated fresh per request (no
  build step exists yet to generate it once).
- **Opt-in per app, resolved:** `sitemap.xml` generation is gated by `sitemap: true` in
  `app.config.ts` (`AppRuntimeConfig.sitemap`, default `false`/off). Deliberately opt-in rather than
  opt-out — a safer default: a newly scaffolded internal app stays unlisted with zero extra config,
  and only a public-facing app has to remember to turn it on, not the other way around.
  `apps/marketing` (the one actually-public app) has `sitemap: true`; `apps/dashboard` and
  `apps/admin` don't. Verified: marketing's `/sitemap.xml` returns 200 with real content;
  dashboard's and admin's both 404.

### 8. `devora` CLI bin — ✅ done
`pnpm exec devora dev/build/start` all work now, with zero `tsx` anywhere in the invocation.

Two compounding bugs, both reproduced directly before fixing anything: (1) pnpm never linked the
`devora` bin into any `node_modules/.bin` at all — no workspace package (including the root) ever
declared `@devorajs/cli` as a dependency, which is what pnpm requires to link a workspace bin; fixed
by adding it to root `devDependencies`. (2) Even a linked bin failed under plain Node with
`ERR_MODULE_NOT_FOUND`: `packages/cli/src/index.ts`'s relative imports use `.js` specifiers over
`.ts` sources (`./commands/dev.js`, no such file on disk) — plain Node's native TS handling doesn't
remap `.js` → `.ts` the way `tsx`/`ts-node` do.

**A third, undocumented issue found while fixing this, not anticipated in advance**: fixing only
`packages/cli` isn't enough. `@devorajs/core`'s and every `@devorajs/adapter-*` package's `exports`
field *also* points at raw `.ts` source (needed so Vite/`tsx` resolve them live during development) —
so even a correctly-compiled CLI entry would immediately fail again the moment `dev.ts`/`build.ts`/
`start.ts` import them. Repointing those packages' `exports` at compiled output was ruled out (would
silently stop reflecting local source edits until a manual rebuild — a real DX regression for the
packages actively being developed). Instead: `packages/cli/build.mjs` bundles the whole CLI with
`esbuild` — the exact technique `adapter-vercel`/`adapter-netlify`'s `bundleForDeploy.ts` already
uses and this codebase already trusts for the identical "raw workspace `.ts` exports are unresolvable
by plain Node" problem — inlining every workspace-local package while keeping real npm packages
(`commander`, `vite`, `esbuild`, `jiti`) external and resolvable from `packages/cli`'s own
`node_modules` (confirmed empirically that none of those four are resolvable from a plain-Node
import otherwise). `react` is deliberately *not* external — it's pulled in only transitively via
`@devorajs/core`'s barrel and isn't a declared dependency of `packages/cli` itself, so marking it
external would leave an unresolvable bare specifier; bundling it in is correct and cheap (confirmed
by inspecting the real bundled output, not assumed).
- **Where:** `packages/cli/build.mjs` (new), `packages/cli/package.json` (`"bin"` → `"./dist/
  index.js"`, new `esbuild` devDependency, `"build"`/`"prepare"` scripts — the latter means a fresh
  `pnpm install` produces `dist/` automatically, confirmed by deleting `dist/` and re-running
  `pnpm install`), root `package.json` (`"@devorajs/cli": "*"` devDependency).
- **Verified end-to-end, not just "it builds":** fresh `pnpm install` → `node_modules/.bin/devora`
  exists → `pnpm exec devora --help`/`dev --app=dashboard`/`build --app=dashboard` (no adapter — the
  specific case that would fail without inlining the adapter packages)/`build --app=dashboard
  --adapter=vercel`/`--adapter=netlify`/`start --app=dashboard`, all producing output identical to
  the already-verified `tsx`-driven behavior (real SSR content, real Vercel/Netlify output written).
- **Not addressed:** whether a real end user's `pnpm add -D @devorajs/cli` (installing this as a
  published package rather than a workspace member) behaves identically — untested, since this
  package has never been published; the `prepare` script is the mechanism that would matter there.

### 9. `clientOnly()` verification — ✅ done
Per architecture-v1.md §9, `clientOnly()`'s actual documented promise is "no server-side execution,
no `window is not defined` crash" — not "renders SSR content." The existing implementation
(`packages/core/src/serverFn.ts`) already matched that exactly; what was missing was ever exercising
it for real. **Decision: don't add a fallback/placeholder-rendering feature** — that would be scope
creep past the documented contract. Shipped the verification as final v1 behavior instead.
- **Where:** new `apps/dashboard/components/BrowserOnlyWidget.tsx` — its **module scope** (not just
  render body) reads `window.innerWidth`, so merely *importing* it server-side throws; a component
  that only touched `window` inside render/effect would prove nothing about `clientOnly()`
  specifically, since nothing calls render() server-side for a module never imported in the first
  place. Wired into `apps/dashboard/routes/index.tsx` via `clientOnly(() => import(...))`, invoked
  from a `useEffect` (the primitive has no React integration of its own — the caller mounts the
  result manually, exactly as designed).
- **Verified with a real negative control, not just a positive check:** confirmed the SSR response
  is a clean 200 with an empty widget slot in dev *and* a real `devora build && devora start`
  production server; then temporarily removed the `clientOnly()` wrapper (a static import instead)
  and confirmed the dev server genuinely crashes — `ReferenceError: window is not defined` at the
  exact module-scope line — before restoring the real implementation. Proves the primitive is doing
  real work, not just that nothing happened to break.

### 10. Redirects, login/logout, CSRF, `Secure` cookie — ✅ done
Sessions were already real (#2); this closes the gaps flagged as deliberately out of that slice.

**(a) Redirect-from-action, a real prerequisite gap:** before this, `renderRoute()` always returned
`{ status: 200, html }` no matter what an `action` did — there was no way for `login.tsx` to avoid
re-rendering its own form with a 200 after a successful login. New `packages/core/src/
actionResult.ts` (`redirect(to)`/`isRedirectResult()`); `renderRoute.ts` checks for this after
`action` runs and, if found, skips `loader`/rendering entirely and returns a real 302 + `Location`
(both `ssrMiddleware.ts` and `prodRequestHandler.ts` updated to send it).

**(b) Login UI + a real, previously undocumented bug closed:** `apps/dashboard/routes/login.tsx`
now redirects to `/` on success and makes its demo-only nature visible in the rendered copy itself,
not just a code comment. **`apps/admin` (`auth: "isolated"`, its own `devora_session_admin` cookie/
secret per `devora.config.ts`) had no login route anywhere** — meaning `bulk-import.tsx`'s
`ctx.requireAuth()` was permanently unsatisfiable; nothing could ever call `ctx.setSession()` for
that cookie namespace, and dashboard's login route can't serve it (different cookie name/secret
entirely, by design). New `apps/admin/routes/login.tsx` fixes this for real. `bulk-import.tsx` also
previously had no `action` at all — `bulkImportUsers` was defined but never called by anything; a
real `action` was added so the fix is actually exercisable, not just structurally present.

**(c) `/logout`, ordinary file-based routes, no special-casing:** new `apps/{dashboard,admin}/
routes/logout.tsx` — the only genuinely special-cased path anywhere in this codebase's request
handlers is `/sitemap.xml`; logout needed no new wiring. POST-only forms, deliberately never a bare
`<a href="/logout">` — a GET-triggered logout is itself a CSRF-adjacent footgun (any third-party
page could fire it via `<img>`/navigation).

**(d) CSRF, following the existing ad hoc-per-route convention, not new middleware:** this codebase
has no middleware/route-protection layer anywhere — every check (`ctx.requireAuth()`) is called
inline by whichever route needs it. CSRF follows the identical shape: new `packages/core/src/
csrf.ts` (`generateCsrfToken()`/`verifyCsrfToken()`, `timingSafeEqual`-based like `session.ts`'s
existing tamper check, plus a `CsrfField` component), a new `ctx.verifyCsrf(formData)` method
(throws on mismatch, like `requireAuth()`), applied to `login.tsx`/`logout.tsx` (both apps) and
`settings.tsx`'s action. The token is embedded server-side into the rendered form — no client JS
ever reads the cookie — so unlike the textbook double-submit-cookie pattern, the CSRF cookie stays
`HttpOnly` with no downside. `session.ts`'s `createRequestContext` now resolves/generates this
cookie alongside the session one; `getSetCookie()` became multi-cookie-capable (`string[] |
undefined`) since a response can now carry two `Set-Cookie` headers.

**(e) `Secure` cookie, a real gap:** `session.ts` never set `Secure`, even in production. Fixed via
one shared `buildCookieAttributes()` helper (reused by session and CSRF cookies) appending `;
Secure` only when `NODE_ENV === "production"` — unconditional would silently break dev over plain
HTTP, since browsers drop `Secure` cookies sent over `http://`.
- **Where:** `packages/core/src/actionResult.ts`, `csrf.ts` (both new); `session.ts` (cookie
  attributes, CSRF integration); `serverFn.ts` (`RequestContext.verifyCsrf`); `route.ts` (`action`'s
  return type, `default`'s `csrfToken` prop); `renderRoute.ts` (redirect + csrfToken threading);
  `ssrMiddleware.ts`/`prodRequestHandler.ts` (redirect handling, multi-cookie `Set-Cookie`);
  `apps/{dashboard,admin}/routes/login.tsx`, `logout.tsx` (new), `bulk-import.tsx`, `settings.tsx`.
- **Verified end-to-end, both apps:** full login → CSRF-protected authenticated action → logout
  cycle on dashboard *and* admin (closing the confirmed bug — `bulk-import` reachable for the first
  time); wrong/missing CSRF token correctly rejected at each protected action; tampered-cookie
  rejection (#2's original test) still passes unchanged; no `Secure` attribute in dev, confirmed
  present via a real `devora start` with `NODE_ENV=production`.
- **Not addressed:** still no real credential check (bring-your-own per §6/§11, unchanged, by
  design) and no rate limiting on login attempts — not in v1 scope either way.

### 11. `entry-server.tsx` de-duplication — ✅ done (pure refactor, prerequisite for #10/#12)
`apps/{admin,dashboard,marketing}/entry-server.tsx` were confirmed byte-for-byte identical via
`diff` — not "probably identical." Only the `createElement`/`renderToString` injection genuinely
needs to be per-app (so `react-dom/server` resolves against that app's own `node_modules`, per
Vite's own SSR guide pattern); everything else was portable and now lives once in new `packages/
core/src/renderRoute.ts` (`createRenderRoute()`, `resolveRenderMode()`, plus `createRenderStatic()`
added for #12). Each app's file shrank to a 4-line shim. Done first, ahead of #10 and #12, because
both add real logic to this exact code path — writing it once instead of three times, then
squashing, avoided doing the real work three times over.
- **Verified as a pure refactor:** re-ran every existing #1/#2/#3/#7 end-to-end check (SSR content,
  settings action reaching the DB-stub error, login cookie, tampered-cookie rejection, admin
  bulk-import rendering, marketing's then-404ing `ssg` route, islands hydrating in dev and
  production, sitemap/OG output) and confirmed byte-identical results before building #10/#12 on
  top of it. A later stack trace (`at Module.renderRoute (packages/core/src/renderRoute.ts:64:25)`)
  during #10's testing incidentally confirmed the shared helper really is in the live call path, not
  just present and unused.

### 12. Render modes: `ssg`, `csr`, `isr` real; `streaming` explicitly deferred to v2 — ✅ done
Before this, `RenderMode`'s full union (`"ssr"|"ssg"|"csr"|"streaming"|"isr"`) was fully typed
end-to-end (`RouteModule.renderMode`, `AppRuntimeConfig.defaultRenderMode`) but only interpreted as
a negative check (`!== "ssr"` → 404) — nothing partially built for any of the other four modes.

**`streaming`: explicit deferral, not a silent drop.** The island two-pass render
(`IslandCollectorContext`: collect pending `island()` promises, await them, re-render) fundamentally
assumes a synchronous second `renderToString` call is possible — `renderToPipeableStream`/
`renderToReadableStream` don't support "render twice." Making streaming work needs a
Suspense-boundary-based island rewrite, real v2-sized architectural work `islandComponent.tsx`'s own
doc comment already flagged as the not-yet-built alternative. `renderMode: "streaming"` still 404s
honestly, unchanged.

**`AppRuntimeConfig.defaultRenderMode` was dead config, now wired through.** Set in `apps/marketing/
app.config.ts` (`defaultRenderMode: "ssg"`) since early in this project but never actually read by
any consumer — `dev.ts`/`start.ts`/`build.ts` only ever forwarded `security`/`sitemap` downstream.
Now threaded through `createSsrMiddleware`/`createProdRequestHandler`/`writeVercelOutput`/
`writeNetlifyConfig` into `resolveRenderMode(routeModule, appDefault)`. New `apps/marketing/routes/
about.tsx` has no explicit `renderMode` export at all — proves inheritance actually works, not just
the already-existing explicit-per-route case (`index.tsx`).

**`ssg`** (built first — prerequisite for `isr`): new `packages/cli/src/build/buildAppStatic.ts`
runs after `buildAppServer.ts`, importing each built route module and, for one resolved to `ssg`/
`isr`, rendering it with a new build-time `ctx` stub (`packages/core/src/buildTimeContext.ts` —
`requireAuth`/`setSession`/`clearSession`/`verifyCsrf` all throw "not available at build time") and
writing HTML to `dist/static/<route>/index.html`. An `ssg`/`isr` route exporting `action` is a
build-time error (actions never run for either mode) — same guard duplicated (deliberately, it's
three lines) in `ssrMiddleware.ts` for dev's live-render path. `prodRequestHandler.ts` serves a
matched `ssg` route straight from that static file, skipping `renderRoute` entirely; a route
resolved to `ssg` with no static file present (e.g. build ran before the route existed) 404s
honestly rather than crashing. **Dev never serves pre-rendered output, on purpose** — `ssg`/`isr`
render live per request in dev (same reasoning `/sitemap.xml` is generated fresh per dev request,
no build step exists to generate it once) — only a real `devora build && devora start` exercises
"rendered once, cached" semantics. Verified: repeated production requests return byte-identical
HTML; a temporary loader-side call counter confirmed the loader runs exactly once at build and never
again across three repeated production requests (removed after confirming); dev's live-render
confirmed by watching the same route's timestamp change on every dev request; `about.tsx`'s
inherited `ssg` confirmed.

**`csr`**, scoped tightly (no new server/client data protocol — architecture-v1.md §5 already rules
that out for v1): a `csr` route never runs `loader` anywhere, server or client — data fetching is
the component's own job (`useEffect`+`fetch`, or `clientOnly()`, #9). Server returns a minimal shell
via new `packages/core/src/csrRoute.ts` (`meta()` still runs, for whatever SEO value remains
possible); a new generic `apps/*/csr-client.tsx` bootstrap (mirrors `island-client.tsx`'s pattern —
one file handles every `csr` route in an app) mounts the real component client-side via a
`data-csr-entry` URL marker. New `packages/cli/src/build/discoverCsrRouteFiles.ts` (regex scan for
`renderMode = "csr"`, same approach `discoverIslandFiles.ts` already uses for `island()` calls);
`buildAppClient.ts` generalized to bundle both island and csr-route files in one client build pass
(an app using only one, or neither, pays for only what it uses); new `dist/server/csr-route-
manifest.json` maps each csr route's build key to its real hashed asset URL, read once per request
in production (no build-time bake-in needed, unlike islands — a csr route's server side never
renders the actual component, so there's nothing to embed a URL into ahead of time). Verified: dev
serves a real `/@fs/<path>` shell + `/csr-client.tsx`; production serves real hashed URLs, both
independently fetched and confirmed (see the bug below) to actually contain the component's code.

**A real, previously undiscovered bug found and fixed while verifying `csr` in production, not
anticipated in advance:** the built csr-route and island chunks in `dist/client` were **silently
missing their `default` export entirely**. Confirmed directly — not assumed from a passing
content-type check, which is all earlier island verification had actually done — by `import()`-ing
a real built chunk in plain Node and finding `{ default: undefined }`; grepping the chunk's own
content confirmed the component's actual code (JSX text, `useState` calls) wasn't merely misplaced,
it was gone from the entire client build output. Root cause: Rollup's default
`preserveEntrySignatures` ("exports-only") does not reliably protect an entry's exports from
tree-shaking when nothing in the *same build's static graph* references them — true of every island
and csr entry here, since each is only ever reached via a browser's own runtime `import(url)` to a
URL outside that graph, never a static import Rollup can see. Reproduced in isolation (a throwaway
single-entry build of just `Counter.tsx` also dropped its export) before confirming the fix:
`preserveEntrySignatures: "strict"` in `buildAppClient.ts`'s `rollupOptions`, which forces Rollup to
treat every entry's exports as used regardless of the static graph. Re-verified after the fix by
`import()`-ing the real rebuilt chunks and confirming `typeof mod.default === "function"` for both
an island and a csr route, plus the component's real JSX text now present in the chunk.
**This means #3's/#4's earlier "production island hydration verified" claim was incomplete** — it
checked the resolved URL and content-type/status code, never the actual export shape; islands
happened to still work in practice only because nothing had tried a build shaped enough to trigger
this specific tree-shaking behavior (or, more likely, had simply never checked). Genuinely fixed and
re-verified now, with the additional import-shape check folded into how this kind of thing gets
verified going forward.

**`isr`** (built on `ssg`'s pre-render mechanics): `RouteModule` gains `revalidate?: RevalidateConfig`
(the `{ seconds }` shape already existed in `config.ts`, just never attached to the route contract —
a route now writes `export const revalidate = { seconds: 3600 };`, matching architecture-v1.md §5's
documented syntax exactly). New `packages/core/src/isrCache.ts`: a disk-backed cache (literal files
under `dist/static/<route>/`, doubling as both `ssg`'s build output and `isr`'s initial cache entry
— not a separate mechanism), `isStale()`, and an explicit `revalidatePath()` (deletes the cached
entry, letting the next request's normal staleness check regenerate it — one code path renders an
`isr` page, not two slightly-different ones). On a stale request, `prodRequestHandler.ts` blocks and
synchronously re-renders (simpler and more deterministic than stale-while-revalidate for v1 — a
documented possible v2 enhancement, not silently dropped), overwriting the cache. Verified with a
`revalidate: { seconds: 5 }` demo route (`apps/marketing/routes/isr-demo.tsx`): immediate repeated
requests return the identical cached timestamp; a request after the 5-second window regenerates
(new timestamp, confirmed via the cache file's own updated content) then serves that new value from
cache again on the next immediate request.
- **Explicit scope boundary, not silently assumed away:** `isr`'s disk cache fits `adapter-node`'s
  long-lived process naturally (fully verified there). A Vercel/Netlify function's filesystem isn't
  guaranteed to persist or be shared across invocations — `writeVercelOutput`/`writeNetlifyConfig`
  now copy the build's initial `dist/static` output into both the deployable function directory
  (so an `isr` page at least serves its build-time value) and the platform's static-hosting
  directory (so `ssg` pages can be served as plain static files with zero function invocation at
  all, the same reasoning island assets already get this treatment) — but ongoing `isr` regeneration
  on either platform is explicitly unverified, mirroring exactly how #4 already treats `adapter-node`
  differently from the serverless adapters for the same underlying reason (no platform access here).
- **Where:** `packages/core/src/isrCache.ts`, `buildTimeContext.ts`, `csrRoute.ts` (all new);
  `route.ts` (`revalidate` field); `router.ts` (`routeFileToPath`, new); `html.ts` (`csrScriptUrl`,
  `escapeHtml` exported); `renderRoute.ts` (`createRenderStatic`, shared `renderPage`);
  `prodRequestHandler.ts`/`ssrMiddleware.ts` (mode dispatch); `packages/cli/src/build/
  buildAppStatic.ts`, `discoverCsrRouteFiles.ts` (new); `buildAppClient.ts`/`buildAppServer.ts`
  (csr manifest, `preserveEntrySignatures` fix); `dev.ts`/`start.ts`/`build.ts` (defaultRenderMode
  threading); `adapters/adapter-{vercel,netlify}/src/index.ts` (static output copying,
  `defaultRenderMode` param); `apps/marketing/routes/{about,isr-demo}.tsx`, `apps/dashboard/routes/
  csr-demo.tsx`, `apps/*/csr-client.tsx` (all new demo/bootstrap files).

### 13. Multi-app-aware Vercel/Netlify — ✅ done (orchestration + link-detection verified for real; the actual authenticated deploy is the one thing that can't be)
Before this, `devora build --adapter=vercel|netlify` already looped over every app in
`devora.config.ts` and wrote each one's build output, but confirmed by direct inspection: that
produced N completely independent, uncoordinated `.vercel/output`/`netlify/functions` directories —
nothing tied them together, nothing tracked which platform project/site each app belonged to, and no
command anywhere actually triggered a deploy. `AppConfig` (`packages/core/src/config.ts`) had no
project/site-identity field of any kind. Confirmed via repo-wide grep: zero mentions anywhere of
`project.json`, `siteId`, `orgId`, `VERCEL_TOKEN`, or `NETLIFY_AUTH_TOKEN` before this — a clean
slate, nothing partial to build on or conflict with.

**Real-world constraint, confirmed before designing anything:** both platforms require one platform
*project* (Vercel) or *site* (Netlify) per independently-deployed app — inherent to how the
platforms work, not something their Build Output/Frameworks APIs can bypass — and neither platform's
own CLI has a native "deploy N projects from one repo in one command" primitive. `vercel deploy` and
`netlify deploy` are each single-project/single-site per invocation. Coordinating N deploys is
necessarily an orchestration layer this framework has to build on top, not something either platform
provides.

**Decision: don't invent devora-specific project/site-identity config.** Rather than adding
`vercelProjectId`/`netlifySiteId` fields to `AppConfig`, this relies on each platform's own native
linking convention — a real user runs `vercel link`/`netlify link` once per app directory (standard
practice for monorepos on both platforms already), which writes `<appRoot>/.vercel/project.json` /
`<appRoot>/.netlify/state.json`. Devora's job is detecting that and orchestrating the repeated
deploy step across every app, not reinventing platform auth/project management — "bring your own
linked project," the natural extension of this framework's existing "bring your own auth/DB/ORM"
stance (§6/§11).

**New command: `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]`.** For each app (or
just the filtered one): rebuilds it fresh via the exact same pipeline `devora build` uses (extracted
into a new shared `packages/cli/src/build/buildForAdapter.ts`, used by both `build.ts` and
`deploy.ts` — a pure refactor of `build.ts`'s existing per-app loop body, verified to produce
identical output before/after), checks whether that app's directory is linked
(`isVercelLinked`/`isNetlifyLinked`, new in each adapter package's own `deploy.ts`, mirroring the
existing `bundleForDeploy.ts` per-package pattern rather than a shared package — same
small-enough-not-to-need-one reasoning already used there), and if so shells out to the real
platform CLI via `npx` (`vercel@latest deploy --prebuilt [--prod]` / `netlify-cli@latest deploy
--dir=dist/client [--prod]`, both invoked with Node's `child_process.spawn(..., { cwd: appRoot })` —
a `cwd` execution option, not a per-CLI flag, so one invocation shape works uniformly for both
tools). `npx` specifically so no global install is required — matches this framework's own
CLI-bin story (no global install needed there either). An app that isn't linked gets skipped with a
clear one-line instruction (`cd apps/<name> && vercel link`), not silently ignored or hard-failed —
"not linked yet" is the normal state for a freshly scaffolded app, not a failure, when deploying
broadly. One app's failure doesn't abort the rest — each app's build+check+deploy is wrapped in its
own try/catch, and a final summary reports deployed/skipped/failed per app. Exit code: non-zero if
anything actually failed, or if a single explicitly-`--app`-requested app didn't deploy (nothing
happened at all, a real failure in that narrower case) — but not merely for "some apps aren't linked
yet" when deploying broadly, since that's expected.

**Verified for real, not assumed — the exact same discipline the original adapter work
(`ROADMAP.md` #4) already established for what can and can't be checked without platform access:**
- `devora deploy --adapter=vercel --app=dashboard` with no `.vercel/project.json` present → confirmed
  it builds, prints the link instruction, and exits 1 **without invoking `vercel` at all** (no
  network activity, no CLI download).
- `devora deploy --adapter=vercel` with no `--app`, no app linked → confirmed a clean summary (3
  skipped, 0 deployed, 0 failed) and exit 0.
- A fake `.vercel/project.json` (dummy `projectId`/`orgId`) written into `apps/dashboard` →
  confirmed `isVercelLinked` now returns true and the command genuinely invokes the real Vercel CLI
  via `npx` (downloaded and ran Vercel CLI 59.11.7 for real) — which correctly failed with
  `Error: No existing credentials found` (a real Vercel authentication error, not a devora crash),
  proving the wiring reaches the real external tool correctly. Exact same test repeated for Netlify
  with a fake `.netlify/state.json` → real Netlify CLI invoked, failed with `Error: Authentication
  required. NETLIFY_AUTH_TOKEN is not set` — same proof, other platform. Both `npx vercel --version`
  and `npx netlify-cli --version` were independently confirmed invocable without any account before
  designing around them, not assumed.
- Full regression pass afterward: `devora build`/`devora build --adapter=vercel`/`--adapter=netlify`
  (with and without `--app`) all still produce identical output to before the `buildForAdapter.ts`
  extraction; `devora dev`/`devora start` (adapter-node, untouched by this work) still work. All
  fake link files and build artifacts cleaned up afterward.
- **What genuinely can't be verified here, stated explicitly rather than assumed:** an actual
  authenticated deploy succeeding end-to-end (needs a real Vercel/Netlify account + token — the
  same irreducible boundary #4 already documents for the underlying build output itself). Domain
  auto-binding (`vercel domains add <app.domain>` using the domain already declared in
  `devora.config.ts`) was deliberately **not** built in this pass — a real external side effect on
  the user's account that can't be verified without one; flagged as a natural, separately-scoped
  follow-up rather than silently added or silently ignored.
- **Where:** `packages/cli/src/build/buildForAdapter.ts` (new), `packages/cli/src/commands/
  build.ts` (now a thin loop calling it), `packages/cli/src/commands/deploy.ts` (new),
  `adapters/adapter-{vercel,netlify}/src/deploy.ts` (new, re-exported from each adapter's
  `index.ts`), `packages/cli/src/index.ts` (`deploy` command registration).

### 14. Three more environments tried for real — Docker, a bare VPS (nginx/Caddy), CI — ✅ done
Following real, live Vercel and Netlify deployments (see #4 and its "real Vercel AND Netlify
deployment" bugs), the natural next question was what else this actually runs on. Three concrete
targets, all exercised for real, not just written and assumed:

- **Docker** — `Dockerfile` + `docker-compose.yml`, one `adapter-node` process per container (this
  project's own one-process-per-app model, §13). Unlike Vercel/Netlify's Build Output/Frameworks
  APIs, Docker has no "hand it a pre-built function" constraint — a real `pnpm install` inside the
  image resolves `react`/`react-dom` normally, so none of #4's vendoring workaround is needed here
  at all. Verified: built and ran both an `auth: "none"` app (marketing — real content, zero env
  vars) and an `auth: "shared"` one (dashboard — full login → `requireAuth()` → logout → CSRF →
  tampered-cookie regression re-run inside a real running container, including confirming the
  `Secure` cookie attribute is present, proving `NODE_ENV=production` is genuinely active at
  container runtime); `docker compose up` with all three services confirmed running concurrently
  with correct, distinct content on their mapped ports and no collisions, including admin's isolated
  cookie (`devora_session_admin`) working correctly alongside the other two. **A real bug found
  building this, not anticipated in advance:** `.dockerignore`'s `**/dist` exclusion (needed to keep
  real build output out of the image context) also silently excluded the *committed*
  `packages/cli/dist/index.js` that the Dockerfile's own build stage runs — fixed with an explicit
  `!packages/cli/dist`/`!packages/cli/dist/index.js` exception, the identical pattern `.gitignore`
  already carries for the same file and the same reason. **A second real bug:** the base image's
  `corepack enable` with no version pin grabbed pnpm 12 (latest at build time), which failed with
  `ERR_PNPM_IGNORED_BUILDS` — a newer default-deny on install scripts (esbuild's, among others) that
  pnpm 9.9.0 (what this project has actually been developed and verified against everywhere else)
  doesn't have. Fixed with `corepack prepare pnpm@9.9.0 --activate` **inside the Dockerfile only** —
  deliberately not via root `package.json`'s `"packageManager"` field, which stays removed for the
  Yarn/corepack compatibility reasons already documented above in this same file.
- **Bare VPS (nginx/Caddy)** — `devora generate:proxy --target=nginx|caddy` existed already but had
  never been run against a real proxy binary, only had its output file inspected. **A real,
  previously unnoticed bug found before writing any verification code**: it synthesized each app's
  port starting at `4000`, completely independently from `start.ts`'s own `4173` default — so
  following the exact documented workflow (`devora start` then `devora generate:proxy`) produced a
  config pointing at ports nothing was actually listening on. Fixed with one shared function
  (`packages/cli/src/build/portScheme.ts`, `assignPorts()`), used by both commands, keeping
  `start.ts`'s existing single-`--app`-with-explicit-`--port` override behavior byte-for-byte
  unchanged (verified directly: both the multi-app sequential-port path and the single-app literal-
  port path re-tested and confirmed identical to before). Also added an nginx TLS note (previously
  `listen 80` with no HTTPS story of any kind, or even a pointer to one) — a short comment directing
  to `certbot --nginx -d <domain>` as the real next step, not a fabricated commented-out cert block
  with made-up paths, since automating real ACME issuance needs a real DNS-resolving domain this
  environment doesn't have. Verified for real: installed `nginx`/`caddy` locally (via `brew`), ran
  `devora start` for all three apps, installed the generated `nginx.conf` into a real local nginx
  instance, and confirmed — via `Host` header, no real DNS needed — that each of the three domains
  correctly routes to distinct, correct per-app content, not just a 200; separately ran `caddy
  validate` against the generated `Caddyfile` and confirmed it's valid and correctly plans automatic
  HTTPS + HTTP→HTTPS redirect. A new `deploy/devora.service` systemd unit template (plus a `pm2`
  one-liner in its own comments) covers process supervision — explicitly **not** verified against a
  real systemd host, stated plainly rather than assumed to work.
- **GitHub Actions CI** — new `.github/workflows/ci.yml`: installs under all three package managers
  (pnpm/npm/yarn — the exact cross-manager matrix already verified by hand elsewhere in this
  project), then, using the pnpm leg, runs a real `devora build` for every app under **all three**
  targets (plain, `--adapter=vercel`, `--adapter=netlify`) — deliberately the same build sequence
  that would have caught this session's three real deploy bugs (missing `react`/`react-dom` in the
  Vercel function, `devora build` silently depending on the caller's `NODE_ENV`, `netlify.toml` only
  ever existing as build output — all documented above in #4) before a push, not after. Every
  individual command in the workflow was re-run locally against this repo's current state before
  being placed in the YAML. **What can't be verified here:** an actual GitHub Actions run — no `gh`
  CLI or runner access in this environment, needs a real push, the identical boundary already
  documented for an authenticated Vercel/Netlify deploy.
- **Where:** `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deploy/devora.service` (all new,
  repo root/new `deploy/` dir); `packages/cli/src/build/portScheme.ts` (new), `packages/cli/src/
  commands/start.ts` and `generate-proxy.ts` (both updated to share it); `.github/workflows/ci.yml`
  (new). See `README.md`'s "Running in Docker", "Self-hosting on a VPS", and "GitHub Actions CI"
  sections for the practical how-to.

## Explicitly not roadmap items (see architecture-v1.md §11)

Re-listing so scope creep during the above work gets caught early:
- Real-time/live-query sync engine
- Built-in ORM, auth provider, or file storage
- React Native / Tauri targets
- Formal third-party security audit / signed provenance
- Custom RSC-style server/client serialization protocol
- AWS/Cloudflare/Docker-specific adapters, or hosting infrastructure of our own

If work on #1–#12 starts pulling in any of these, stop and flag it rather than absorbing it quietly.

## Suggested sequencing

```
#1 SSR handler — done
 ├─→ #2 Request context (auth/session) — done
 ├─→ #3 Islands (Vite plugin) — done, dev AND production (real client-build+manifest pipeline)
 ├─→ #4 Adapters (copy real output) — all three done and run correctly in isolation, verified;
 │     │  only the actual Vercel/Netlify platform deploy itself is unverified (no platform access)
 │     └─→ #13 Multi-app deploy orchestration — done (link-detection + real CLI wiring verified)
 ├─→ #5 CSP/HSTS enforcement — done
 └─→ #7 SEO primitives (meta + sitemap) — done

#6 DB client — done: real integration check, found a genuine native-binding/SSR-reload hazard,
   documented, reverted cleanly (see above)

#8 CLI bin — done, independent of the above
#9 clientOnly() verification — done, independent of the above
#11 entry-server.tsx de-dup — done, prerequisite for #10 and #12 (both edit this exact logic)
 ├─→ #10 Redirects/login/logout/CSRF/Secure cookie — done
 └─→ #12 Render modes: ssg/csr/isr done, streaming explicitly deferred to v2
```

All thirteen items have real work behind them now, including several that started as partial and
were closed in later passes: #3's production hydration (and, discovered while verifying #12, a real
`preserveEntrySignatures` bug meaning that "done" claim was previously incomplete — see #12), #4's
~255KB-per-app bundle bloat and dependency-resolution gap for the generated Vercel/Netlify functions
(closed via real `esbuild` bundling, verified by running the actual generated function completely
outside this repo), and #4's own multi-app N:N risk (closed by #13). What's left is depth, not
breadth — see each section above for the specific "not done" / "not verified" boundaries. Two things
remain genuinely irreducible without resources this environment doesn't have: an actual authenticated
Vercel/Netlify deployment (#13's orchestration layer and link-detection are verified for real; the
deploy itself, and specifically whether their real dependency tracers behave the way this document's
manual simulation assumed, is not), and `isr`'s regeneration reliability on a serverless function's
non-persistent filesystem specifically (#12). #6's native-driver SSR-reload hazard is the other real,
documented-not-fixed gap. `"streaming"` is the one deferred render mode, deliberately (#12) — real
v2-sized architectural work, not a small addition. Domain auto-binding for a deployed app
(`vercel domains add`/equivalent) is a deliberately out-of-scope follow-up from #13, not silently
dropped. None of these are silent; each is written down with what was actually tried.

This matches CLAUDE.md's suggested first task (the SSR handler) and gives the reason why: it was
the single node with the most out-edges in this graph.

## Pre-publish cleanup (before this repo went public on GitHub)

Not a v1 roadmap item — a one-time checklist run once the framework itself was otherwise done,
before making the repo public. Recorded here since it included a real, repo-wide rename.

- **Secrets scan** — clean. Grepped for hardcoded API keys/tokens/passwords, known real-world token
  formats (AWS/GitHub/Stripe/Slack/Google), email addresses, real (non-`example.com`) domains,
  hardcoded IPs beyond `127.0.0.1` (only in `generate-proxy.ts`'s legitimate reverse-proxy template),
  personal absolute paths, and `package.json` author/email fields. No `.env` file exists (nothing to
  have leaked). `.npmrc` only sets `link-workspace-packages=true`, no token. Nothing found.
- **`LICENSE`** — MIT, matching React/Next.js/Vite.
- **`.env.example`** — new, documents every env var the framework actually reads (grepped
  `process.env` across `packages/core`/`packages/cli`/`adapters` — only `session.ts` reads any:
  `DEVORA_SESSION_SECRET`, `DEVORA_SESSION_SECRET_<APP>`, and `NODE_ENV`).
- **`.gitignore`** — real gap found and fixed: no `.env` exclusion existed at all before this (the
  existing `node_modules/`/`dist/`/`.vercel/`/`.netlify/` patterns were already correct at any
  depth in the monorepo — no leading/internal slash, so git already applied them repo-wide;
  confirmed against gitignore's own documented matching rules, not assumed). Added `.env`/`.env.*`
  (with `!.env.example` to keep the template committed) and `.DS_Store`.
- **`@project/*` → `@devorajs/*` rename** — `@project/core` and `@project/backend` renamed to
  `@devorajs/core`/`@devorajs/backend` across every `package.json`, every import (61 files), and all
  four docs (a genuine deviation from this project's own "packages/core is user-space, only
  cli/adapters are framework-branded" assumption from earlier in this document — re-examining
  `packages/core/src` directly showed it's 100% framework internals now — router, session, CSRF,
  render pipeline, branding/theme — not user business logic; `packages/backend` and every scaffolded
  app correctly stayed `@project/*`, since those genuinely are meant to be user-owned). Regenerated
  `pnpm-lock.yaml` from scratch; full regression pass after — `dev`/`build`/`build --adapter=vercel`/
  `--adapter=netlify`/`start`/`deploy`/`add`/`remove`/`list` all re-verified against real running
  servers, including the shared-backend cross-package call (`@devorajs/backend` → `@devorajs/core`'s
  `requireAuth()`) and the isolated-admin session cookie — then smoke-tested again under a fresh npm
  install (not just pnpm) before restoring pnpm as the resting state. One line-wrapped
  `` `@project/\ncore` `` instance in README.md's own prose was missed by the mechanical rename (a
  markdown line-break split the string across two lines) and fixed by hand after being caught by a
  second, multi-line-aware pass — not assumed clean from the first pass alone.

## Keeping this document honest

Update the relevant section here (not just `README.md`'s "What's still a stub" list) whenever one
of these lands, and re-check the "Definition of success" list — the roadmap is done when all five
of those are true simultaneously, not when the task list is empty.
