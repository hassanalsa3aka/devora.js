# Devora.js Architecture — v2 (draft)

*This is a draft handed to Claude Code for review and refinement — not a finished spec. Claude
Code should read this alongside architecture-v1.md, ROADMAP.md, README.md, VERIFICATION.md, and
CHANGELOG.md before starting Phase 1 implementation, and should correct/expand anything here that
turns out to be wrong once real code is written.*

## 1. Vision (one sentence)

v1 proved multi-app-first, security-by-default, explicit-over-implicit works as a frontend/SSR
framework. v2 gives it a real backend — structured, explicit, Express-level capability — without
becoming an ORM, an auth provider, or a dependency-injection framework.

## 2. Core principle carried forward, unchanged

Everything in architecture-v1.md §2 still holds. v2 adds one explicit rule on top:

6. **No dependency injection, no decorator-based reflection, anywhere.** Modularity comes from
   explicit scoping (plain function composition), not runtime metadata scanning. This is a locked
   decision — if a v2 feature seems to need a DI container to work cleanly, stop and reconsider
   the feature's design rather than adding one.

## 3. What's new in v2 — backend capability

### 3.1 Explicit domain modules

```ts
const usersModule = defineModule({ name: "users", functions: { ... }, routes: { ... } });
const ordersModule = defineModule({ name: "orders", functions: { ... }, routes: { ... } });

const app = defineModule({ name: "app" }, (root) => {
  root.register(usersModule);
  root.register(ordersModule);
});
```

A module is a plain object with its own scope — composing modules is a function call
(`register()`), never reflection or metadata scanning. Modeled on Fastify's plugin/encapsulation
system (studied directly during v2 planning): each `register()` creates a child scope that can
see its parent's exports but not vice versa, avoiding cross-dependency tangles without a
container managing lifetimes for you.

### 3.2 Generic API routes

```ts
// apps/dashboard/api/users/export.ts  (or wherever the real convention lands)
export const handler = apiRoute(async (req, ctx) => {
  ctx.requireAuth();
  // same-origin JSON call from this app's own frontend — see 3.2.2 for why a
  // third-party webhook (the motivating example below) does NOT use ctx.verifyCsrf()
  // ...
});
```

Decoupled from page rendering entirely — no `component`, no `meta()`, just a request handler.
This is the concrete gap v1 had: server functions were only reachable via a route's
`loader`/`action`, so nothing like a payment-provider webhook (`POST /api/webhooks/stripe`) had
anywhere to live.

**3.2.1 Ownership rule.** Shared backend logic goes in `packages/backend`, exactly as v1 already
established for server functions (architecture-v1.md §6). An app-local API route is the
exception — only for something genuinely app-specific (e.g. a webhook only one app receives),
mirroring the existing per-app server-function-override pattern. This doesn't change if
`packages/backend` is later split into its own repo (§5) — routes still import from
`@devorajs/backend` normally; splitting only changes how that package's source is
tracked/versioned, not where routes are declared.

**3.2.2 Security requirement — corrected after reading the real `ctx`/CSRF implementation.**
This needs more than "verify it carries over"; the real implementation makes two of the three
protections a poor fit for the draft's own webhook example, and the fix is explicit
documentation, not new framework machinery:

- **Security headers** (CSP/HSTS/X-Frame-Options) are applied by a mechanism entirely separate
  from `ctx` — `securityHeadersMiddleware.ts` in dev, `prodRequestHandler.ts` in production
  (`packages/cli/src/server/securityHeadersMiddleware.ts`, `packages/core/src/
  prodRequestHandler.ts`). A generic API-route dispatcher is a *new* entry point into both, and
  must be wired into both explicitly — it will not "just carry over" the way it might if headers
  were attached via `ctx`. Verify on all four targets named in the plan, not just dev.
