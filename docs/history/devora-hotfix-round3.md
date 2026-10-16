# Devora.js — Hotfix Round 3 (post-0.3.1, real-product review)

Source: **four independent reviews across three different real products**, built on devora.js by different engineers (review 4 is Khepra — a three-app product with a Prisma backend, a mobile client, and a git-import deployment to Vercel; versions 0.3.1 with local patches). Items below were also checked directly against the framework source (`hassanalsa3aka/devora.js` `main`, last commit 2026-09-24) where noted. Reviews 1–2 are the same product (website + admin + mobile API, sessions, uploads, i18n, Docker deploy), six weeks apart — the first tested an earlier build, the second re-tested against installed 0.3.1 after the framework updated itself mid-project. Review 3 is a separate product (YallaDo — task manager, web app, JSON API app, email-code/Google/Apple login, notifications, mobile client) built independently on 0.3.x, by someone who explicitly flagged they never deployed to Vercel and couldn't reach the published docs site from their sandbox — so treat review 3's deployment and docs findings as source-code-level evidence, not a confirmed live-deploy failure.

Every item below was either verified against real source code or caused a real break in a real running app — nothing here is speculative. Where review 3 independently hit the same wall as reviews 1–2, that's noted explicitly — two unrelated engineers hitting the identical gap is stronger signal than either report alone.

**Read this before fixing anything**: the second review only re-confirmed 4 specific items as fixed and 2 as still broken. Everything else the first review called Critical or High is **unconfirmed** — plausible, given how much else got fixed, but not re-checked. Don't assume fixed; verify each one against current source before closing it. The cookie `Secure`-flag bug especially — it was the single worst bug found anywhere in this process (broke every production login) and it is not mentioned anywhere in the second pass.

---

## ✅ Confirmed fixed (verified against 0.3.1, no action needed)

