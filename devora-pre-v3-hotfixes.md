# Devora.js — Pre-v3 Hotfix & DX Backlog

Source: real issues hit while building a real project (CarOwnerApp / car-service-platform) on top of Devora.js — not speculative, every item below was independently reproduced and traced to root cause before being listed here.

Priority tiers: **P0 = fix this week** (cheap, real bugs or trust-damaging gaps) · **P1 = real backlog, scoped for v2.x/v3** (architectural, needs design, not a quick patch) · **P2 = document only** (not a framework bug, but worth a docs page so the next person doesn't lose the same hours).

---

## Executive summary — after integrating Devora.js as a real backend

Based on a real integration review (auth layer, middleware, HTTP layer, `@devorajs/core` session primitive) — not a surface-level check.

**What's genuinely good:**
- Code quality on the integration side was above average — comments explain *why*, not *what* (e.g. reasoning about why open CORS is safe with Bearer auth but wouldn't be with cookies — real security thinking, not boilerplate).
- The API contract pattern (single error-handling chokepoint → consistent `{ message }` JSON envelope) worked cleanly end-to-end with a mobile client, zero friction.
- Crypto hygiene in the session primitive is correct: HMAC-SHA256 with `timingSafeEqual`, production refuses to boot without a real secret.
- Monorepo DX (`devora dev` running everything, shared packages) is genuinely solid.

**The core open question — worth deciding deliberately, not by default:**
Is Devora.js the *product* or the *means*? If a real product is being built on top of it, every hour spent on a framework gap is an hour not spent on the product — and a boring, mature framework (Fastify/Hono) would give some of these capabilities (header auth, refresh tokens, JSON 404s) for free today. That's not a reason to abandon Devora.js — it's a reason to be explicit about which projects are "dogfooding to find framework issues" versus "need to ship on a deadline," and to weigh that before starting the next one.

---

## P0 — Fix this week

### 1. Published npm package is behind the docs
**Evidence:** `npm install` pulls `@devorajs/core@0.1.2`, which is missing `defineModule`/`apiRoute` entirely. The docs site describes `0.2.x` behavior.
**Impact:** Anyone following the docs writes code that doesn't run against what they actually installed. This is the single most damaging item on this list for first impressions.
**Fix:** Verify current published version matches documented API surface. Publish a matching release immediately if not. Consider a CI check that fails a docs deploy if the documented API version doesn't match the latest published package version.

### 2. `apiRoute()` is a no-op — uncaught errors leak HTML to API clients
> **✅ Done (2026-09-23, staged).** `apiRoute()` now wraps the handler (new `packages/core/src/httpError.ts`); the dispatcher and dev/prod API middleware also catch, so any throw under `api/**` is `{ message }` JSON with the error's `status` (401 for `requireAuth()`, 403 for `verifyCsrf()`, message hidden for unexpected errors in production). Page routes unchanged. Real-server tests in `packages/cli/src/server/__tests__/`.

**Evidence:** `apiRoute(handler)` is literally `return handler` at runtime (confirmed by reading `apiRoute.js`). An uncaught throw in an `api/**` handler goes to Vite's `next(err)` — Vite's dev HTML error overlay, not JSON. A mobile/API client parsing `{message: ...}` gets an HTML page instead and fails ugly.
**Impact:** Real bug, not a missing nice-to-have — it's a broken contract for any non-browser API consumer.
**Fix:** Make `apiRoute()` wrap the handler in default error→JSON translation. Page routes can keep the HTML dev overlay; `api/**` should never return HTML on error.

### 3. Dev server hardcoded to `localhost`/`::1`, no `host` option exposed, and no LAN/backend URL shown
> **✅ Done (2026-09-23, staged), with one deliberate deviation.** `devora dev --host` binds all interfaces and prints `Local`/`Network`/`API` URLs (auto-detected LAN IPs). Per #13 and the implementation brief, the scaffolder does **not** ship `server: { host: true }` — it adds an opt-in `dev:host` script and a README section instead. LAN URL verified reachable from this machine only; not tested from a second physical device.

**Evidence:** `dev()` passes `server: { port }` into `createServer()` with no `host`. Confirmed as the root cause of a real login failure when testing against a physical phone on the same Wi-Fi — required manually adding `server: { host: true }` to the project's own `vite.config.ts` as a workaround. Even once bound to all interfaces, the CLI never prints the LAN-reachable URL — a developer has to find their own machine's IP manually (`ifconfig`/`ipconfig`) to test from a phone or another device.
**Impact:** Blocks mobile/device testing by default for every project, silently, until someone knows to add the workaround themselves — and even after fixing the binding, there's no easy way to know what URL to actually use from another device.
**Fix:**
- Add `--host` flag to `devora dev` (document it), **and** update the CLI scaffolder so newly generated projects ship `server: { host: true }` in `vite.config.ts` by default — so this works out of the box.
- When bound to all interfaces, print **both** URLs on boot, same pattern Vite itself already uses: `Local: http://localhost:10000` and `Network: http://192.168.1.8:10000` (auto-detected LAN IP). This should include the backend/API base URL specifically, not just the page URL, so mobile setup is copy-paste rather than manual IP lookup.
- See item #13 below for the security implications of this that need to ship alongside it, not as an afterthought.

### 4. No route/endpoint listing on `npm run dev` boot
> **✅ Done (2026-09-23, staged).** `devora dev` prints each app's page + API route table from the existing `listRoutePaths()`, alongside its URLs and port.

**Evidence:** `dev()` prints one line per app (name, auth mode, URL) and nothing else, despite `listRoutePaths()`/`listRouteFiles()` already existing and being used elsewhere (sitemap, build manifests) in the same codebase.
**Impact:** Cosmetic compared to #1–#3, but every comparable framework (Next.js, Remix, SvelteKit) prints a route table on boot. Costs a few seconds of confusion per session, every session.
**Fix:** Call the existing route-listing function in `dev()` and print a route table, same shape as `listRoutePaths()` already produces elsewhere. Should be genuinely cheap — the hard part (route discovery) is already built.

### 5. Bearer tokens never expire and cannot be revoked — real security hole
> **✅ Superseded and closed by the unified session auth addendum below (framework side).** The hand-rolled token in car-service-platform still needs migrating — see the addendum's status note.

**Evidence:** The hand-rolled Bearer auth (built to work around #7 below) signs `{userId, role}` with no `exp`, `iat`, or lookup-able session ID. The mobile app persists this token indefinitely (AsyncStorage via redux-persist). A leaked token is valid forever; logout, password change, or a stolen phone cannot invalidate it. The only kill switch is rotating the shared secret, which signs out every user at once.
**Impact:** This is a genuine hole, not a tradeoff — worth fixing before any real users are on it, regardless of anything else on this list.
**Fix:** Add `exp`/`iat` to the signed payload and enforce expiry on verify. For real revocation (not just expiry), move to a lookup-able session ID (stored server-side, e.g. in the DB or a cache) rather than a fully stateless signed token, so logout/password-change can actually invalidate a specific session.

### 6. Unmatched `/api/**` routes return HTML, not JSON
> **✅ Done (2026-09-23, staged).** Any unmatched `/api/**` path, including bare `/api`, is a JSON `{ "message": "Not found" }` 404 in dev and production (shared `isApiPath()` in `apiRoute.ts`).

**Evidence:** `curl /api` (or any route that doesn't match a real handler) returns an Express-style `Cannot GET /api` HTML page, not JSON.
**Impact:** Related to #2 but distinct — #2 is about *handler errors*, this is about *no handler matching at all*. A mobile client hitting a mistyped or removed endpoint gets unparseable HTML instead of `{ message }`, same class of confusing failure.
**Fix:** Any request under `api/**` that doesn't match a route should fall through to a JSON 404 (`{ message: "Not found" }`), never the default HTML handler — same principle as #2, applied to the no-match case instead of the throw case.

---

## P1 — Real backlog for v2.x / v3 (needs design, not a quick patch)

### 7. Cookie-only auth — no Bearer token support
> **✅ Superseded and closed by the unified session auth addendum below (framework side).**

**Evidence:** Only `ctx.setSession()`/`requireAuth()` (cookie-based) exist. A mobile client can't use cookies sanely, so a parallel Bearer-token auth system had to be hand-rolled, reusing the framework's internal HMAC primitive under a separate secret.
**Impact:** The single biggest amount of extra work encountered building a real project. Directly blocks clean mobile/API-consumer auth.
**Recommendation:** This needs a deliberate design pass, not a patch — decide whether Bearer support lives in `@devorajs/core` directly or as an official, documented extension pattern. Worth prioritizing given desktop/mobile are on the longer-term roadmap. Should be designed together with #5's expiry/revocation fix, not separately.

### 8. `action` return values discarded unless redirect; `loader` has no query-string access
**Evidence:** Passing a validation error back to a form, or reading `?q=` from a loader, isn't supported. Worked around with a cookie-based flash-message pattern and Post/Redirect/Get to dynamic segments.
**Impact:** Forces the same workaround on every project that needs form validation feedback or query-param-driven pages (search, filters, pagination) — extremely common patterns.
**Recommendation:** Let `action` return a value accessible to the following render (not just redirects). Expose `ctx.searchParams` (or similar) on `loader`.

### 9. No `<head>` customization hook
**Evidence:** Confirmed by reading `html.ts`/`renderRoute.ts` directly — no way to add a font, meta tag, or external stylesheet through a normal API. Worked around by injecting a body-rendered `<style>` tag.
**Impact:** Real gap versus any comparable framework; the workaround is a genuine hack (styles that belong in `<head>` being faked from the body).
**Recommendation:** Add a documented `meta()`/head-injection API — likely a natural extension of the existing `meta()` export.

### 10. No backend "batteries" — logging, CORS, rate limiting, validation, and more
> **🟡 Partly addressed (2026-09-23, staged in devorajs-docs):** new docs page `/backend-capabilities` ("Adding common backend capabilities") with working patterns for validation (Zod), logging, CORS, rate limiting, and file uploads — guidance only, no framework code. Every code sample was extracted from the page and run against `@devorajs/core`. The rest of this item (scoping an official backend module) is still open.

**Evidence:** Logging, CORS, and error handling were all hand-built per project because the framework provides none of them.
**Impact:** This matches the deliberate v1 scope decision ("bring your own backend, no built-in ORM/auth") — not a bug, but now there's concrete evidence of exactly which of these get reached for first on a real project.
**Additional gaps worth scoping into the same conversation** (not yet hit in this project, but worth deciding on deliberately rather than discovering one at a time on the next project):
- Refresh-token rotation (pairs with #5/#7)
- Pagination helpers for list endpoints
- File upload handling (multipart, streaming to storage)
- Background jobs / queue support
- Real-time (WebSockets or SSE) — relevant given multi-app dashboards often want live updates
- Transactional email abstraction (or at least a documented pattern for plugging one in)
- Testing utilities for backend routes/server functions (a documented way to test a `serverFn`/`apiRoute` in isolation)
**Recommendation:** Use all of this — the hit list plus the anticipated list — as the actual basis for scoping an eventual "official backend module," rather than guessing what it should include or adding pieces one painful discovery at a time.

### 11. Auto-incrementing default port scheme starting at 10000
> **✅ Done for `devora dev` (2026-09-23, staged).** Default 10000 + index (stable under `--app`), optional per-app `devPort`, connect+bind probe so a loopback-only squatter (e.g. Azurite) is detected, falls forward with a log line. `devora start`/`generate:proxy` intentionally still use their shared 4173 scheme.

**Evidence:** Default framework ports collide with common tooling — Next.js/Node (3000), Vite (5173), Python/Java servers (8000/8080), common databases (5432, 3306, 27017, 6379). A high, less-contested base port avoids stepping on other tools running alongside a Devora.js project.
**Recommendation:** Default each declared app to `10000 + index` (in `framework.config.ts` declaration order) when no explicit `port` is set. Detect conflicts and auto-fall-back (10000 → 10001 → ...) the same way Vite already does for its own default port, with a clear log message when it moves. Document the one known real-world collision (Azurite/Azure Storage Emulator also defaults to 10000) so it's a one-line fix for anyone who hits it, not a mystery.
**Note:** Print the assigned port(s) as part of the #4 route-listing/boot-output fix, so this stays visible rather than needing to be inferred.

### 12. `create-devora` scaffolding is all-or-nothing — no frontend-only or backend-only mode
> **✅ Done (2026-09-24, staged, not published).** New "What do you need?" prompt (`--scope=fullstack|frontend|backend`, default full-stack; non-interactive runs default to full-stack). Frontend-only generates no `packages/backend` and nothing references it; backend-only generates `backendOnly` API apps (health, plus Bearer session login/me routes when the app has auth) with no React. Still exactly one shared backend — no multi-backend question; create-devora prints a one-line pointer to the per-app pattern instead. Verified by real `create-devora` runs of all three modes (interactive TTY and flags), real `npm install`, `devora dev` + HTTP, `devora build`, and both adapters. Two real bugs fixed along the way: the Vercel/Netlify adapters crashed on any backend-only app (always vendored `react-dom`), and `devora add` in a frontend-only project would have added a dependency on the missing backend. **Released 2026-09-24:** `@devorajs/core` 0.3.1, `@devorajs/cli` 0.3.1, adapters 0.2.1, `create-devora` 0.3.0 — re-verified from the registry: all three scopes scaffold correctly, a frontend-only config typechecks, a backend-only app builds for Vercel and Netlify, `devora --version` reports 0.3.1.
**Evidence:** The original v1 scope explicitly called for "full-stack, front-end only, or back-end only" as a supported pattern, but this hasn't been verified as actually implemented in the current scaffolder.
**Impact:** Reduces flexibility for people who want to use Devora.js as, e.g., just a backend API layer behind an existing frontend, or just a frontend against an existing backend — both legitimate adoption paths that lower the bar to trying the framework.
**Recommendation:** Add a scaffolding prompt/flag (`npx create-devora@latest --mode=fullstack|frontend|backend`) so the generated project only includes what's needed for the chosen mode. Verify against the actual current scaffolder code first — this may already be partially supported and just need the missing modes filled in, rather than being built from scratch.

### 13. Dev server LAN exposure needs an explicit, documented security posture
> **✅ Done (2026-09-23, staged).** `--host` is opt-in only; a one-line warning prints whenever the server is bound to a non-loopback address (checked from the actual bound address, so a `server.host` in an app's own `vite.config.ts` triggers it too); the generated README documents the exposure as a dev-only concern.

**Evidence:** Fixing #3 (binding to all interfaces so phones/other devices can reach the dev server) means the dev server becomes reachable by **any device on the same network**, not just the developer's own phone — including, e.g., other people on a shared coffee-shop or office Wi-Fi network, unless that network has client isolation enabled.
**Impact:** This is a real tradeoff to make deliberately, not a reason to avoid fixing #3 — see the full explanation below, this doc's author gave a direct answer in conversation rather than just flagging it here.
**Recommendation:**
- Keep `--host`/network binding **opt-in**, never a silent default, even after the scaffolder change in #3 (i.e. the generated `vite.config.ts` should make it easy but the developer should still be the one running `devora dev --host` or equivalent, not have it silently always-on).
- Print a one-line warning on boot whenever bound to a non-loopback address: something like `⚠ Dev server is reachable on your local network at http://192.168.1.8:10000 — anyone on this Wi-Fi can access it.`
- Document clearly that this is a **development-only** concern — production deployments already go through the real adapters (Vercel/Netlify/Node + reverse proxy), which is a completely different, already-secured path, not the same exposure at all.

---

## Architecture addendum — unified session auth (supersedes #5 and #7)
> **✅ Implemented in devora.js (2026-09-23, staged, not committed/published).** Opaque 256-bit session IDs; records in a bring-your-own `SessionStore` (`shared.sessions.store` in `devora.config.ts`: a module path, or `"memory"`), keyed by HMAC(secret, cookie-name:id) so a leaked store has no usable tokens and isolated apps can't accept shared-app IDs. One lookup (`resolveSession()`): Bearer header first, cookie only if no Bearer header was sent. `ctx.revokeSession()` (and `clearSession()`, now an alias) deletes server-side. States are computed from `activeExpiresAt`/`expiresAt`, not stored; idle renews in place (same ID). CSRF is skipped only for requests that actually authenticated via Bearer. Production refuses to start with no store configured.
>
> **Deviations from the sketch above:** session `data` stays bring-your-own (`setSession(data)`), not a fixed `userId` field — so there's no built-in "revoke all sessions for this user" yet (`revokeSession(id)` works for IDs the app recorded). `state` is derived, not a stored column.
>
> **Not done — flagged:** migrating car-service-platform's own `lib/bearer-auth.ts`/`lib/auth-token.ts`. That repo wasn't in scope for this pass, isn't a git repo (nothing to stage), and installs `@devorajs/core` from npm, so it can't use this until a release is published. The migration steps are in `packages/backend/AUTH.md` ("Migrating a hand-rolled Bearer scheme"). The `expo-secure-store` change on the mobile side is also untouched.


Researched against real precedent rather than designed from scratch: Laravel Sanctum's dual-guard pattern (bearer header checked first, falls back to the web session cookie, same underlying auth flow) and Lucia's session model (cookie or bearer token, both validating the same opaque session ID; active/idle states replace a separate refresh-token system) both converge on the same answer. JWTs are the wrong fit here specifically because Devora.js is architecturally a single shared backend per project — the JWT justification (multiple independent services verifying a token without a shared store) doesn't apply.

**The design:**

```ts
// One session primitive, two transports, one lookup function
type Session = {
  id: string;              // opaque random ID, NOT a JWT — enables real revocation
  userId: string;
  state: "active" | "idle" | "dead";  // idle = soft-expiring, replaces refresh tokens
  expiresAt: Date;
};

// ctx.requireAuth() checks BOTH transports against the same store:
// 1. Authorization: Bearer <sessionId> header  → mobile/API clients
// 2. HttpOnly cookie                            → browser
// Whichever is present resolves through the identical lookup — no parallel auth systems.
```

**What this fixes in one move, replacing separate patches for #5 and #7:**
- **Real revocation** — delete the session row/cache entry, it's dead everywhere instantly. No more "rotate the shared secret and log everyone out" as the only kill switch.
- **No separate refresh-token complexity** — the active/idle state model handles long-lived sessions without client-side token-rotation sync, which is exactly the complexity libraries like Lucia deliberately avoid by not bolting a second token type on top of sessions.
- **Transport-aware CSRF** — cookies auto-attach and need CSRF protection; bearer tokens must be explicitly attached by client code and don't. The auth middleware should apply CSRF checks only when the request arrived via cookie, not bearer.
- **One code path for web and mobile**, replacing the current two-system split entirely.

**Also fix on the mobile app side (separate repo, same priority):** the current token is persisted via AsyncStorage/redux-persist, which is not secure storage. Recommend `expo-secure-store` (backed by iOS Keychain / Android Keystore) instead — anything in AsyncStorage is plain, unencrypted storage on the device.

**This supersedes items #5 and #7 above** — implementing this design closes both rather than patching them separately.

---

### 14. Testing against a physical Android device requires manual `adb reverse` tunneling
**Evidence:** A physical device connected via adb loads its JS bundle through an automatic `adb reverse tcp:8081 tcp:8081` tunnel — meaning the app's own view of "the dev machine" is `localhost`, not the Mac's real LAN IP. This broke naive IP auto-detection (it picked up the tunneled `localhost`, which doesn't resolve to anything on port 5173) and required manually adding a matching `adb reverse tcp:5173 tcp:5173` tunnel. This tunnel also needs to be re-established any time the device reconnects.
**Impact:** Not a Devora.js bug — this is fundamentally how adb/Metro work — but it cost significant real debugging time, and nothing in the docs currently explains it.
**Recommendation:** Add a "Testing on a real device" docs page covering: (a) the LAN-IP approach for devices on the same Wi-Fi (works once #3/#13 ship), and (b) the `adb reverse` tunnel approach for USB-paired devices, including the "needs re-running on reconnect" caveat.

---

## Suggested order of work

1. Fix #1 (published-package/docs mismatch) — verify and publish immediately, this is urgent regardless of anything else.
2. Fix #5 (token expiry/revocation) — this is a real security hole, not a DX gap; prioritize above the cheap wins if any real users are on it.
3. Fix #2 (API error → JSON) and #6 (unmatched-route JSON 404) together — same root fix pattern, both real bugs.
4. Fix #3 + #13 together (`--host` support, LAN URL display, AND the security warning/opt-in posture — ship these as one unit, not #3 now and #13 "later," since shipping network exposure without the warning is worse than not shipping it yet).
5. Fix #4 + #11 together (route listing, port scheme, and printing assigned ports — natural to bundle since they touch the same boot-output code).
6. Fix #12 (scaffolder flexibility) — verify current state first, may be partially done already.
7. Write the docs page for #14 while the real-device pain is fresh.
8. Scope #7, #8, #9, #10 as deliberate v2.x/v3 design items — not this week's work, but now backed by real evidence instead of speculation.

---

## Verification log — 2026-09-23 pass (items 2, 3, 4, 6, 11, 13, the auth addendum, and part of 10)

- **Automated:** 253/253 tests pass (`vitest run`), up from 205. New real-server integration suites: `packages/cli/src/server/__tests__/devServer.integration.test.ts` boots the same `createAppDevServer()` that `devora dev` uses against a fixture app and makes real HTTP requests (17 tests, including real-time idle-renewal and expiry). `prodServer.integration.test.ts` runs the production handler behind `node:http` with `NODE_ENV=production` and a module-backed store (9 tests).
- **Negative controls:** reverting the JSON 404, the JSON error catch, revocation, and the CSRF check one at a time made exactly the matching integration tests fail (5 of 17); restoring them made all pass.
- **By hand, real CLI:** `devora dev` with port 10000 occupied on 127.0.0.1 (falls forward correctly); `devora dev --host` (Network URL answers on the LAN IP from this machine, warning printed); full cookie/Bearer/CSRF/logout/revocation flows via curl against `apps/dashboard` in dev and in `devora build && devora start`; a module-backed store through a real build under adapter-node, and inside the generated Vercel function copied outside the repo.
- **Not verified:** reaching `--host` from a second physical device; a real Vercel/Netlify deploy; a real DB-backed store (the AUTH.md Drizzle example is illustrative); the new docs page only checked via HTTP/HTML, not visually in a browser.