- **`ctx.requireAuth()`/`ctx.session`** carry over cleanly — they're pure `ctx` state, already
  general-purpose (`packages/core/src/serverFn.ts`'s `RequestContext`).
- **`ctx.verifyCsrf()` does NOT fit the draft's own motivating example, and shouldn't be
  presented as if it does.** Its real signature is `verifyCsrf(formData: FormData): void`
  (`serverFn.ts`), and the token it checks is one `renderRoute.ts` embeds into a
  server-rendered `<form>` (`csrf.ts`'s own doc comment: "the token is embedded server-side into
  the rendered form... no client JS ever reads the cookie at all"). A `POST /api/webhooks/stripe`
  request is a third-party server calling in — it was never handed a form, has no CSRF cookie,
  and has no `FormData` body (it's a JSON payload with a `Stripe-Signature` header). Applying
  `ctx.verifyCsrf()` to it isn't just unnecessary, it's a category error. What a webhook actually
  needs — HMAC/signature verification against a provider-issued secret — is bring-your-own, the
  same as DB/auth (§3.5); this framework should document that distinction clearly rather than
  imply CSRF covers it. Where CSRF genuinely does apply to a non-page route — a same-origin
  `fetch()` call from this app's own frontend, not a form submit — `verifyCsrf`'s current
  `FormData`-only signature doesn't fit either (no form, so nothing to read a hidden field from);
  this needs either a header-based variant (a custom header a cross-origin request can't set,
  compared against the same signed cookie) or an explicit decision that same-origin JSON API
  routes rely on a different, equally explicit check. Resolve this as a real Phase 1b design
  question, not by reusing `verifyCsrf()` as-is and hoping the shape matches.

Net effect on the example above: the code sample now shows the case CSRF-via-`ctx` genuinely
fits (a same-origin authenticated call), and the webhook case is called out as needing its own,
different, bring-your-own security story.

**3.2.3 Implementation grounding — `ctx` construction is already public, just never called from
a second place.** `createRequestContext()`/`createNoAuthContext()` (`packages/core/src/
session.ts`) are already re-exported from `@devorajs/core`'s barrel — nothing needs to be newly
exposed. What's actually missing is a second call site: today they're invoked exactly once, from
`renderRoute.ts`'s own page-route request pipeline (`renderRoute.ts:106-107`), which already does
the real work of pulling the cookie header and matched route params off the raw request before
constructing `ctx`. A generic API-route dispatcher needs its own equivalent of that — extracting
the same inputs from a request that never went through route matching — not a change to
`session.ts` itself. Budget this as real (if small) new integration work per adapter target
(dev's Vite middleware, `adapter-node`, and each of `bundleForDeploy.ts`'s two generated function
wrappers), consistent with 3.2.2's point that this is a new entry point into the request
lifecycle, not a variant of an existing one.

### 3.3 Middleware

Two layers, not one:

**Primary: native `ctx`-based middleware.** Composable functions operating on this framework's own
request context — consistent with `serverFn`/`loader`/`action`, which already use `ctx`. This is
the real, first-class middleware system, not a fallback.

**Optional: explicit ecosystem adapters.** `fromExpressMiddleware(mw)` wraps an Express/Connect
`(req, res, next)`-shaped middleware into `ctx`. `fromFastifyPlugin(plugin)` wraps Fastify's
`(instance, options, done)` plugin shape (studied directly — it's close enough to this
framework's own module shape that the adapter should be small). Both are opt-in per use, not
automatic/implicit compatibility — a deliberate choice consistent with "explicit over implicit":
silently trying to make foreign middleware "just work" would itself be hidden magic.

**3.3.1 Governance rule.** Any use of either adapter — any point where a third-party npm package
starts running inside the request lifecycle — gets registered in one place:
`packages/backend/middleware.ts` (or equivalent). This keeps "a new external dependency is now in
the request pipeline" a single, visible, reviewable change, regardless of which app or
contributor (see §5's team workflows) introduced it.

### 3.4 Backend-only app mode

An app that's pure API — no frontend/pages, no client build at all. Should skip the Vite client
build entirely; no `PageShell`/theme wiring needed, since there's no page to wrap.

Should be an explicit `devora.config.ts` field on `AppConfig` (`packages/core/src/config.ts`),
consistent with how `auth`/`domain`/`defaultRenderMode` are already explicit per-app config there
— not inferred implicitly from "this app's `routes/` directory happens to be empty," which would
be exactly the kind of convention-over-configuration guessing §2.2 rules out.

### 3.5 DB/auth — guides, not built-in (unchanged from v1, restated for clarity)

Still no built-in ORM or auth provider — v1's §6/§11 boundary holds. What v2 adds: official,
maintained guides for the popular real choices (Prisma, Drizzle for DB; Lucia, Auth.js for auth),
each showing the wiring into `ctx.setSession()` and the shared backend pattern.

**Native-driver reload hazard — corrected: the obvious fix was already tried and rejected.**
ROADMAP.md #6 documented a real native-addon crash (`better-sqlite3` + Vite's SSR module reload).
`packages/backend/DATABASE.md`'s current workaround (a manual `globalThis.__db` singleton the
developer writes themselves, `DATABASE.md:24-33`) is pure documentation — no framework plumbing
exists. The draft's suggestion to "evaluate a real `onDispose`-style lifecycle hook" needs a
correction before Phase 1e starts: `DATABASE.md:73-75` already records that the obvious version of
this — hooking `import.meta.hot.dispose()` — was tried and **rejected**, because `import.meta.hot`
is `undefined` inside a module loaded via `vite.ssrLoadModule` (which is how this framework's dev
server loads route/entry modules), not just unused. So a `packages/core`-provided `onDispose` hook
can't be a thin wrapper around Vite's own HMR API for the case that actually crashes — it needs a
different mechanism, e.g. a Vite plugin hook that runs on the *server* side of module invalidation
(`handleHotUpdate`, or watching the module graph directly) rather than inside the loaded module
itself, since the loaded module has no working HMR handle to attach to.

**Resolved during Phase 1e: the plugin-side hook is real and confirmed working.**
`registerDisposable()`/`runAndClearDisposable()` (`packages/core/src/disposeRegistry.ts`, backed
by `globalThis` for the same reload-survival reason `DATABASE.md`'s singleton pattern already
uses) plus a small Vite plugin (`packages/cli/src/server/moduleDisposePlugin.ts`, wired into every
dev server) give a resource a real place to register cleanup that runs exactly when Vite is about
to invalidate its file. Confirmed against a real dev server, not assumed: booted `createServer()`
with the plugin, loaded a fake module that registers a disposer, edited the file to force a real
reload, and watched the disposer fire before the next load re-created the "connection" — see
`DATABASE.md`'s "v2 update" section for the full account, including a real first-attempt miss
(testing with `hmr: false` silently disabled the exact mechanism being tested). Scope stays honest:
this is a generic reload-cleanup primitive, not a driver-specific fix — `DATABASE.md`'s
`globalThis` singleton pattern remains the recommended default, with this as an additional tool for
closing the old connection cleanly rather than a replacement for it, and it's dev-only by
construction (nothing to dispose in a production process that never reloads modules).

### 3.6 Static params for dynamic routes

```ts
// routes/users/[id].tsx
export async function getStaticParams() {
  return [{ id: "1" }, { id: "2" }];
}
```

Closes a real, documented v1 gap: `ssg`/`isr` currently fail the build on a dynamic route since
there's no way to know which concrete values to pre-render. `ssr`/`csr` on dynamic routes already
work and are unaffected by this addition.

## 4. Streaming render mode — ✅ done

Deferred from v1 (architecture-v1.md §5, §11). Needed a real Suspense-boundary rewrite of the
island system, not an incremental patch — the two-pass synchronous render (`IslandCollectorContext`)
can't work with `renderToPipeableStream` (React never waits for a suspended promise mid-`renderToString`;
it just shows the fallback), so a second, genuinely different `<Island>` strategy was added
alongside it (`packages/core/src/islandComponent.tsx`): a real "throw a promise" Suspense idiom,
selected via `IslandStreamingContext`, which only `renderStreaming.ts`'s own render path ever
provides. Every other render mode leaves that context at its default (`false`), so the existing
two-pass model is exactly v1 behavior, unchanged — verified directly (not assumed): the full
existing test suite plus a real Playwright click test on the pre-existing `ssr` island demo, both
passing throughout this work.

`renderStreaming.ts` writes the document head immediately, pipes React's own streamed output
through a `PassThrough` (so the caller controls exactly when the response ends, since piping
directly to the destination would let React close it before the document's own tail — script
tags, `</body></html>` — could be written), and writes the tail once React's stream ends.
GET-only, deliberately: an `action` needs to decide "redirect or re-render" before any HTML is
sent, which conflicts with a response already streaming — the same restriction `ssg`/`isr` already
have, for an unrelated reason.

**Two real, previously-undiscovered bugs found verifying this in an actual browser (Playwright),
not just server-side output** — both affect this framework's *existing* dev-mode islands too, not
just the new streaming path, since neither is streaming-specific:
1. **Every island crashed at runtime in dev** with `@vitejs/plugin-react can't detect preamble` —
   this framework's hand-built HTML never calls Vite's own `transformIndexHtml`, which is what
   normally injects React Refresh's required preamble automatically. Fixed with a real Vite plugin
   (`packages/cli/src/server/reactRefreshPreamblePlugin.ts`) serving the preamble as an external,
   same-origin virtual module (`<script type="module" src="/@id/...">`) rather than the officially
   documented *inline* injection, which this framework's own default CSP would have blocked anyway.
2. **React's own inline Suspense-boundary-patch script** (unrelated to Vite — this is React's own
   streaming SSR mechanism) is blocked outright by the same default CSP, in both dev and
   production. Fixed with a real per-request nonce (`securityHeaders.ts`'s `generateNonce()`/
   `addNonceToCsp()`), threaded into both the CSP header and `renderToPipeableStream`'s own `nonce`
   option — confirmed against real `react-dom/server` output, not mocked.

**Client-side hydration also needed a real change**, not just the server: `island-client.tsx`'s
old one-shot `document.querySelectorAll("[data-island]")` (correct for v1, where every island is
already in the DOM by the time the script runs) misses an island that streams in *after* that
script already executed. `hydrateIslands()` (now shared via `@devorajs/core/client`, replacing
three identical per-app copies) adds a `MutationObserver` alongside the initial scan — confirmed
with a real artificially-deferred island (removed after verification): the fallback rendered
first, the real content patched in after the delay, and a real click on the late-hydrated
button's counter worked, proving an actual event handler attached, not just correct markup.

**Verified across all four deploy targets**, each with a real, meaningful difference, not treated
as identical: dev (real Playwright click test, both a fast and an artificially-delayed island) and
`adapter-node` (real chunked `Transfer-Encoding`, confirmed via a real production server) both
stream progressively; Vercel's generated function (a real Node `(req, res)` pair, same as
adapter-node) does too, confirmed by running the actual bundled function standalone. Netlify's
function shape (Web `Request`/`Response`, no Node stream to hand `pipeTo()`) needed a real fix to
its response shim — it now buffers into a real `Response` instead of crashing on `res.write is not
a function` — functionally correct HTML, delivered as one response rather than progressively
flushed to the actual client the way the other three targets are. Documented as a known,
platform-shape gap, not silently pretended away.

## 5. Repo-splitting

Solves a real need without inventing new merge/sync machinery — wraps existing, proven Git
features (submodules) rather than building custom conflict-resolution logic. Two real use cases
this serves: a solo dev wanting cleaner repo boundaries, and a real team where different people own
different apps/backend independently (one person on backend, one on admin, one on the landing
page) and integrate via explicit sync.

```
devora split <app-name|backend> --repo=<git-url>   # converts to a git submodule
devora sync <name> [--from-main | --to-main]        # thin wrapper around submodule fetch/push
devora status --all                                  # sync state across every split-off piece
```

**Resolved: submodules, not `git subtree`.** The draft originally described `split` as creating a
submodule but `sync` as wrapping `git subtree` — two different, largely incompatible Git
mechanisms for the same problem (subtree has no defined behavior against a submodule gitlink,
which by design has no inline content for it to diff/merge). Decided in favor of submodules: the
split-off directory becomes a real, independent repo — a gitlink in the main repo, checked out via
`git submodule update --init` — rather than history rewritten and inlined back into the main
repo's own tree on every sync. This is the better fit for this feature's own stated second use
case (a team where one person owns `packages/backend`, another owns `apps/admin`, working in
genuinely separate clones) — a submodule's own remote is a real, independently-clonable repo;
`git subtree`'s content stays entangled with the main repo's history even after "splitting."
Concretely, `devora sync`'s two directions now mean: `--from-main` fetches and merges the
submodule's own remote's latest commits into the local checkout, then stages the updated gitlink
in the main repo; `--to-main` pushes local commits made directly inside the submodule's checkout
up to its own remote. Neither auto-commits in the main repo — same "show a real diff, require
confirmation, leave the actual commit to the user" pattern as everywhere else in this CLI.

`devora sync` must show a real diff before acting and require confirmation; conflict output must
clearly show which files conflict and what changed on each side. A genuine same-line conflict
between two contributors is a real Git conflict requiring real manual resolution — this tooling
surfaces it clearly, it does not attempt to auto-resolve it.

**Sequencing:** do not start this until §3's backend work is complete, verified, and used in a
real project — the backend's shape (shared `packages/backend`, the middleware manifest, API
routes) needs to be stable before splitting any of it into separate repos makes sense. Treat this
as its own follow-up release, not the same push as §3.

