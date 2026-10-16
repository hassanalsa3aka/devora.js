# Roadmap

Devora.js is early and pre-1.0, built by one person. This page is the single status document: what has shipped, version by version; what is done, partial, open and planned; what the 14 build items were; where each live deployment stands; and every finding testers or audits raised, with its status. The long, dated account of how each piece was built and verified is the [build log](docs/history/BUILD-LOG.md); every release block below is taken from [CHANGELOG.md](CHANGELOG.md) and the git tags (`v0.3.2` and `v0.3.4` are the only tags).

Status words in the tables: **Fixed** (a release, and a file, test or CHANGELOG line that proves it), **Partly fixed**, **Open**, **Unconfirmed** (never reproduced or checked; not guessed), **N/A**.

## Now

- Outside testers: [TESTING.md](TESTING.md) is a 15-minute guide; what they hit goes into the findings table below.
- Ship the clear "no session store configured" message (CHANGELOG "Unreleased") and the package README links.
- Verify 0.3.4 on a live Vercel and Netlify deployment (finding N1).

## Next

Open findings, in a **proposed** order by impact. The order is a proposal for the maintainer to confirm or change; nothing here has a version or a date.

| Order | Finding | Why it ranks here |
|-------|---------|-------------------|
| 1 | N1: 0.3.4 not verified on a live deployment | Every deploy claim depends on it |
| 2 | B5: several `Set-Cookie` headers and SSE from API routes | A real capability gap testers hit |
| 3 | O4: the scaffold writes `@devorajs/backend` into new projects | Name could collide with a future real package; harder to change later |
| 4 | U13, U14: an official session-store pattern or package; a built-in health route | Every production app needs both |
| 5 | P14: `adb reverse` docs for testing on a physical device | Small, docs only |
| 6 | U4: `apiRoute()` catches errors itself, so an outer wrapper cannot see them | Surprising for logging and monitoring wrappers |
| 7 | O5: `signSession`/`verifySession` still exported (deprecated) | A removal is a breaking change |
| 8 | V6, Y2: one large function per app; backend duplicated per app | Never measured; measure first |
| 9 | N3, X2: `isr` regeneration on a serverless filesystem | Verified only under adapter-node |
| 10 | N2, N4, N5: container platforms, systemd unit, DB client under load | Need real hosts or load tests |
| 11 | U9, X1: the CLI bundles core; dynamic `ssg`/`isr` needs `getStaticParams()` | By design; documented, not defects |

Kept as **Unconfirmed**, not ranked: Y1 (native addons on serverless), Y6 (transient "invalid hook call"), O2 (bare `devora` commands in docs pages).

Also open: move the `esbuild` override out of `package.json`'s `"pnpm"` field (pnpm 11 ignores it).

## Later

- A third-party security audit and signed release provenance, once the API surface settles.

## Vision (not started, no dates)

- A desktop app and a native mobile app. If they happen, business logic, the backend client, validation and design tokens would be shared and the UI would be platform-specific. React was chosen partly to keep that door open.

## Ideas (open, not promised)

Nothing here is planned, scheduled or numbered.

- *Example:* an idea goes here as one line, with no version and no date. (The maintainer fills this in.)

## Performance program

The aim is to close the gaps and publish measured results, including where Devora.js is behind. Numbers come from the benchmark harness in [benchmarks/](benchmarks/README.md) and are never edited by hand.

State after the first pass (the changes are in CHANGELOG "Unreleased", not released): Devora.js leads the pre-rendered page, the server-rendered page and the form POST in the five-framework harness, and is 4th to 6th of 10 on the JSON API scenarios, behind Fastify, Hono and NestJS on Fastify (findings S1 to S4). The numbers are in [benchmarks/results/before-after.md](benchmarks/results/before-after.md).

## Not planned

- A built-in ORM, auth provider or file storage (bring your own).
- A real-time sync engine (use a realtime server, see [Live updates (WebSockets)](docs/guides/REALTIME.md)).
- A custom RSC-style serialization protocol.

Everything else is indexed in [docs/README.md](docs/README.md).

## Done, by version