1. **No route listing on `npm run dev`** → now prints every page and API route, grouped and labeled.
2. **Dev server `localhost`-only, unreachable from LAN/emulator** → `--host` flag, automatic LAN-address detection, automatic port-fallback, security warning when exposed.
3. **No native Bearer-token auth** → `ctx.setSession(data, { transport: "bearer" })` is native; sessions are opaque, server-side, revocable (not JWT-style).
4. **`apiRoute()` was a no-op, leaked HTML errors to JSON clients** → every thrown error now converts to `{message}` JSON, at both the handler-wrapper level and the dispatcher level.
5. **Bonus, previously undiscovered**: a real session-isolation HMAC bug was caught and fixed — under a fallback-secret config, an "isolated" app's session could have been replayed using a shared app's session cookie, defeating `auth: "isolated"` entirely. Caught via what looks like a systematic audit, not a bug report.
6. **CSRF correctly skipped for Bearer, enforced for cookie/unauthenticated** — confirmed as the right distinction (a cross-site page can force a browser to attach cookies; it can't force an `Authorization` header), and the framework draws the line automatically rather than leaving it to app code.

---

## ❌ Confirmed STILL BROKEN (re-verified against 0.3.1 — real action needed)

### 1. No `<head>` customization hook — forced a real workaround, confirmed independently by BOTH products
Still just `title`/`description`/`og.*`. No way to add a `<link>`, custom `<meta>`, external stylesheet, font, manifest, or head script. Unchanged since the 0.2.0-era first review.
**Product 1 workaround**: inline-style-only CSS with self-hosted fonts via a body-rendered `<style>` tag.
**Product 2 (YallaDo) workaround, independently hit the same wall**: `<link>` tags pushed to the top of `<body>` instead of `<head>`; its app icon served *at Devora's own hardcoded favicon URL* just to get a working favicon.
**New detail from YallaDo, not previously reported**: Devora injects its own global CSS into every page — including `body { display: flex }` — with no documented way to opt out, so a second app had to override framework-injected styles defensively rather than just not having them. This is a step beyond "missing a feature": it's *unwanted* behavior a consuming app can't turn off.
**Fix**: add a documented root-layout/head-injection API (`meta()` is the natural place to extend) covering styles, fonts, manifest, meta tags and scripts — and stop injecting global styles/favicon paths that the app didn't ask for.

### 2. Page loaders have no query-string, header, or client-IP access — forced real workarounds, confirmed independently by BOTH products
`RequestContext` has `params` (route path segments) only — nothing for `?q=...`, headers, or client IP. API routes get the raw `req.url`/headers and can parse them; page loaders can't.
**Product 1 cost**: forced a Post/Redirect/Get-to-dynamic-segment pattern for search (`/vehicles/search/[query]`) instead of a normal `?q=` param; broke a language-switcher's ability to redirect back to the originating page (it always redirects to `/`).
**Product 2 (YallaDo) cost, independently confirmed**: couldn't read `?next=` or `?ws=` query params in a loader at all; **no client IP available to loaders either**, which pushed IP-based rate limiting out of pages and into API routes exclusively; ultimately contributed to collapsing the whole logged-in app into one large island just to get request-level data in JS instead of server-side.
**Fix**: add `ctx.request` (standard `Request` object) or at minimum `ctx.url`/`ctx.headers`/`ctx.ip`.

### 3. Actions can only redirect — can't return data to the page, confirmed by YallaDo (new confirmation, was only a backlog item before)
An `action` has no way to hand a value back to the following render — only a redirect. This was flagged as a backlog design item in the pre-v3 doc but not carried into the confirmed-broken list until now.
**Cost**: no clean way to show "wrong code" or a validation error on a plain HTML form after a failed action — YallaDo moved login entirely to JSON endpoints plus a client-rendered form just to get an error message on screen, sidestepping the page-action model entirely for anything that needs to fail visibly.
**Fix**: let `action` return a value accessible to the render that follows it, not just redirects.

### 4. Island discovery is a regex over route files only — breaks in shared components (new finding, YallaDo)
`island()` calls are found by scanning route files with a regex, and only the literal `island(() => import("..."))` form is recognized. An `island()` call placed inside a *shared* component (not a route file) is silently not discovered at all — no error, it just doesn't hydrate.
**Cost**: forced declaring every island in the route file itself and passing it into shared components as props, rather than letting components declare their own interactivity.
**Related**: islands are also separate React roots with no shared context between them — YallaDo had to connect a notification bell to a task board using raw browser events instead of React context, because the two islands can't see each other's state.
**Fix**: replace the regex scan with a real build-time AST pass that finds `island()` calls anywhere they're used, not just in route files; consider a documented pattern (context bridge, shared store) for cross-island state.

### 5. API responses are fully buffered — no streaming, SSE, WebSockets, or handler-set cookies (new finding, YallaDo)
A handler can't stream a response, use SSE/WebSockets, or set its own cookies on the response object.
**Cost**: for OAuth, the `state` value that's normally stored in a short-lived cookie had to be persisted to the database instead, because API handlers can't set cookies directly.
**Source-verified 2026-10-08**: a search of `packages/` finds no WebSocket, HTTP `Upgrade` handling, `text/event-stream`, or Socket.IO code anywhere; `ROADMAP.md` lists a "real-time sync engine" only as a future item. The nginx block from `generate:proxy` already forwards `Upgrade`/`Connection`, so a separate WebSocket server behind the same proxy works, but not inside Devora. On Vercel/Netlify, long-lived sockets are impossible for any framework (serverless).
**Workarounds available today**: a separate `ws`/Socket.IO service sharing the DB and session ID; a managed service (Pusher/Ably/Supabase Realtime); polling; FCM push for mobile.
**Fix**: expose a real `Response`-shaped return (or explicit cookie-setting API) from handlers, and scope whether streaming/SSE support is realistic for a future release; document the supported real-time patterns in the meantime.

---

## ⚠️ UNCONFIRMED — re-verify against current source before anything else

Critical/High in the first review, **not re-checked** in the second pass. Treat every one of these as open until proven otherwise.

### 1. Cookie `Secure` flag hardcoded to production — ✅ NOW CONFIRMED STILL BROKEN IN SOURCE (was CRITICAL, broke real logins)
**Verified 2026-10-08 against `packages/core/src/session.ts` `buildCookieAttributes()`**: `return process.env.NODE_ENV === "production" ? `${attrs}; Secure` : attrs;` — and `devora start` forces `NODE_ENV=production`. There is no `secure` or `trustProxy` option anywhere in `config.ts`/`sessionConfig.ts`. So every browser login served over plain HTTP in production still fails (browsers drop `Secure` cookies on HTTP), with no way to configure it.
**Related, also verified**: Devora has no native TLS. `devora start` is plain HTTP (no cert/key options, no `--https`); HTTPS is expected from the host (Vercel/Netlify), Caddy (auto-HTTPS), or nginx + certbot — `generate:proxy`'s nginx block is HTTP-only on port 80 with a comment pointing at certbot, and passes `X-Forwarded-Proto`. HSTS is sent by default. So the cookie rule is only safe behind an HTTPS-terminating proxy.
**Fix**: a `sessions.cookie.secure: "auto" | true | false` setting. In `"auto"`, set `Secure` only when the request is actually HTTPS, reading `X-Forwarded-Proto` when `trustProxy: true`. Optional, smaller: `--https --cert --key` for local HTTPS testing.

### 2. Errors thrown in page actions become generic 500s — was HIGH
`routeModule.action(...)` wasn't wrapped in error handling, so `HttpError(403, ...)` (e.g. a CSRF failure) surfaced as a plain 500 — indistinguishable from a real crash. Note: the confirmed fix above covers `apiRoute()` (API routes) — this is the separate page-actions code path, not mentioned as re-checked.
**Fix if still open**: catch `HttpError` around `action`/`loader`, use its real status, support a custom error page per app. Also: redirect-after-POST should be 303, not 302.

### 3. Page actions can't receive file uploads — was HIGH
Actions only parse URL-encoded forms; file fields are silently dropped. Forced a separate API route plus manual CSRF/redirect handling just to support upload forms.
**Fix if still open**: parse `multipart/form-data` in actions, with a configurable size limit.

### 4. `apiRoute()` swallowing errors blocked middleware composition — was HIGH
At the time of the first review, `apiRoute()` caught errors itself, so no wrapper could see the original error (e.g. to localize a message). This may be exactly what the confirmed JSON-error fix above addresses — but confirm the fix lets middleware/wrappers see the original error, not just that errors become JSON.

### 5. `devora build` executes every server file at build time, even request-time-only ones — was HIGH
A module that reads env vars at import time crashes a build where secrets aren't present (e.g. a Docker build stage). Real cost: crashed on a storage client reading env vars on import; worked around by lazily creating the client on first use.
**Fix if still open**: only import routes actually rendered at build time, or read `renderMode` without executing the file. At minimum, document that modules must not do work at import time.

### 6. Type definitions break `tsc --noEmit` in consuming apps — was HIGH
`csrf.d.ts` declares `CsrfField` as returning `unknown`, not a valid JSX element type (TS2786); some render-function types don't match React's own (TS2322). Real cost: 18 and 16 type errors across two apps, from framework types alone — blocks a CI pipeline from gating on type-check.
**Fix if still open**: have `CsrfField` return `React.JSX.Element`, align render types, test the published `.d.ts` against a real sample app in the framework's own CI.

### 7. `devora start` ignores `PORT`/`HOST` env vars — was Medium
Only `--port` works (default 4173); silently overwrites `NODE_ENV` without logging it. A Docker Compose `PORT: 3000` setting was silently ignored.
**Fix if still open**: read `PORT`/`HOST` like most hosting platforms expect.

### 8. `--adapter` accepts any value silently — was Medium
`--adapter=node` was silently ignored with no warning; only `vercel`/`netlify` actually do anything.
**Fix if still open**: reject unknown adapter values with a clear error.

### 9. CLI ships its own duplicate copy of core logic — was Medium
`cli/dist/index.js` contains its own `HttpError` and cookie-handling logic, separate from `@devorajs/core` — a fix in core may not reach `devora dev`/`devora start` at all.
**Fix if still open**: have the CLI import core directly instead of duplicating it.

### 10. Dev server silently moves to a different port, breaking clients expecting a fixed one — was Medium
When 5173 was taken, the dev server silently moved to 5174, breaking a mobile app hardcoded to expect 5173.
**Fix if still open**: add a `strictPort` option (fail instead of silently moving), ideally on by default when `devPort` is explicitly set.

### 11. React 18-only, no `engines` field — was Medium
`peerDependencies: react ^18.3` excludes React 19. No `engines` field means the required Node version is unstated.

### 12. Error messages point to `ROADMAP.md`, a file end users don't have
Should link to the public docs site instead.

### 13. No official session store shipped
The reviewed project hand-wrote its own Postgres session store. Pluggable storage was the right architectural call — official Postgres/Redis store implementations would remove real, repeated work for every adopter.

### 14. No built-in health-check route
No `/_devora/health` or equivalent — the reviewed project's Docker setup had nothing to point a container health check at.

---

## 🔴 Vercel deployment — failures hit by TWO real projects and checked in the adapter source

This is the most actionable group in the document: every item below actually failed a real Vercel deployment, and the first two were hit independently by YallaDo and Khepra. Today a new Devora app cannot be deployed to Vercel from a git import without custom scripts.

### V1. Adapter hardcodes the discontinued `nodejs20.x` runtime — hard deployment break
`adapters/adapter-vercel/src/index.ts:197` writes `{ runtime: "nodejs20.x", ... }` into `.vc-config.json`. Vercel now fails the deploy with "You are using a custom Runtime that depends on nodejs20.x, which is discontinued." Hit by YallaDo and Khepra; both patched it to `nodejs22.x` after the build with their own script. The adapter's own header comment still cites the `nodejs20.x` runtime, and the repo's `CLAUDE.md` says Vercel deployment is "confirmed live" — that was true at the time but is **no longer true for any new deploy**.
**Fix**: don't hardcode — read it from `engines.node`/the running Node major, or make it an adapter option, defaulting to the current Vercel LTS. Check `adapter-netlify` for the same pattern.

### V2. Devora's `apps/<name>/api/` folder collides with Vercel's reserved `api/` folder — same root cause, two different symptoms
The adapter copies the app's source `api/` into the function (`index.ts:108`) and Devora serves it through one function — but with the Vercel project's Root Directory set to `apps/<name>` (the layout the scaffolded `vercel.json` assumes), Vercel also treats `api/*` as its own serverless functions.
- **YallaDo**: 25 route files → 25 functions → "No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."
- **Khepra**: Vercel type-checked `api/**` and everything imported from `packages/backend` with its own tsconfig → hundreds of `TS2835`/`TS2834` ("relative import paths need explicit file extensions") after Devora's own build had already succeeded. Khepra added a per-app `.vercelignore` of `/api`, but could not confirm Vercel honours it in git builds.
- **Only fix that worked in both**: make the Vercel project root the repo root (which has no `api/`), with a root `vercel.json`/build script.
**Fix** (any one): let `defineApp` set the API directory (`apiDir`), have the adapter generate a `.vercelignore`/documented Root Directory requirement, or default to a folder name Vercel doesn't treat as functions. At minimum, state this in bold in the Vercel guide.

### V3. Scaffolded `vercel.json` is not workspace-aware; monorepos need a custom root build script (Khepra; YallaDo also moved its root)
`devora init`/scaffold writes a `vercel.json` that assumes the app sits at the project root and `devora` is resolvable there. In a workspace the binary is hoisted to the repo root, and the adapter writes `.vercel/output` inside `apps/<n>/`, which only works if that is where Vercel looks. Both projects ended up with a script that runs the build and copies `apps/<n>/.vercel/output` to the build root. Khepra also got `Could not resolve entry module "index.html"` when Vercel fell back to plain `vite build` after the per-app config was removed.
**Fix**: an adapter flag such as `--out <dir>`; make the generated `vercel.json` find the hoisted binary/repo root (or warn when `apps/*` is part of a workspace); document "N Devora apps in one repo = N Vercel projects" with the exact Root Directory and `buildCommand`.

### V4. No build hook for codegen/asset steps on a clean checkout (Khepra, YallaDo — partly their own setup, but a documented hook would have prevented both)
Khepra: `Could not resolve "./generated/client"` because the Prisma client is generated and git-ignored. YallaDo: stylesheet and fonts 404 because the Tailwind + font-copy step (`build:css`) is git-ignored and never ran on Vercel. Neither is a Devora bug, but a documented `prebuild` hook (or a note in the Vercel guide) is the missing piece. Also in the same bucket, Khepra's `patch-package` ordering failures were their own setup.

### V5. Misleading adapter log line with a dead reference
Every adapter run prints "verified locally in isolation, NOT deployed to real Vercel infrastructure … see ROADMAP.md #4". `ROADMAP.md` is not in the npm package, and the line reads like a failure inside a successful build (seen in both the YallaDo and Khepra logs).
**Fix**: reword and link to the docs site, or drop it now that live deploys were confirmed.

### V8. ESM bundle breaks any CommonJS dependency at first request — green build, 500 at runtime (Khepra, new in the 2026-10-12 update; source-verified)
Khepra's deployed function returned 500 with `Error: Dynamic require of "events" is not supported` at `node_modules/pg/lib/client.js`, thrown while loading the session store. **Cause, verified in source**: both `adapters/adapter-vercel/src/bundleForDeploy.ts` and `adapters/adapter-netlify/src/bundleForDeploy.ts` run esbuild with `format: "esm"` (lines 54 and 87) and **no banner**, so esbuild's `__require` shim throws whenever an inlined CommonJS package calls `require("events")` or any other Node built-in. `pg` is the example, but any real database driver or older npm package can do this. The same failure class was already hit once for `react-dom` (the comment at line 28 describes it) and was fixed by marking react/react-dom `external` and vendoring them, not by fixing the bundler — so every other CJS dependency is still exposed. **Netlify is affected as well as Vercel.**
**Why it matters**: this is the first confirmed runtime failure of the adapter bundling that is not a platform change, and it appears only after a green build. It also means the framework's "confirmed live" deploys never exercised a CommonJS dependency (the demo apps have none).
**Khepra's workaround**: prepend `import{createRequire}from"node:module";globalThis.require??=createRequire(import.meta.url)` to every bundled file.
**Fix**: add that banner to both `esbuild.build` calls in both adapters (or externalize and vendor such packages like react), and add a smoke test that bundles a package using `require("events")`. Related: a missing `DEVORA_SESSION_SECRET_ADMIN` surfaced as a bare first-request 500 with no deploy-time check — a startup/preflight check (V7) would catch it.

### V6. Single 17 MB function per app
Khepra's website app is one `index.func` of ~17 MB (with vendored react/react-dom), serving pages and API together. Cold-start and size once Prisma/ORM code is included are unmeasured. Khepra's open question: is single-function-per-app the intended long-term design?

### V7. Suggested preflight check
`devora build --adapter=vercel` could verify before upload: supported runtime, no top-level `api/` conflict, `.vercel/output` location matches the build directory.

---

## New findings — Khepra review (not yet cross-confirmed unless noted)

### K1. No supported way to set cookie `SameSite`, `X-Robots-Tag: noindex`, or per-app session lifetimes
Khepra needed `SameSite=Strict` on its admin app, `noindex` for an internal app, and per-app active/idle session lifetimes; none are configurable in 0.3.1. They patched `@devorajs/core` and `@devorajs/cli` (env-driven `DEVORA_COOKIE_SAMESITE`, `DEVORA_NOINDEX`, `DEVORA_SESSION_ACTIVE_SECONDS`, `DEVORA_SESSION_IDLE_SECONDS`) with `patch-package`, pinned to the exact version, so every upgrade is manual work. This belongs next to the cookie `Secure` item as a first-class `defineApp`/session config surface.

### K2. Island discovery fails silently outside route files — now confirmed by TWO products
Khepra independently found that production only discovers `island(() => import(...))` when the call is literally in a `routes/*` file; passing island descriptors down as props is the only working pattern (same as YallaDo). **Fix**: follow imports statically, or fail the build loudly when `island()` is called outside `routes/`.

### K3. Route-imported CSS is not linked in SSR/SSG HTML
Khepra works around it by inlining CSS with `import css from "x.css?raw"` in a `<Styles/>` component in every layout, plus a `raw.d.ts` type shim per app. Closely related to the head/root-layout gap above.

### K4. No built-in CORS helper — second product to hand-write one
A mobile + web product needs CORS immediately; Khepra wrote its own middleware (earlier reviews also had to). A small `cors({ origins })` option in `defineApp` would remove a common footgun.

### K5. Env loading convention for monorepos is undocumented
Khepra loads one root `.env` via `node --env-file-if-exists=...` in front of the CLI; YallaDo also hit "no automatic `.env` loading". Document the intended convention (root vs per-app, load order) or load it automatically.

### K6. API-only apps still pre-render `/`
Khepra's API app prints `pre-rendered (ssg/isr): /` on build. Probably harmless, but an API-only app has no page.

### K7. Questions Khepra asked the team (worth answering publicly)
Supported `SameSite`/`noindex`/lifetime settings planned? The intended Vercel layout for several apps in one workspace? Is the single-function-per-app output staying? Which Node runtimes will the adapter target going forward?

### K8. Positive signals from the same review (for balance)
Multi-app with one command per app (`--app=`), file routes + `apiRoute` + `methods` keeping handlers tiny, opaque server-side sessions with a pluggable store, fast builds (~2–3 s), a small readable CLI bundle that made patching possible, and a built-in health route that simplified first-deploy checks. Khepra's own summary: everything in the app code ran on Devora without framework-level problems.

---

## New findings — YallaDo review only, not yet cross-confirmed by the other product

These didn't come up in reviews 1–2 (different app shape, different usage), but each one is concrete, source-verified or reproduced directly — not speculation.

### Serverless deployment: dependency bundling — UNVERIFIED, and partly corrected after reading the adapter source
The YallaDo review (and the assistant that wrote the YallaDo `vercel-postbuild.mjs`) predicted that the generated Vercel function would drop `drizzle-orm`, `postgres`, `jose`, `nodemailer`, because only `react`/`react-dom` appear in the function's `node_modules`. **That prediction was never confirmed by a failing deploy**, and the source does not support it for pure-JS packages: `adapters/adapter-vercel/src/bundleForDeploy.ts:88` runs esbuild with `external: ["react", "react-dom", "react-dom/*"]` only, so everything else is inlined into `dist/server`.
**UPDATE 2026-10-12 — a related failure is now confirmed (see V8)**: inlining is not safe for CommonJS packages. Khepra's deployed function crashed with `Dynamic require of "events" is not supported` from `pg` because the ESM bundle has no `createRequire` banner. So "esbuild inlines it" does not mean "it works".
**What is still a real risk**: packages that cannot be inlined — native addons (`argon2`, `better-sqlite3`), anything resolving binaries at runtime, and (to be checked) database drivers/ORMs with engine files. Khepra (Prisma 7 + pg adapter, 17 MB function) has not yet seen a deployed function serve a request, so Prisma-on-Vercel is also unverified. The framework's own `CLAUDE.md` says live deploys were "confirmed" — true when written, but those demo apps have no database or native dependencies, and the claim is now stale anyway (see the `nodejs20.x` item below).
**Fix**: add a CI test that builds and runs the generated function for an app with a native dependency and a database client; document which dependency classes are supported.

### Backend code is duplicated per-app in the production bundle
Each app's production bundle includes its own full copy of shared backend code, including the database module. Harmless in one long-running Node process; on serverless, every function invocation carries its own duplicate copy — unclear whether this is a cold-start/bundle-size problem in practice, but worth knowing about before scaling to several apps × several serverless functions each.

### No automatic `.env` loading
The CLI doesn't load `.env` files on its own — required running it through `node --env-file` manually. Easy to forget, and a silent, confusing source of "why isn't my config set" for anyone used to Next.js/Vite's built-in `.env` support.
**Fix**: load `.env`/`.env.local` automatically the way most comparable frameworks do, or document loudly that it's required if that's a deliberate choice.

### Types are loose enough that a fresh project doesn't typecheck out of the box
`session`/`setSession` and some component/React-binding return types resolve to `unknown`, which forced casts in a freshly scaffolded project before `tsc` would pass clean. This is a separate, independent confirmation of the type-system concern already listed under "Unconfirmed #6" above (that one was about a specific `.d.ts` file breaking consuming-app typechecks with concrete TS error codes) — together, two engineers on two different products both had to fight the framework's own types to get a clean `tsc --noEmit`.
**Fix**: tighten core types and test the published `.d.ts` against a genuinely fresh `create-devora` scaffold in the framework's own CI, not just against the framework's internal code.

### `devora add api` (backend-only app scaffolding) still generates unneeded page-app files
Scaffolding a backend-only app produced page-app files that had to be deleted by hand. This may be a sign that the `create-devora` scope prompt (full-stack/frontend/backend) implemented and verified earlier in this project hasn't fully reached the `devora add` code path, or that it's not yet released — worth checking whether this is the same gap already tracked as pending (the coordinated core+cli+create-devora release for optional `shared.backend`) or a genuinely separate scaffolding bug in `devora add` specifically.

### Dev-server cold-start glitch: transient "invalid hook call" errors from Vite re-optimizing dependencies
On the very first page load after a fresh `devora dev` start, React threw "invalid hook call" errors while Vite was re-optimizing dependencies. Resolved itself on the second load/refresh. Not confirmed as Devora-specific (could be an underlying Vite dependency pre-bundling quirk), but worth a documented "if you see this on first load, just refresh" note so newcomers don't think the framework is broken.

### CSRF cookie is set even on JSON responses to bearer-only clients, with no opt-out
Devora sets a CSRF cookie on JSON API responses even when the client authenticates via Bearer token and the cookie serves no purpose for that client. No documented way to disable it for bearer-only apps.
**Fix**: skip setting the CSRF cookie when the response is to a request that authenticated via Bearer, or add an explicit per-app opt-out.

### Docs present conflicting claims about render-mode maturity
At least one documented claim says the streaming render mode is deferred/not yet done, while another place in the docs says it's complete — a direct contradiction, not just a stale-version mismatch. Worth a pass to find and reconcile every maturity claim across the docs, since this is exactly the kind of inconsistency that erodes trust once someone notices it (the same root concern as the version-badge and "(v2)" label issues already fixed in reviews 1–2).

---

## Known limitation, confirmed real — not a bug, needs honest docs + eventual fix

### Shared login does not carry across subdomains
In 0.3.1 the session cookie has no `Domain` attribute, so a browser only sends it back to the exact host that set it. Verified directly: logging in on `dashboard.example.com` does not authenticate `admin.example.com`, even though both are configured as `shared`-auth apps in the same project — which is the scaffold's own default multi-app layout.
**What this means**: "shared login across apps" claims are only true when every app is served from the same host (e.g. path-based routing, or a single domain), not the more common subdomain-per-app layout.
**Fix**: add a `sessions.cookie.domain` config option so a project can opt into a parent-domain cookie (e.g. `.example.com`) when its apps are genuinely subdomains of one domain. Until that exists, the docs should state this limitation plainly wherever "shared login" is claimed (core-concepts and /compare already do, per the second review — verify this is still accurate and extend to any other page that makes the same claim, e.g. the landing page).

---

## Also still open, unrelated to the framework itself

- **`devora --version` prints 0.1.0** — hardcoded at `packages/cli/src/index.ts:20`, even when the real installed CLI is 0.3.x. Needs a code fix and a release.
- **Docs still reference bare `devora` commands that fail as written** (no local install puts `devora` on PATH): `first-feature.tsx:141` and the Docker section of `deployment.tsx:238` were flagged as not yet fixed as of the second review — confirm current status before re-flagging as duplicate work.
- **`deployment.tsx` session-store step** — the second review added this; confirm it shipped (it was staged, not committed, as of that pass).
- **Rename internal project packages away from the `@devorajs/*` npm scope** (`@devorajs/backend`, `db`, `storage`, `i18n`, `design-tokens` in the *consuming* project, not the framework). If devora.js ever publishes a real `@devorajs/i18n` or `@devorajs/storage`, it collides with the internal package. Cheap now, more annoying later.
- **Drop now-redundant hand-rolled error wrappers** (`ApiError`/`withErrorHandling`, `middleware.ts` error-wrapping) now that native `apiRoute()`/`HttpError`/`apiErrorResponse` cover the same ground — `getHttpErrorStatus()` already duck-types on `.status`/`.statusCode`, a strong hint this is an expected transition, not an oversight.
- **Audit for lingering imports of `signSession`/`verifySession`** — marked `@deprecated` in framework source, slated for removal.

---

## Suggested order of work

1. **Fix the Vercel and Netlify adapters first (V1, V2, V3, V8)** — the hardcoded `nodejs20.x` runtime and the missing `createRequire` banner (CommonJS dependencies like `pg` crash at first request) are each small changes that unblock real deploys, and the `api/` collision / monorepo layout needs a decision (`apiDir`, `.vercelignore`, `--out`) plus a bold docs page. Two real projects failed on these; both worked around them with custom scripts.
2. **Fix the cookie `Secure` flag (confirmed in source)** — `sessions.cookie.secure: "auto"` + `trustProxy`; it breaks production logins over plain HTTP. Add the `SameSite`/`noindex`/session-lifetime settings (K1) in the same config pass so nobody has to patch core.
3. Fix the **Confirmed STILL BROKEN** items backed by two independent products each: the head/root-layout API (including the unwanted global-style/favicon injection and unlinked route CSS, K3), request access in loaders/actions (query string + headers + IP), and actions returning data instead of only redirecting. These are the highest-confidence items in the document — not single-report findings.
4. Fix island discovery (shared-component support, or fail the build loudly — confirmed by YallaDo and Khepra, K2) and decide on API response streaming/cookie-setting. Document real-time patterns (WebSocket/SSE are absent in the source).
5. Re-verify the rest of the "Unconfirmed" section against current source — don't assume fixed, don't assume broken, check each one (action error status codes, uploads, types, build-time execution, PORT/HOST, adapter validation, CLI duplicate core, strictPort, React 19, engines, ROADMAP.md links).
6. Test the Vercel/Netlify function with a native dependency and a database client (dependency bundling is unverified, not confirmed broken), and add a Vercel preflight check (V7).
7. Add `sessions.cookie.domain` for true cross-subdomain shared login, and make every doc page that claims "shared login" state the current limitation until it ships.
8. Fix `devora --version`, the remaining bare-`devora` doc examples, confirm the deployment.tsx session-store step shipped, reconcile the conflicting render-mode maturity claims, and update the "confirmed live on Vercel" claim in `CLAUDE.md`/docs.
9. Smaller fixes worth bundling: automatic `.env` loading (K5), a CORS helper (K4), the CSRF-cookie opt-out for bearer-only clients, the `devora add api` backend-only scaffolding cleanup, the API-only `/` pre-render (K6), the adapter log line (V5), and documenting the first-load Vite re-optimization glitch.
10. Consider official Postgres/Redis session store packages and a built-in health-check route as a v2.x+ roadmap item — not urgent.
11. Do the two project-only cleanups (package renaming, dropping redundant error wrappers) whenever convenient — no dependency on the framework.

## If filing these as GitHub issues
Use the real reproduction steps from the reviewed project for each item rather than writing synthetic ones — that's what makes these credible, actionable reports instead of speculative ones. Happy to draft the issue text for any subset once you've picked which ones to file.
