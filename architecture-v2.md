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
itself, since the loaded module has no working HMR handle to attach to. Phase 1e's task is
therefore: confirm whether such a plugin-side hook is actually feasible before promising it, and
if not, say so explicitly and keep `DATABASE.md`'s documented pattern as the real v2 answer rather
than leaving "evaluate" open-ended.

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

## 4. Streaming render mode

Deferred from v1 (architecture-v1.md §5, §11). Needs a Suspense-boundary-based rewrite of the
island system — the current two-pass synchronous render (`IslandCollectorContext`) can't work
with `renderToPipeableStream`/`renderToReadableStream`, which don't support "render twice."
Real architectural work, not an incremental patch. Sequenced last in v2, deliberately — the
riskiest, most invasive item, done once other v2 work has already shipped and been used.

## 5. Repo-splitting

Solves a real need without inventing new merge/sync machinery — wraps existing, proven Git
features (submodules, `git subtree`) rather than building custom conflict-resolution logic.
Two real use cases this serves: a solo dev wanting cleaner repo boundaries, and a real team where
different people own different apps/backend independently (one person on backend, one on admin,
one on the landing page) and integrate via explicit sync.

```
devora split <app-name|backend> --repo=<git-url>   # converts to a git submodule
devora sync <name> [--from-main | --to-main]        # thin wrapper around git subtree push/pull
devora status --all                                  # sync state across every split-off piece
```

`devora sync` must show a real diff before acting and require confirmation; conflict output must
clearly show which files conflict and what changed on each side. A genuine same-line conflict
between two contributors is a real Git conflict requiring real manual resolution — this tooling
surfaces it clearly, it does not attempt to auto-resolve it.

**Flagged, not resolved here: `split` and `sync` currently name two different Git mechanisms
that don't compose.** `devora split ... ` is described as converting a directory to a **submodule**
(a `.gitmodules` entry + gitlink — the directory's real content lives in a separate repo/clone,
checked out via `git submodule update --init`). `devora sync` is described as wrapping **`git
subtree` push/pull** — but `git subtree` operates on a directory whose content is stored inline in
the *same* repo's own history; it has no defined behavior against a submodule gitlink, which by
design has no inline content to diff or merge. These are two established, mutually exclusive Git
patterns for the same problem, not two steps of one pipeline — picking one changes real,
user-facing behavior (submodule: contributors run an extra `git submodule update --init` step and
see a gitlink, not files, in `git status` from the main repo; subtree: the split-off directory
looks and behaves like normal committed files from the main repo's side, at the cost of `git
subtree`'s own history-rewriting push/pull semantics). This needs an explicit decision before
Phase 2 implementation starts, not a default silently picked mid-build — see the question raised
in this phase's report-back.

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