### 0.3.4 — 2026-10-16 (tag `v0.3.4`)
- Catch-all routes (`[...slug]`, `[[...slug]]`) for pages and API routes; `ctx.params` stays a string, the array is `ctx.catchAll`.
- Faster pre-rendered pages (served from memory with ETag and compression), correct content types, and sitemap URLs from `getStaticParams()`.
- A documented live-updates pattern with a runnable example; publish scripts refuse to publish an empty `dist/`.
- [CHANGELOG: 0.3.4](CHANGELOG.md#034--2026-10-16)

### 0.3.3 — never published
- Prepared and rolled into 0.3.4. [CHANGELOG: 0.3.4](CHANGELOG.md#034--2026-10-16) says so.

### 0.3.2 — 2026-10-12 (tag `v0.3.2`)
- Request access in loaders and actions, action results (`fail()`, 303 redirects), error pages, the head API, uploads, CORS, `.env` loading.
- Cookie and proxy settings; the Vercel runtime is no longer hard-coded; the first published `@devorajs/adapter-node`.
- Adapters 0.2.0/0.2.2 had been published without their build output and were replaced by 0.2.1/0.2.3.
- [CHANGELOG: 0.3.2](CHANGELOG.md#032--2026-10-12)

### 0.3.1 — 2026-09-24
- `create-devora` scope: `--scope=fullstack|frontend|backend`; `devora --version` reports the real version.
- The Vercel and Netlify adapters no longer fail on a backend-only app.
- [CHANGELOG: 0.3.1](CHANGELOG.md#031--2026-09-24-scaffolder-scope-hotfix-12)

### 0.3.0 — 2026-09-23
- Breaking: unified session auth — opaque IDs in a `SessionStore` you provide, one lookup for cookie and Bearer, revocation.
- `api/**` always answers JSON; `devora dev --host`; dev ports start at 10000.
- [CHANGELOG: 0.3.0](CHANGELOG.md#030--2026-09-23-pre-v3-hotfixes)

### 0.2.2 and 0.2.1
- No CHANGELOG entry.

### 0.2.0 — 2026-09-16
- The v2 backend: `defineModule()`, API routes, middleware, backend-only apps, `getStaticParams()` for `ssg`/`isr`.
- Repo-splitting (`devora split`, `sync`, `status`) and the `streaming` render mode.
- A security audit pass: cross-app cookie binding, request-body caps, path-traversal fixes, a 405 for undeclared API methods.
- [CHANGELOG: 2026-09-16](CHANGELOG.md#2026-09-16)

### 0.1.x
- 0.1.1 and `@devorajs/cli` 0.1.2 — 2026-09-08: the npm scope became `@devorajs`, the shared scaffold package, per-package READMEs. [CHANGELOG: 2026-09-08](CHANGELOG.md#2026-09-08)
- `@devorajs/core` 0.1.2: no CHANGELOG entry.
- 0.1.0: the CHANGELOG records only the initial commit, 2026-09-07 (SSR/SSG/CSR/ISR, islands, sessions, security headers, SEO, the CLI, the three adapters), without a version number. [CHANGELOG: 2026-09-07](CHANGELOG.md#2026-09-07)
- 2026-09-09 has a CHANGELOG entry (CI fix, docs) with no version bump. [CHANGELOG: 2026-09-09](CHANGELOG.md#2026-09-09)

## Definition of success (from [architecture-v1 §14](docs/design/architecture-v1.md))

> v1 is "done" when: a solo/small team can build a real project with a marketing site + app + admin
> panel sharing auth and a core, deploy each independently, get good SEO out of the box, and not
> hit a single `window is not defined` crash from a client library — all without needing to read
> framework internals to understand why something cached or didn't.

Unpacked, that requires five things to all be true at once:

1. Routes actually render (SSR/SSG/CSR/streaming/ISR per `renderMode`) — SSR (#1), SSG/CSR/ISR
   (#12) done in v1; `"streaming"` was deferred from v1 and shipped in v2
   (`docs/design/architecture-v2.md` §4).
2. Auth/session context is real, shared by default, isolable per app — done (#2, #10).
3. Client-only libraries (three.js, fabric.js, etc.) never crash on the server — done (#9),
   `clientOnly()` itself now verified with a real negative control, not just islands as an analog.
4. Each app deploys independently to at least one real target — done: `adapter-node`, Vercel, and
   Netlify were all deployed live by the maintainer with releases before 0.3.2, via both git
   integration and `devora deploy`. A live deployment of 0.3.4 is not yet verified on a live deployment by this project (its generated
   functions were run outside the monorepo). See [#4](docs/history/BUILD-LOG.md#4-adapters-real-build-output-not-just-config---done-including-real-live-vercel-and-netlify-deployments) and [#13](docs/history/BUILD-LOG.md#13-multi-app-aware-vercelnetlify---done-including-a-real-authenticated-deploy-on-both-platforms).
5. SEO primitives work — done (#7): OG tags + per-app opt-in sitemap.xml, both verified.

All five are now unconditionally true. What's left is narrower: `isr`'s regeneration reliability
on a serverless filesystem specifically — see the Status section immediately below.

## Status board

Restored in full from the old roadmap (kept in the [build log](docs/history/BUILD-LOG.md)) and brought up to 0.3.4. Where a line changed, the change is noted in *italics*.

### Done: built and verified

Automated tests versus manual checks are listed in [VERIFICATION.md](docs/history/VERIFICATION.md).

- SSR, SSG, CSR, ISR and streaming rendering (`renderMode`): #1, #12, [architecture-v2 §4](docs/design/architecture-v2.md)
- Sessions, CSRF, and per-app auth modes (`shared`/`isolated`/`none`): #2, #10
- Security headers (CSP/HSTS/X-Frame-Options) on by default: #5
- Islands / partial hydration, in dev and production: #3
- SEO primitives: OG tags, opt-in `sitemap.xml`: #7
- Dynamic routes (`routes/users/[id].tsx`), with `getStaticParams()` for `ssg`/`isr`: #1, [architecture-v2 §3.6](docs/design/architecture-v2.md). *Catch-all routes (`[...slug]`, `[[...slug]]`) shipped in 0.3.4; the old line said there were none.*
- v2 backend: modules, generic API routes (`apiDir`), middleware, backend-only apps, repo-splitting: [architecture-v2](docs/design/architecture-v2.md)
- 0.3.2: request access in loaders/actions, action results, error pages, the head API, uploads, cookie/proxy settings, CORS, `.env` loading, the published `@devorajs/adapter-node`: [CHANGELOG](CHANGELOG.md)
- 0.3.4: catch-all routes, the static file cache, correct content types and sitemap URLs from `getStaticParams()`, the live-updates pattern: [CHANGELOG](CHANGELOG.md#034--2026-10-16)
- `clientOnly()`: #9
- The `devora` CLI, working under npm/Yarn/pnpm: #8
- `adapter-node`, `adapter-vercel`, `adapter-netlify`: build output verified in isolation: #4
- Live deployment to Vercel and Netlify via git integration (both platforms, all three apps), by the maintainer with releases before 0.3.2: #4
- `devora deploy` (`vercel link`/`netlify link` orchestrated): a real, authenticated deploy on both platforms with a release before 0.3.2: #13
- Docker, self-hosted VPS (nginx/Caddy; the systemd unit template is untested), GitHub Actions CI: #14

### In progress / partial

- 0.3.4 on a live Vercel/Netlify deployment: not yet verified by this project (the generated functions were run outside the monorepo)
- `isr` on Vercel/Netlify: the initial build's static output serves correctly; ongoing regeneration on a serverless function's non-persistent filesystem is unverified: #12
- Domain auto-binding for a `devora deploy`-managed app: not built, deliberately scoped out of that pass: #13

### Known gaps, not scheduled yet

- Several `Set-Cookie` headers and streamed responses (SSE) from API routes
- Moving the `esbuild` override out of `package.json`'s `"pnpm"` field (pnpm 11 ignores it; see [CONTRIBUTING](CONTRIBUTING.md))

### Planned

- A formal third-party security audit and signed release provenance, once the API surface stabilizes

### Deliberately out of scope, not planned

Built-in ORM/auth/file storage, a real-time sync engine, a custom RSC-style serialization protocol ([architecture-v1 §11](docs/design/architecture-v1.md)).

### Planned goals, not started

Desktop and native mobile apps. Nothing exists yet and there are no dates. If they happen, the business logic, backend client, validation and design tokens would be shared and the UI would be platform-specific. React (rather than Solid/Qwik) was chosen partly to keep that door open.

## The 14 work items

Each item is described in the [build log](docs/history/BUILD-LOG.md) as it was when it landed.

| # | Item | Status | Section |
|---|------|--------|---------|
| 1 | SSR request handler (blocks nearly everything else) | done | [#1](docs/history/BUILD-LOG.md#1-ssr-request-handler-blocks-nearly-everything-else---done) |
| 2 | Request context (`ctx.requireAuth()` / `ctx.session`) | done | [#2](docs/history/BUILD-LOG.md#2-request-context-ctxrequireauth--ctxsession---done) |
| 3 | Islands / partial hydration | done, in both dev and production | [#3](docs/history/BUILD-LOG.md#3-islands--partial-hydration---done-in-both-dev-and-production) |
| 4 | Adapters: real build output, not just config | done, including real live Vercel and Netlify deployments | [#4](docs/history/BUILD-LOG.md#4-adapters-real-build-output-not-just-config---done-including-real-live-vercel-and-netlify-deployments) |
| 5 | CSP/HSTS enforcement | done | [#5](docs/history/BUILD-LOG.md#5-csphsts-enforcement---done) |
| 6 | DB client | checked; a real issue was found, and a verified fix is now documented as a guide | [#6](docs/history/BUILD-LOG.md#6-db-client---checked-a-real-issue-was-found-and-a-verified-fix-is-now-documented-as-a-guide) |
| 7 | SEO primitives | done | [#7](docs/history/BUILD-LOG.md#7-seo-primitives---done) |
| 8 | `devora` CLI bin | done | [#8](docs/history/BUILD-LOG.md#8-devora-cli-bin---done) |
| 9 | `clientOnly()` verification | done | [#9](docs/history/BUILD-LOG.md#9-clientonly-verification---done) |
| 10 | Redirects, login/logout, CSRF, `Secure` cookie | done | [#10](docs/history/BUILD-LOG.md#10-redirects-loginlogout-csrf-secure-cookie---done) |
| 11 | `entry-server.tsx` de-duplication | done (pure refactor, prerequisite for #10/#12) | [#11](docs/history/BUILD-LOG.md#11-entry-servertsx-de-duplication---done-pure-refactor-prerequisite-for-1012) |
| 12 | Render modes: `ssg`, `csr`, `isr` real; `streaming` explicitly deferred to v2 | done | [#12](docs/history/BUILD-LOG.md#12-render-modes-ssg-csr-isr-real-streaming-explicitly-deferred-to-v2---done) |
| 13 | Multi-app-aware Vercel/Netlify | done, including a real authenticated deploy on both platforms | [#13](docs/history/BUILD-LOG.md#13-multi-app-aware-vercelnetlify---done-including-a-real-authenticated-deploy-on-both-platforms) |
| 14 | Three more environments tried for real — Docker, a bare VPS (nginx/Caddy), CI | done | [#14](docs/history/BUILD-LOG.md#14-three-more-environments-tried-for-real--docker-a-bare-vps-nginxcaddy-ci---done) |

## Live deployment history

Only the maintainer can deploy live; none of this was run from the development environment.

- **Vercel, git integration**: all three demo apps confirmed live with releases before 0.3.2. Three bugs only a live deploy found were fixed: missing `react` in the function, `jsxDEV is not a function` (`NODE_ENV` unset in the build step), and ([build log #4](docs/history/BUILD-LOG.md#4-adapters-real-build-output-not-just-config---done-including-real-live-vercel-and-netlify-deployments)).
- **Netlify, git integration**: all three demo apps confirmed live, before 0.3.2. Bug found live: `Could not resolve entry module "index.html"` (a `netlify.toml` that was only build output); fixed by a committed `netlify.toml` per app, then `package.json` and `node_modules` listed in `included_files` (2026-09-16).
- **`devora deploy`**: a real authenticated deploy on both platforms with a release before 0.3.2 ([#13](docs/history/BUILD-LOG.md#13-multi-app-aware-vercelnetlify---done-including-a-real-authenticated-deploy-on-both-platforms)). Domain auto-binding not built.
- **Docker**: real `docker build`/`run`/`compose up`, login/CSRF/tampered-cookie regression inside the container, all three apps concurrently ([#14](docs/history/BUILD-LOG.md#14-three-more-environments-tried-for-real--docker-a-bare-vps-nginxcaddy-ci---done)). Not verified: container platforms (Cloud Run, App Runner/Fargate, Azure Container Apps).
- **VPS**: `devora generate:proxy` verified against a real local nginx and `caddy validate`; one shared port scheme. The `deploy/devora.service` systemd template is untested on a host.
- **CI**: `.github/workflows/ci.yml` builds every app under npm, Yarn and pnpm, both adapter targets, and typechecks fresh scaffolds.
- **0.3.4 live**: not yet verified on a live deployment by this project. The Vercel runtime hardcoded `nodejs20.x` before 0.3.2, so a new deploy of the older releases fails; 0.3.4's generated functions were run outside the monorepo only.

## Findings

79 findings from [the pre-v3 hotfix list](docs/history/devora-pre-v3-hotfixes.md) (P1 to P14), [hotfix round 3](docs/history/devora-hotfix-round3.md) (C = confirmed fixed, B = still broken at 0.3.1, U = unconfirmed, V = Vercel, K = Khepra, Y = YallaDo-only, L, O) and [VERIFICATION.md](docs/history/VERIFICATION.md) (N, X). Fixed 51, Partly fixed 4, Open 20, Unconfirmed 3, N/A 1.

| ID | Finding | Status | Version | Evidence | Described in |
|----|---------|--------|---------|----------|--------------|
| P1 | Published package was behind the docs (core 0.1.2 lacked defineModule/apiRoute) | Fixed | 0.3.0 | create-devora pins ^0.3.0 (CHANGELOG 0.3.0); core 0.3.0 to 0.3.4 are on npm. The suggested CI check that fails a docs deploy when versions differ does not exist. | pre #1 |
| P2 | apiRoute() was a no-op; uncaught errors leaked HTML to API clients | Fixed | 0.3.0 | packages/core/src/httpError.ts + apiRoute.ts wrapper; real-server tests devServer/prodServer.integration (JSON 500, message hidden in production); CHANGELOG 0.3.0 | pre #2 |
| P3 | Dev server localhost-only; no --host, no LAN URL | Fixed | 0.3.0 | devora dev --host, packages/cli/src/server/devNetwork.ts; CHANGELOG 0.3.0 | pre #3 |
| P4 | No route listing on dev boot | Fixed | 0.3.0 | CHANGELOG 0.3.0 (boot output includes each app's route table); packages/cli/src/terminal/bootSummary.ts | pre #4 |
| P5 | Hand-rolled Bearer tokens never expire, cannot be revoked | Fixed | 0.3.0 | Superseded by the unified session auth: opaque IDs in a SessionStore, active/idle/dead states, ctx.revokeSession(); CHANGELOG 0.3.0 (breaking) | pre #5 |
| P6 | Unmatched /api/** returned HTML | Fixed | 0.3.0 | isApiPath() in packages/core/src/apiRoute.ts; prodServer.integration test 'unmatched /api/** paths are a JSON 404' | pre #6 |
| P7 | Cookie-only auth, no Bearer support | Fixed | 0.3.0 | One lookup for cookie and Authorization: Bearer; CHANGELOG 0.3.0 | pre #7 |
| P8 | Action return values discarded; loaders had no query string | Fixed | 0.3.2 | actionData / fail() / 303, ctx.url (CHANGELOG 0.3.2, Request access and Actions return data) | pre #8 |
| P9 | No <head> customization hook | Fixed | 0.3.2 | Head API: defineApp({ head }) and meta().head (CHANGELOG 0.3.2) | pre #9 |
| P10 | No backend 'batteries' (logging, CORS, rate limiting, validation, uploads, jobs, realtime, email, test utilities) | Partly fixed | 0.3.2 / 0.3.4 | CORS (0.3.2), multipart uploads (0.3.2), realtime pattern (0.3.4, docs/guides/REALTIME.md), background jobs (three tested patterns, docs/guides/BACKGROUND-JOBS.md) and the /backend-capabilities docs page. Pagination helpers, background jobs, email, test utilities: not built, no plan. | pre #10 |
| P11 | Default dev port collisions | Fixed | 0.3.0 | Ports 10000 + index, devPort, fall-forward with a log line; CHANGELOG 0.3.0; devNetwork.ts | pre #11 |
| P12 | create-devora all-or-nothing, no frontend- or backend-only mode | Fixed | 0.3.1 | --scope=fullstack\|frontend\|backend; CHANGELOG 0.3.1 | pre #12 |
| P13 | Dev LAN exposure needs an explicit, opt-in posture and a warning | Fixed | 0.3.0 | --host opt-in only; one-line warning when bound beyond loopback; CHANGELOG 0.3.0 | pre #13 |
| P14 | 'Testing on a physical device' (adb reverse) is undocumented | Open | - | No 'adb reverse' text exists in this repo or the docs site (searched both). | pre #14 |
| C1 | No route listing on dev boot | Fixed | 0.3.0 | Same as P4 | r3 confirmed 1 |
| C2 | Dev server localhost-only | Fixed | 0.3.0 | Same as P3, P13 | r3 confirmed 2 |
| C3 | No native Bearer auth | Fixed | 0.3.0 | Same as P7 | r3 confirmed 3 |
| C4 | apiRoute() leaked HTML errors | Fixed | 0.3.0 | Same as P2 | r3 confirmed 4 |
| C5 | An isolated app's session could be replayed with a shared app's cookie | Fixed | 0.2.0 | CHANGELOG 2026-09-16: cookies are cryptographically bound to their own cookie name | r3 confirmed 5 |
| C6 | CSRF skipped for Bearer, enforced for cookies | Fixed | 0.3.0 | CHANGELOG 0.3.0: verifyCsrf() skipped for Bearer-authenticated requests | r3 confirmed 6 |
| B1 | No head hook; framework injected body{display:flex} and favicon unasked | Fixed | 0.3.2 | Head API; stylesheet and favicon only on pages rendering PageShell/AppHeader (CHANGELOG 0.3.2 Behavior changes) | r3 broken 1 |
| B2 | Loaders had no query string, headers or client IP | Fixed | 0.3.2 | ctx.url, ctx.headers, ctx.ip, ctx.method, ctx.request (CHANGELOG 0.3.2) | r3 broken 2 |
| B3 | Actions could only redirect | Fixed | 0.3.2 | actionData and fail() (CHANGELOG 0.3.2) | r3 broken 3 |
| B4 | island() found only in route files; islands are separate React roots | Partly fixed | 0.3.2 | Islands found in every imported module and checked with the parser (CHANGELOG 0.3.2). Islands still have no shared React context; the documented workaround is a shared store or browser events. | r3 broken 4 |
| B5 | API responses fully buffered: no SSE from an API route, one Set-Cookie (WebSockets: a separate realtime server and `ws` through a wrapper both work) | Open | - | No text/event-stream or WebSocket code in packages/ (searched). WebSockets: documented pattern with a separate server (0.3.4, docs/guides/REALTIME.md). A handler still sets headers as a plain object, so one Set-Cookie. | r3 broken 5 |
| U1 | Cookie Secure flag hardcoded to production; plain-HTTP logins fail | Fixed | 0.3.2 | sessions.cookie.secure: true \| 'auto' \| false, trustProxy (CHANGELOG 0.3.2) | r3 unconfirmed 1 |
| U2 | Errors thrown in page actions became generic 500s; redirect after POST was 302 | Fixed | 0.3.2 | HttpError keeps its status, error.tsx, 303 (CHANGELOG 0.3.2 Behavior changes) | r3 unconfirmed 2 |
| U3 | Page actions could not receive file uploads | Fixed | 0.3.2 | Multipart uploads as File objects, maxBodyBytes (CHANGELOG 0.3.2) | r3 unconfirmed 3 |
| U4 | apiRoute() catches errors itself, so a wrapper outside it cannot see the original error | Open | - | packages/core/src/apiRoute.ts still returns apiErrorResponse(err) from inside the wrapper. A wrapper inside apiRoute() sees the error; outside it sees a JSON response. By design, not re-decided. | r3 unconfirmed 4 |
| U5 | devora build executed every server file, even request-time-only ones | Fixed | 0.3.2 | 'devora build only imports ssg/isr routes' (CHANGELOG 0.3.2 Behavior changes) | r3 unconfirmed 5 |
| U6 | Type definitions broke tsc --noEmit in consuming apps (CsrfField returned unknown) | Fixed | 0.3.2 | CsrfField returns ReactElement (packages/core/src/csrf.ts:51; CHANGELOG 0.3.2 Types); CI typechecks fresh scaffolds (scripts/typecheck-fresh-scaffold.mjs) | r3 unconfirmed 6 |
| U7 | devora start ignored PORT/HOST | Fixed | 0.3.2 | CHANGELOG 0.3.2: devora start reads PORT and HOST | r3 unconfirmed 7 |
| U8 | --adapter accepted any value silently | Fixed | 0.3.2 | CHANGELOG 0.3.2 Behavior changes; CLI test 'rejects an unknown adapter before building anything' | r3 unconfirmed 8 |
| U9 | The CLI bundles its own copy of core | Open | - | By design: packages/cli/build.mjs inlines @devorajs/core. A core fix reaches dev/start only with a CLI release; the upgrade steps say to upgrade both together. | r3 unconfirmed 9 |
| U10 | Dev server silently moved to another port | Partly fixed | 0.3.0 | Falls forward with a log line (CHANGELOG 0.3.0); no strict option for an explicit devPort. | r3 unconfirmed 10 |
| U11 | React-18-only peer range, no engines field | Fixed | 0.3.2 | peer ^18.3.0 \|\| ^19.0.0; engines node >=20 (CHANGELOG 0.3.2) | r3 unconfirmed 11 |
| U12 | Error messages pointed to ROADMAP.md | Fixed | 0.3.2 | CHANGELOG 0.3.2: error messages link the docs | r3 unconfirmed 12 |
| U13 | No official session store | Open | - | No store package ships; patterns in packages/backend/AUTH.md and the docs site /deployment page. | r3 unconfirmed 13 |
| U14 | No built-in health-check route | Open | - | A backend-only app answers GET / with a JSON status (CHANGELOG 0.3.2); no dedicated /_devora/health route. | r3 unconfirmed 14 |
| V1 | Adapter hardcoded the discontinued nodejs20.x runtime | Fixed | 0.3.2 | CHANGELOG 0.3.2: vercel.runtime, else running Node major, else engines.node, else nodejs24.x | r3 V1 |
| V2 | apps/<name>/api collides with Vercel's reserved api/ folder | Fixed | 0.3.2 | apiDir (new apps use endpoints/); preflight warns about a top-level api/ (CHANGELOG 0.3.2) | r3 V2 |
| V3 | Scaffolded vercel.json not workspace-aware; no --out | Fixed | 0.3.2 | devora build --out <dir> with --adapter=vercel --app=<name> (CHANGELOG 0.3.2) | r3 V3 |
| V4 | No documented build hook for codegen on a clean checkout | Fixed | 0.3.2 | defineApp({ prebuild: [...] }) (CHANGELOG 0.3.2) | r3 V4 |
| V5 | Misleading adapter log line 'NOT deployed ... see ROADMAP.md #4' | Fixed | 0.3.2 | Log line replaced (CHANGELOG 0.3.2); the string no longer exists in adapters/ or packages/ (searched) | r3 V5 |
| V6 | Single 17 MB function per app | Open | - | Still one function per app; size and cold start under an ORM were never measured. | r3 V6 |
| V7 | Suggested preflight check before a Vercel build | Fixed | 0.3.2 | Preflight checks: runtime, api/ at the Vercel root, session secret per auth mode, --out location (CHANGELOG 0.3.2) | r3 V7 |
| V8 | ESM bundle broke CommonJS dependencies at first request (pg) | Fixed | 0.3.2 | createRequire banner in both esbuild passes of both adapters (CHANGELOG 0.3.2; adapters/adapter-vercel/src/bundleForDeploy.ts; runtime.test.ts) | r3 V8 |
| K1 | No SameSite / noindex / per-app session lifetimes | Fixed | 0.3.2 | cookie.sameSite, security.noindex, activeSeconds/idleSeconds (CHANGELOG 0.3.2) | r3 K1 |
| K2 | island() discovery silent outside route files | Fixed | 0.3.2 | Same as B4; unsupported island() calls fail the build with file and line | r3 K2 |
| K3 | Route-imported CSS not linked in SSR/SSG HTML | Fixed | 0.3.2 | docs/guides/PAGES.md 'CSS imported by a route'; build writes dist/server/route-css-manifest.json | r3 K3 |
| K4 | No built-in CORS helper | Fixed | 0.3.2 | defineApp({ cors }) (CHANGELOG 0.3.2); packages/core/src/cors.ts | r3 K4 |
| K5 | Monorepo .env convention undocumented | Fixed | 0.3.2 | .env files loaded by dev, build, start, deploy (CHANGELOG 0.3.2) | r3 K5 |
| K6 | API-only apps pre-render / | Fixed | 0.3.2 | A backend-only build prints no 'pre-rendered' line (run during this audit on a fresh backend scaffold) | r3 K6 |
| K7 | Questions Khepra asked the team | N/A | - | Questions, not defects; answered by the 0.3.2 settings above. | r3 K7 |
| Y1 | Dependency bundling for native addons / ORM engines on serverless | Unconfirmed | - | Never confirmed by a failing deploy; no test bundles a native addon. | r3 YallaDo |
| Y2 | Backend code duplicated per app in the production bundle | Open | - | Not measured; each app is built separately. | r3 YallaDo |
| Y3 | No automatic .env loading | Fixed | 0.3.2 | Same as K5 | r3 YallaDo |
| Y4 | Fresh project did not typecheck (loose types) | Fixed | 0.3.2 | Same as U6; scaffolds ship typescript, @types/* and a typecheck script (CHANGELOG create-devora 0.3.1 entry) | r3 YallaDo |
| Y5 | devora add api generated unneeded page-app files | Fixed | 0.3.2 | devora add --kind=pages\|api (CHANGELOG 0.3.2) | r3 YallaDo |
| Y6 | Transient 'invalid hook call' on first dev load (Vite re-optimization) | Unconfirmed | - | Not reproduced in this audit; no documented note in the docs. | r3 YallaDo |
| Y7 | CSRF cookie set on JSON responses to Bearer-only clients | Fixed | 0.3.2 | csrf: false per app (no CSRF cookie issued; CHANGELOG 0.3.2) | r3 YallaDo |
| Y8 | Docs contradicted each other on streaming maturity | Partly fixed | 0.3.2 | Current docs say streaming shipped; CLAUDE.md line 173 and BUILD-LOG items still carry the old 'deferred' wording with a later note (see the audit) | r3 YallaDo |
| L1 | Shared login did not carry across subdomains | Fixed | 0.3.2 | shared.sessions.cookie.domain (CHANGELOG 0.3.2) | r3 known limitation |
| O1 | devora --version printed 0.1.0 | Fixed | 0.3.1 | CHANGELOG 0.3.1 | r3 also open |
| O2 | Docs examples with bare devora commands | Unconfirmed | - | No bare 'devora <command>' line found by search in the site routes; pages were not read one by one. | r3 also open |
| O3 | deployment page session-store step | Fixed | - | Section id='session-store' exists in the docs site deployment route | r3 also open |
| O4 | Scaffold names the project backend @devorajs/backend (collides with a future real @devorajs/* package) | Open | - | packages/scaffold/src/scaffoldAppFiles.ts:153 writes '@devorajs/backend' into new projects. | r3 also open |
| O5 | signSession / verifySession still exported (deprecated) | Open | - | packages/core/src/session.ts:177 and :184, marked @deprecated, not removed. | r3 also open |
| N1 | A live Vercel or Netlify deployment of the current release is not verified | Open | - | Generated functions were run outside the monorepo; live deployments exist only for releases before 0.3.2 (docs/guides/DEPLOYING.md, VERIFICATION.md). Still 0.3.4 unverified live. | VERIFICATION not verified |
| N2 | Container platforms (Cloud Run, App Runner/Fargate, Azure Container Apps, Oracle) | Open | - | Docker image run locally only. | VERIFICATION not verified |
| N3 | isr regeneration on Vercel/Netlify | Open | - | Fully verified under adapter-node; not exercised on a serverless filesystem. | VERIFICATION not verified |
| N4 | deploy/devora.service (systemd) against a real host | Open | - | Template only. | VERIFICATION not verified |
| N5 | A DB client under sustained production load | Open | - | A real Drizzle + better-sqlite3 client was verified in dev and reverted; no load test. | VERIFICATION not verified |
| X1 | A dynamic route without getStaticParams() cannot use ssg/isr | Open | - | By design: the build fails with a clear error (docs/history/VERIFICATION.md Known unsupported). | VERIFICATION known unsupported |
| X2 | isr disk cache unverified under real serverless conditions | Open | - | Same as N3. | VERIFICATION known unsupported |
| S1 | Every request re-did work that never changes (path joins, build keys, a URL object and a Headers object, a session-key HMAC, two manifest reads from disk) | Fixed | Unreleased | Five commits on perf/backend-speed (CHANGELOG Unreleased). Interleaved A/B on one machine: +15% JSON list, +32% authenticated GET, +21% POST, +41% pre-rendered page, +23% server-rendered page; form POST 32,000 to 80,000 req/s in the full run (benchmarks/results/before-after.md, ab-published-vs-final.txt) | benchmarks |
| S2 | Devora.js API routes are still behind Fastify, Hono and NestJS on Fastify: JSON list 4th of 10 (22% below the leader), authenticated GET 6th (41% below), POST 5th (35% below) | Open | - | benchmarks/results/backend-report.md. Part of the gap is not in the framework (the same JSON.stringify runs in every app, about half of the list scenario); the rest is per-request work the bare frameworks do not do (security headers, a request context with session and CSRF methods, a real session lookup). | benchmarks |
| S3 | The built-in memory session store clones each record on every read (structuredClone, about 8% of an authenticated request) | Open | - | CPU profile of the authenticated scenario. Not changed: the clone keeps a handler from mutating the stored record; a cheaper copy needs a decision on that behavior. | benchmarks |
| S4 | Memory after load is higher than the bare backend frameworks (352 MB against 178 to 264 MB for Express, Fastify, Hono and NestJS) | Open | - | benchmarks/results/backend-report.md. A faster server also keeps more heap, so this is not proof of a leak; no leak test was run. | benchmarks |