## 6. Explicit v2 boundaries — what we are NOT building

- ❌ Dependency-injection container or decorator-based reflection (NestJS's core mechanism) — the
  one thing this entire v2 plan deliberately avoids, at every phase.
- ❌ Built-in ORM or auth provider — §3.5 is guides only; this boundary from v1 doesn't move.
- ❌ Real-time/live-query sync engine.
- ❌ Mobile (React Native) / desktop (Tauri) targets — v3+.
- ❌ Custom RSC-style server/client serialization protocol.
- ❌ Full Express or NestJS ecosystem parity — the adapters (§3.3) bridge specific packages
  explicitly; this is not a promise of drop-in compatibility with either ecosystem.
- ❌ Fixing `isr` regeneration reliability on Vercel/Netlify — still an open, serverless-
  filesystem-inherent limitation from v1, not something v2 attempts to solve.

## 7. Success criteria for v2

v2 is "done" when: a real project can define shared backend modules, expose plain API routes
(e.g. a payment webhook) alongside its pages, compose middleware explicitly (native or via an
ecosystem adapter), optionally split any app or the backend into its own repo for independent
team ownership, and do all of this without a security regression in the sessions/CSRF/headers
protections v1 already established — verified the same way v1 was: real tests where they exist,
honest "manually verified, not automated" labeling where they don't (see VERIFICATION.md's
existing convention), and a formal third-party audit once this surface stabilizes.
