# Roadmap

Devora.js is early and pre-1.0, built by one person. This page is the single status document: what has shipped, version by version; what is done, partial, open and planned; what the 14 build items were; where each live deployment stands; and every finding testers or audits raised, with its status. The long, dated account of how each piece was built and verified is the [build log](docs/history/BUILD-LOG.md); every release block below is taken from [CHANGELOG.md](CHANGELOG.md) and the git tags (`v0.3.2`, `v0.3.4` and `v0.3.5` are the only tags).

Status words in the tables: **Fixed** (a release, and a file, test or CHANGELOG line that proves it), **Partly fixed**, **Open**, **Unconfirmed** (never reproduced or checked; not guessed), **N/A**.

## Now

- **Integration branch `release/0.4.0-final`** (approved by the maintainer, 2026-11-05): phase 0 state and merges; phase 1 finish the open 0.4.0 items (streaming flake wording, scaffold CI port base, quick findings such as H22, full gate); phase 4 red team on localhost; phase 5 docs; phase 6 verify and hand over; then, if time allows, phase 3B performance, phase 2 an experimental opt-in dev server and phase 3 an experimental opt-in desktop target.
- **Publish 0.4.0** (prepared on the `release/0.4.0` branch; the publish order is in the release notes of that branch's pull request, and the date in the CHANGELOG heading is filled in on the day). It is a security hardening release (findings H1 to H20); four changes need a check in some apps (`redirect()` to another origin, CSRF on cookie writes, `Cache-Control` on session responses, vite 6.4.4). It has not been run on a live Vercel or Netlify deployment. Read the [security model](docs/guides/SECURITY-MODEL.md) first.
- Switch on GitHub's private vulnerability reporting for the repository (SECURITY.md names it as the preferred channel).
- Outside testers: [TESTING.md](TESTING.md) is a 15-minute guide; what they hit goes into the findings table below.
- Deploy the docs site with the 0.3.5 numbers (measured on the published 0.3.5 packages) and the release post.
- Verify 0.3.5 on a live multi-app Vercel and Netlify deployment with sessions and API routes (finding N1; the documentation site already runs on Vercel with 0.3.5).

## Next

Open findings, in a **proposed** order by impact. The order is a proposal for the maintainer to confirm or change; nothing here has a version or a date.

| Order | Finding | Why it ranks here |
|-------|---------|-------------------|
| 1 | N1: 0.3.5 verified live only for the documentation site (Vercel, pre-rendered); not for multi-app, sessions, API routes or Netlify | Every deploy claim depends on it |
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
| 12 | H22: Vite 7 and 8 answer an unknown Host with 403 before Devora's 400 | Only matters when Vite is upgraded past 6; pass Devora's list to Vite, keep Vite's check when none is set |

Kept as **Unconfirmed**, not ranked: Y1 (native addons on serverless), Y6 (transient "invalid hook call"), O2 (bare `devora` commands in docs pages).

The `esbuild` override now also lives in `pnpm-workspace.yaml` for pnpm 11 and later (finding H33); `package.json`'s `"pnpm"` field stays for pnpm 9 and 10 until CI moves.


## Later

- A third-party security audit and signed release provenance, once the API surface settles.

## Vision (not started, no dates)

- A desktop app and a native mobile app. If they happen, business logic, the backend client, validation and design tokens would be shared and the UI would be platform-specific. React was chosen partly to keep that door open. Mobile, and the Metro-class bundler and device tooling it would need, come after desktop; nothing for them is in the code.

## Experimental (off by default)

- **Desktop target** (`devora desktop dev|build|serve --experimental`, Tauri 2): `packages/desktop` (sidecar on 127.0.0.1, random port, per-launch token on every request, navigation and external-link policy, IPC allowlist default none, generated Tauri project with no unsigned updater), example `examples/desktop-app`. `desktop dev` opens a window with `cargo run` when Rust (and Xcode tools on macOS) are present, and says what is missing and serves the app on its own when they are not. The Rust shell is generated and has been checked only by tests of what it says: it has not been compiled or run by its author; click-through, signing and shipping the server as a binary are manual and not done.
- **A dev server of Devora's own** (`packages/dev-server`, `devora dev --experimental-dev-server`): experimental, runs only from a checkout of this repository, and is not the default (`devora dev` is Vite). It renders pages and API routes with the same handlers as the Vite path, with esbuild transforms, React Fast Refresh, CSS and assets, and HMR over a WebSocket on 127.0.0.1 with an Origin check and a per-launch token; files are served from listed roots only, with realpath and dotfile checks, and it refuses production. It does not read `vite.config.ts` (no Vite plugins), and has no PostCSS or Sass, no `--host` and no HTTPS (tsconfig path aliases, CSS modules and `import.meta.glob` are supported). No performance numbers are published. Making it the default needs measurements on local hardware on more than one OS, the parity and browser checks in CI, at least one minor release as an opt-in, and a written yes here.
- **Engine choice** (`engine: "vite" | "own"` in `devora.config.ts`, `--engine=vite|own` on `devora dev|build`, a question in `create-devora`): Vite is the default and stays stable. `own` (name Sekhem, one constant in `@devorajs/core/config`) runs the experimental dev server above; `devora build --engine=own` is not written yet and stops with a message. The own engine needs Node 22.15 or later and, until `@devorajs/sekhem` is published, a checkout of this repository. Not done: the own build, a run without Vite installed, the broader benchmark suite.

## Ideas (open, not promised)

Nothing here is planned, scheduled or numbered.

- *Example:* an idea goes here as one line, with no version and no date. (The maintainer fills this in.)
- A server hook so a project can attach its own handlers to the HTTP server `devora start` creates (`ws`, a start-up task); the wrapper in the Live updates (WebSockets) guide works today (finding R1).
- Streamed API responses, so an API route can send server-sent events (finding R2).

## Performance program

The aim is to close the gaps and publish measured results, including where Devora.js is behind. Numbers come from the benchmark harness in [benchmarks/](benchmarks/README.md) and are never edited by hand.

State after the first pass (published 0.3.5, one full run, 5 runs per scenario; a difference inside a framework's own run-to-run spread counts as a tie): Devora.js is ahead of the other four frameworks on the pre-rendered page, the server-rendered page and the form POST. On the JSON API scenarios it is behind Fastify, Hono and NestJS on Fastify, and behind Express and NestJS on Express on the authenticated one; on the 2 ms async scenario it is level with four frameworks (findings S1 to S4). The numbers are in [benchmarks/results/before-after.md](benchmarks/results/before-after.md).

## Not planned

- A built-in ORM, auth provider or file storage (bring your own).
- A real-time sync engine (use a realtime server, see [Live updates (WebSockets)](docs/guides/REALTIME.md)).
- A custom RSC-style serialization protocol.

Everything else is indexed in [docs/README.md](docs/README.md).

## Done, by version

### 0.4.0 — date to fill when published (tag `v0.4.0` after publishing)
- Prepared, not published: until it is on npm, 0.3.5 is the release. A security hardening release: CSRF is checked by default for cookie-authenticated writes, `redirect()` stays on the app's origin, responses that touch the session cookie are `private, no-store`, vite 6.4.4 or later is required, plus nosniff, an SVG sandbox policy, symlink-safe static files, `allowedHosts`, server timeouts and form limits, an opt-in per-route `rateLimit`, and a dev server that restarts on config, env and route-file changes.
- Packages: `@devorajs/core` 0.4.0, `@devorajs/cli` 0.4.0, `@devorajs/adapter-node` 0.3.0, `@devorajs/adapter-vercel` 0.3.0, `@devorajs/adapter-netlify` 0.3.0, `create-devora` 0.4.0.
- No third-party audit. [CHANGELOG: 0.4.0](CHANGELOG.md#040--date-to-fill)

### 0.3.5 — 2026-10-16 (tag `v0.3.5`)
- Faster request handling in `devora start`: per-request work that never changes is now done once. Interleaved A/B on one machine: +15% JSON list, +32% authenticated GET, +21% POST, +41% pre-rendered page, +23% server-rendered page, form POST about 32,000 to 82,000 req/s. Five commits, each with tests; no security default weakened.
- A missing session store or secret stops `devora start` with one clear line; the header brand link's accessible name contains its visible text.
- Documentation: everything moved into `docs/`, the roadmap restored, guides for Live updates (WebSockets) and Background jobs, a new `examples/background-jobs`, backend benchmark scenarios.
- Packages: `@devorajs/core` 0.3.5, `@devorajs/cli` 0.3.5, `create-devora` 0.3.3; the adapters are unchanged.
- [CHANGELOG: 0.3.5](CHANGELOG.md#035--2026-10-16)

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

### 0.2.2 and 0.2.1 — 2026-09-16
- `@devorajs/core` 0.2.1 (footer structure in the branding component) and 0.2.2 (footer styles and a package `exports` restructure).
- [CHANGELOG: reconstructed package notes](CHANGELOG.md#package-notes-reconstructed-from-git-history-and-npm-publish-times)

### 0.2.0 — 2026-09-16
- The v2 backend: `defineModule()`, API routes, middleware, backend-only apps, `getStaticParams()` for `ssg`/`isr`.
- Repo-splitting (`devora split`, `sync`, `status`) and the `streaming` render mode.
- A security audit pass: cross-app cookie binding, request-body caps, path-traversal fixes, a 405 for undeclared API methods.
- [CHANGELOG: 2026-09-16](CHANGELOG.md#2026-09-16)

### 0.1.x
- 0.1.1 and `@devorajs/cli` 0.1.2 — 2026-09-08: the npm scope became `@devorajs`, the shared scaffold package, per-package READMEs. [CHANGELOG: 2026-09-08](CHANGELOG.md#2026-09-08)
- `@devorajs/core` 0.1.2 (2026-09-09): dynamic routes and the `devora deploy` fixes of that day; its note in the CHANGELOG was reconstructed from git history.
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
   integration and `devora deploy`. 0.3.5 is verified live only for the documentation site, a single pre-rendered app on Vercel (its generated
   functions, sessions and the multi-app demos were run outside the monorepo only). See [#4](docs/history/BUILD-LOG.md#4-adapters-real-build-output-not-just-config---done-including-real-live-vercel-and-netlify-deployments) and [#13](docs/history/BUILD-LOG.md#13-multi-app-aware-vercelnetlify---done-including-a-real-authenticated-deploy-on-both-platforms).
5. SEO primitives work — done (#7): OG tags + per-app opt-in sitemap.xml, both verified.

All five are now unconditionally true. What's left is narrower: `isr`'s regeneration reliability
on a serverless filesystem specifically — see the Status section immediately below.

## Status board

Restored in full from the old roadmap (kept in the [build log](docs/history/BUILD-LOG.md)) and brought up to 0.3.5. Where a line changed, the change is noted in *italics*.

### Done: built and verified

Automated tests versus manual checks are listed in [VERIFICATION.md](docs/history/VERIFICATION.md).

- SSR, SSG, CSR, ISR and streaming rendering (`renderMode`): #1, #12, [architecture-v2 §4](docs/design/architecture-v2.md)
- Sessions, CSRF, and per-app auth modes (`shared`/`isolated`/`none`): #2, #10
- Security headers (CSP/HSTS/X-Frame-Options, and `X-Content-Type-Options: nosniff` on every response, finding H2, 0.4.0) on by default: #5
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

- 0.3.5 on a live Vercel/Netlify deployment: not yet verified by this project (the generated functions were run outside the monorepo)
- `isr` on Vercel/Netlify: the initial build's static output serves correctly; ongoing regeneration on a serverless function's non-persistent filesystem is unverified: #12
- Domain auto-binding for a `devora deploy`-managed app: not built, deliberately scoped out of that pass: #13

### Known gaps, not scheduled yet

- Several `Set-Cookie` headers and streamed responses (SSE) from API routes
- Dropping the `"pnpm"` field of `package.json` once CI moves to pnpm 11 or later (the settings are in `pnpm-workspace.yaml` too; see [CONTRIBUTING](CONTRIBUTING.md))

### Planned

- 0.4.1: a cheaper copy in the memory session store (S3), after deciding what a handler may mutate
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
- **0.3.5 live**: the documentation site (one app, every page pre-rendered, no session store or API route) runs on Vercel with the published 0.3.5 packages since 2026-10-16 (Production deployment, state success, built from the npm packages). The generated functions, sessions, the multi-app demos and Netlify are not verified live on 0.3.5. The Vercel runtime hardcoded `nodejs20.x` before 0.3.2, so a new deploy of the older releases fails; 0.3.5's generated functions were run outside the monorepo only.

## Findings

109 findings from [the pre-v3 hotfix list](docs/history/devora-pre-v3-hotfixes.md) (P1 to P14), [hotfix round 3](docs/history/devora-hotfix-round3.md) (C = confirmed fixed, B = still broken at 0.3.1, U = unconfirmed, V = Vercel, K = Khepra, Y = YallaDo-only, L, O), [VERIFICATION.md](docs/history/VERIFICATION.md) (N, X), the performance program (S), the lab tests of WebSockets and jobs (R), the 0.3.5 smoke test (T) and the security hardening pass of 2026-11-02 (H, numbered by its work items). Fixed 74, Partly fixed 7, Open 23, Unconfirmed 4, N/A 1.

| ID | Finding | Status | Version | Evidence | Described in |
|----|---------|--------|---------|----------|--------------|
| P1 | Published package was behind the docs (core 0.1.2 lacked defineModule/apiRoute) | Fixed | 0.3.0 | create-devora pins ^0.3.0 (CHANGELOG 0.3.0); core 0.3.0 to 0.3.5 are on npm. The suggested CI check that fails a docs deploy when versions differ does not exist. | pre #1 |
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
| Y8 | Docs contradicted each other on streaming maturity | Fixed | 0.3.5 | Every current document says streaming shipped in v2 (GET-only; buffered on Netlify); the old "deferred" wording is kept only in dated history (BUILD-LOG items, `docs/history/CLAUDE-repo-state-archive.md`, each marked as of its date) | r3 YallaDo |
| L1 | Shared login did not carry across subdomains | Fixed | 0.3.2 | shared.sessions.cookie.domain (CHANGELOG 0.3.2) | r3 known limitation |
| O1 | devora --version printed 0.1.0 | Fixed | 0.3.1 | CHANGELOG 0.3.1 | r3 also open |
| O2 | Docs examples with bare devora commands | Unconfirmed | - | No bare 'devora <command>' line found by search in the site routes; pages were not read one by one. | r3 also open |
| O3 | deployment page session-store step | Fixed | - | Section id='session-store' exists in the docs site deployment route | r3 also open |
| O4 | Scaffold names the project backend @devorajs/backend (collides with a future real @devorajs/* package) | Open | - | packages/scaffold/src/scaffoldAppFiles.ts:153 writes '@devorajs/backend' into new projects. | r3 also open |
| O5 | signSession / verifySession still exported (deprecated) | Open | - | packages/core/src/session.ts:177 and :184, marked @deprecated, not removed. | r3 also open |
| N1 | A live Vercel or Netlify deployment of the current release is not verified | Partly fixed | - | The documentation site (one app, every page pre-rendered, no session store or API route) runs on Vercel with the published 0.3.5 packages since 2026-10-16. Generated functions were run outside the monorepo; live multi-app, session and API deployments exist only for releases before 0.3.2 (docs/guides/DEPLOYING.md, VERIFICATION.md), and Netlify has none on 0.3.5. | VERIFICATION not verified |
| N2 | Container platforms (Cloud Run, App Runner/Fargate, Azure Container Apps, Oracle) | Open | - | Docker image run locally only. | VERIFICATION not verified |
| N3 | isr regeneration on Vercel/Netlify | Open | - | Fully verified under adapter-node; not exercised on a serverless filesystem. | VERIFICATION not verified |
| N4 | deploy/devora.service (systemd) against a real host | Open | - | Template only. | VERIFICATION not verified |
| N5 | A DB client under sustained production load | Open | - | A real Drizzle + better-sqlite3 client was verified in dev and reverted; no load test. | VERIFICATION not verified |
| X1 | A dynamic route without getStaticParams() cannot use ssg/isr | Open | - | By design: the build fails with a clear error (docs/history/VERIFICATION.md Known unsupported). | VERIFICATION known unsupported |
| X2 | isr disk cache unverified under real serverless conditions | Open | - | Same as N3. | VERIFICATION known unsupported |
| S1 | Every request re-did work that never changes (path joins, build keys, a URL object and a Headers object, a session-key HMAC, two manifest reads from disk) | Fixed | 0.3.5 | Five commits on perf/backend-speed (CHANGELOG 0.3.5). Interleaved A/B on one machine: +15% JSON list, +32% authenticated GET, +21% POST, +41% pre-rendered page, +23% server-rendered page; form POST 32,000 to 80,000 req/s in the full run (benchmarks/results/before-after.md, ab-published-vs-final.txt) | benchmarks |
| S2 | Devora.js API routes are behind Fastify, Hono and NestJS on Fastify on every JSON scenario | Open | - | Published 0.3.5, medians: JSON list 4th of 10 (26% below the leader), authenticated GET 6th (43% below), POST valid 5th (39%) and invalid 4th (36%); on POST it is level with Express (ranges overlap). Part of the gap is not in the framework (the same JSON.stringify runs in every app, about half of the list scenario); the rest is per-request work the bare frameworks do not do (security headers, a request context with session and CSRF methods, a real session lookup). benchmarks/results/backend-report.md | benchmarks |
| S3 | The built-in memory session store clones each record on every read (structuredClone, about 8% of an authenticated request) | Planned for 0.4.1 | - | CPU profile of the authenticated scenario. Not in 0.4.0: the clone keeps a handler from mutating the stored record, and a cheaper copy needs a decision on that behavior first. | benchmarks |
| S4 | Memory after load is higher than the bare backend frameworks | Open | - | Published 0.3.5: Devora.js 285 MB after the API scenarios against 167 to 258 MB for Express, Fastify and both NestJS platforms (Hono 222 MB; Next.js, SvelteKit, React Router and Astro are higher, 329 to 600 MB). A faster server also keeps more heap, so this is not proof of a leak; the 10-minute soak on the 0.3.5 code held steady (about 314 MB, +3 MB between the halves of the run). | benchmarks |
| S5 | The 0.4.0 open-redirect check (H4) parsed every redirect target up to four times, twice per redirect: about 8% of the CPU of a form POST that redirects | Fixed | 0.4.0 | packages/core/src/actionResult.ts (plain same-origin path accepted before parsing); perfFastPaths.test.ts; interleaved A/B in a cloud container: form POST +8.3%, beyond the spread | phase 3B profile |
| S6 | The dev-only session warning read `process.env.NODE_ENV` on every production request (1.5% of the CPU of a JSON GET) | Fixed | 0.4.0 | packages/core/src/session.ts (usage check first); throughput change inside the spread | phase 3B profile |
| S7 | The benchmark harness ran frameworks one after another; on a shared machine, runs minutes apart drift by 10% or more (a −13% "regression" of 0.4.0 on the JSON list was a tie when interleaved) | Fixed | 0.4.0 | benchmarks/run.mjs and run-backend.mjs: load runs alternate between frameworks in rounds, the start rotating each round (`--sequential` keeps the old order); the raw file records `config.order` and `loadPositions`. Run with two apps over three rounds (backend) and two stand-in apps (pages), benchmarks/README.md | phase 3B |
| R1 | `ws` on the same port as `devora start` | Partly fixed | - | Works through a wrapper script that calls `createNodeServer` (the function the CLI calls; a public, documented export of `@devorajs/adapter-node` that returns the `http.Server`) and handles `upgrade` itself: bad token 401, good token connected and echoed, API and security headers unchanged on the same port. Plain `devora start` exposes no server and no hook. Smallest core change: an `onServer(server)` option. Guide: Live updates (WebSockets). | lab |
| R2 | Server-sent events from an API route | Open | - | A string body is sent complete after the handler finishes (first byte at 1.5 s for three events 0.5 s apart, then the connection closes, so an `EventSource` reconnects in a loop); a `ReadableStream`, an async iterable or a `Readable` as the body answers 500. Smallest core change: let `sendApiResponse` pipe a stream or async iterable and destroy it when the client disconnects. | lab |
| R3 | Socket.IO as a separate server (`examples/realtime`) | Fixed | 0.3.4 | Run from a scratch copy on the published 0.3.4 packages: all 19 checks of `examples/check.mjs` pass. Not tested in a browser. | lab |
| R4 | Background jobs: BullMQ with Redis and a separate worker | Fixed | 0.3.5 | Tested on one Node server: an authenticated route enqueued (202), the worker ran it, the route returned `completed` in about 330 ms; unauthenticated enqueue is 401. `bullmq` needs `ioredis` installed separately. In CI as `examples/background-jobs` (the Redis part skips when there is no Redis). Guide: Background jobs. | lab |
| R5 | Background jobs without Redis: a SQLite queue and a worker | Fixed | 0.3.5 | `node:sqlite`: result in about 100 to 220 ms. One server only (both processes share the file). In CI as `examples/background-jobs`, always run. | lab |
| R6 | `node-cron` inside `devora start` | Partly fixed | - | Works, but there is no start-up hook: the schedule registers when the route that contains it is first imported (at its first request). | lab |
| R7 | Each of the above on Vercel or Netlify | Unconfirmed | - | Not deployed, so not verified. Expected from the platforms' documented model, not tested: WebSockets, long-lived timers and a SQLite file on a function's disk do not fit functions; a BullMQ worker must run elsewhere. | lab |
| T1 | A fresh scaffold prints `npm warn Unknown project config "link-workspace-packages"` on every npm command | Open | - | Source: `packages/scaffold/src/scaffoldProjectFiles.ts:137` writes a project `.npmrc` containing `link-workspace-packages=true`, a pnpm setting (pnpm needs it so the plain `"*"` workspace dependencies link locally instead of being fetched from the registry). npm 11 does not know it and warns, saying it will stop working in the next major version. Verified: in a scaffold, `npm config get registry` warns with the `.npmrc` in place and is silent with it moved away. The repo root and every example carry the same file. Not fixed. | smoke test of 0.3.5 |
| T2 | On newer npm, install prints an `allow-scripts` warning for esbuild's postinstall | Open | - | Reproduced with npm 11.17.0 in an empty project: `npm install esbuild@0.25.12` prints "1 package has install scripts not yet covered by allowScripts: esbuild@0.25.12 (postinstall: node install.js)". esbuild comes in through Vite. Install, `devora dev` and `devora build` still work. The warning comes from npm, not from Devora.js code; getting-started says so in one line. Not fixed. | smoke test of 0.3.5 |
| H1 | `@devorajs/cli` accepted vite 5.4 and every 6.x, including releases before 6.4.4 | Fixed | 0.4.0 | packages/cli/package.json `"vite": "^6.4.4"` (also packages/scaffold/src/scaffoldAppFiles.ts and apps/*/package.json); all apps built and served by the dev server on vite 6.4.5; CHANGELOG, top section | security hardening 2026-11-02, item 1 |
| H2 | No `X-Content-Type-Options: nosniff` on any response, so a browser could sniff a served file as another type | Fixed | 0.4.0 | packages/core/src/securityHeaders.ts (`NOSNIFF_HEADER`), adapters/adapter-vercel and adapter-netlify static header rules; tests in securityHeaders.test.ts, staticFiles.integration.test.ts (files, 304, 405, 404), cookiePolicy.integration.test.ts (API, API 404, preflight), devServer.integration.test.ts, adapterCjsSmoke.test.ts | security hardening 2026-11-02, item 2 |
| H3 | `.svg` files were served with the page CSP, so an SVG opened directly could run script on the app origin | Fixed | 0.4.0 | packages/core/src/securityHeaders.ts (`SVG_CSP`), staticFiles.ts, packages/cli/src/server/securityHeadersMiddleware.ts (`createSvgHeadersPlugin`: Vite serves public files before the page middleware, found by the browser run), adapter header rules; tests in staticFiles.integration.test.ts, devServer.integration.test.ts (a public svg), securityHeadersMiddleware.test.ts, securityHeaders.test.ts, adapterCjsSmoke.test.ts. The Vercel and Netlify rules are not verified on a live deployment. | security hardening 2026-11-02, item 3 |
| H4 | `redirect()` sent any target as `Location`, so `redirect(userInput)` was an open redirect (`//evil.com`, `https://evil.com`, `/\evil.com`, encoded forms) | Fixed | 0.4.0 | packages/core/src/actionResult.ts (`redirectRefusal`, `allowedOrigins`), checked again in renderRoute.ts and renderStreaming.ts; packages/core/src/__tests__/redirectTargets.test.ts (25 refused targets, 10 allowed paths, allowlist, plain objects on SSR and streaming) | security hardening 2026-11-02, item 4 |
| H5 | Static files: a symlink inside the client folder could serve a file outside it (the path check did not follow symlinks) | Fixed | 0.4.0 | packages/core/src/staticFiles.ts (`realPathInsideRoot`); staticFiles.integration.test.ts (symlinked file and folder outside: 404; inside: 200; repointed after caching: 404 within a second). The dev server is not covered. | security hardening 2026-11-02, item 5 |
| H6 | Responses that read or set the session cookie had no `Cache-Control`, so a CDN or proxy configured to cache could store one user's page or `Set-Cookie` | Fixed | 0.4.0 | packages/core/src/session.ts (`touchesSessionCookie`, `PRIVATE_NO_STORE`), renderRoute.ts, renderStreaming.ts, apiDispatch.ts, prodRequestHandler.ts, packages/cli/src/server/ssrMiddleware.ts and apiMiddleware.ts; packages/cli/src/server/__tests__/sessionNoStore.integration.test.ts (production and dev: API, SSR, streaming, redirect, dead cookie, logout; anonymous and Bearer unchanged). Behavior change. | security hardening 2026-11-02, item 6 |
| H7 | CSRF was checked only where a route called `ctx.verifyCsrf()`; a route that forgot accepted cross-site writes with the session cookie | Fixed | 0.4.0 | packages/core/src/csrf.ts (`verifyCsrfByDefault`), called from renderRoute.ts (page actions) and apiDispatch.ts (API routes); `csrf = false` opt-out on RouteModule and ApiRouteModule; packages/cli/src/server/__tests__/csrfDefault.integration.test.ts (four methods, wrong and cross-browser tokens, GET/HEAD/OPTIONS, Bearer, anonymous, dead cookie, opt-out, page forms). Behavior change. | security hardening 2026-11-02, item 7 |
| H8 | No rate limiting anywhere: a login route accepted unlimited guesses from one client | Partly fixed | 0.4.0 | packages/core/src/rateLimit.ts (opt-in `export const rateLimit` per route, in memory, per process), applied in renderRoute.ts and apiDispatch.ts; packages/core/src/__tests__/rateLimit.test.ts; packages/backend/AUTH.md "Rate limiting logins" (proxy and platform limits). Partly: per process only, opt-in, no per-account lockout. | security hardening 2026-11-02, item 8 |
| H9 | A route that read `ctx.session` but forgot `ctx.requireAuth()` gave no hint in development | Fixed | 0.4.0 | packages/core/src/session.ts (`warnIfSessionReadWithoutAuth`), called from renderRoute.ts, renderStreaming.ts and apiDispatch.ts; packages/core/src/__tests__/sessionAuthWarning.test.ts (page, API, streaming, once per path, silenced by requireAuth, never in production) | security hardening 2026-11-02, item 9 |
| H10 | `devora dev` read `app.config.ts`, `devora.config.ts` and `.env` once at boot and never again; adding a route file left the boot summary stale; a Prisma change needed a manual restart with no hint | Fixed | 0.4.0 | packages/cli/src/server/devRestart.ts, packages/cli/src/commands/dev.ts (`startDevSession`), loadEnvFiles.ts (`unloadProjectEnv`), config loaders (`moduleCache: false`); packages/cli/src/server/__tests__/devRestart.test.ts (one test per trigger on the real watcher), packages/core/src/__tests__/configReload.test.ts. Also run by hand: env change, route added, broken then fixed config, on port 11010. | security hardening 2026-11-02, item 10 |
| H11 | No dependency audit, unpinned CI actions, no automatic update PRs, no check on what a tarball contains, and SECURITY.md named only a Discord DM | Fixed | 0.4.0 | .github/workflows/ci.yml (audit job, SHA pins, read-only permissions, pack check step), .github/dependabot.yml, scripts/checkPackContents.mjs with scripts/__tests__/checkPackContents.test.ts, SECURITY.md. The GitHub setting "Private vulnerability reporting" must be switched on by the maintainer (it is off now), and the audit job fails until vite is on 6.4.4 or later (fix/security-hardening-1). | security hardening 2026-11-02, items 11 to 13 |
| H12 | `source-map-js` before 1.2.2 (high, event-loop denial of service) was resolved through vite and postcss | Fixed | 0.4.0 | package.json overrides (`source-map-js: ^1.2.2`) in pnpm-lock.yaml; `pnpm audit --prod --audit-level high` clean | security hardening 2026-11-02, item 12 |
| H15 | `devora start` used Node's default server timeouts (5-minute request timeout, headers timeout checked only every 30 s), so slow clients could hold connections | Fixed | 0.4.0 | adapters/adapter-node/src/index.ts (`resolveServerLimits`, `DEFAULT_SERVER_LIMITS`), app.config.ts `server`; adapters/adapter-node/src/__tests__/serverLimits.test.ts (defaults, overrides, bad values, a slow-header socket answered 408 and closed within the timeout, a 431 for large headers) | security hardening 2026-11-02, item 15 |
| H16 | No way to restrict the hosts an app answers to; `ctx.url` takes whatever `Host` (or trusted `X-Forwarded-Host`) the client sent, which matters for links built from it | Fixed | 0.4.0 | packages/core/src/allowedHosts.ts, prodRequestHandler.ts, packages/cli/src/server/apiMiddleware.ts (`createHostCheckPlugin`, dev), adapter options; packages/core/src/__tests__/allowedHosts.test.ts, packages/cli/src/server/__tests__/allowedHosts.integration.test.ts (unset unchanged, listed and wildcard hosts, look-alikes, no Host, X-Forwarded-Host only with trustProxy, dev server); packages/backend/AUTH.md "Hosts and links in emails" | security hardening 2026-11-02, item 16 |
| H17 | Page forms had no limit on the number of fields or files (only on total bytes), so one request could carry thousands of parts | Fixed | 0.4.0 | packages/core/src/readBody.ts (`FormLimitError`, part counting before parsing), prodRequestHandler.ts, packages/cli/src/server/ssrMiddleware.ts, adapter options; packages/core/src/__tests__/formLimits.test.ts (each limit, exact limits, defaults, URL-encoded), packages/cli/src/server/__tests__/formLimits.integration.test.ts (413 for fields, files and URL-encoded; the action never runs) | security hardening 2026-11-02, item 17 |
| H18 | The vitest 2.1.9 test runner has critical advisories (its UI server, `tinypool`) and pulls vite 5.4.21 (high, `launch-editor`). Dev-only: it is not installed by users and `pnpm audit --prod --audit-level high` is clean | Open | - | `pnpm audit` (all dependencies). Moving to vitest 3.2.7 plus a `tinypool` 2.1.2 override clears the audit but 55 integration tests time out (the production handler's dynamic `import()` of built files under the newer vite-node); not done. CI reports it without failing. The root `esbuild` override also hides esbuild 0.21.5 (moderate dev-server advisory GHSA-67mh-4wv8-2f99) on the same chain (H33). | security hardening 2026-11-02, item 12 |
| H19 | A streaming-render boundary error raised before the shell was ready was dropped (never reported or logged); the test for failed island imports failed about 1 run in 30 on a busy machine, on main as well | Fixed | 0.4.0 | packages/core/src/renderStreaming.ts (`earlyBoundaryErrors`); renderStreaming.test.ts (two deterministic tests); 0 failures in 90 runs under heavy CPU load, against 2 in 60 on main. It was not the only cause: a second one (a timer race) is H23 | found while verifying the hardening branches |
| H20 | The static-file cache integration tests (about 3.7 s of deliberate sleeping) had a 5 s timeout and failed on a busy machine | Fixed | 0.4.0 | packages/cli/src/server/__tests__/staticCache.integration.test.ts (`vi.setConfig({ testTimeout: 30_000 })`); found by running the suite three times per branch | found while verifying the hardening branches |
| H21 | CI `build (pnpm)` was red on main: a dev-server test timed out at 5 s under parallel load, and the tarball contents check could not parse `npm pack --json` on npm 10 | Fixed | 0.4.0 | vitest.config.ts (`testTimeout: 30_000`), scripts/checkPackContents.mjs (`parseNpmJson`) with scripts/__tests__/checkPackContents.test.ts, isrCache.test.ts (2 MB payload); every step of the job run in a fresh clone under Node 20 and pnpm 9.9.0 | CI run of main 42503c6 |
| H22 | Vite answers a request for a host it does not know with its own 403 ("Blocked request") before Devora's `allowedHosts` check: on Vite 6 a host the app lists (a tunnel, a custom dev domain) never reached the app in `devora dev`; on Vite 7 and 8 an unknown host got Vite's 403 instead of Devora's 400 | Fixed | 0.4.0 | packages/cli/src/commands/dev.ts passes the app's `allowedHosts` to Vite's `server.allowedHosts` (only when the app sets one; Vite keeps its own check otherwise; never `true`); packages/cli/src/server/__tests__/allowedHosts.integration.test.ts (listed host and subdomain answer 200, a look-alike 400; the listed-host check failed with Vite's 403 before the change on Vite 6.4.5). Not re-run on Vite 7 or 8, which 0.4.0 does not support | Vite study 2026-11-04; release/0.4.0-final |
| H23 | A streaming page's failed island import could go unreported: the island cache dropped the failed import on a `setTimeout(0)` timer while React 18 re-renders a suspended component from `setImmediate`; when the timer ran first, the import was retried in the same request and the first error was never reported (the H19 test still failed 2 in 96 runs after the H19 fix) | Fixed | 0.4.0 | packages/core/src/islandComponent.tsx (the failed entry is removed when a render reads it; a 1 s unref'd timer only for entries no render read); renderStreaming.test.ts "a failed island import is reported by the request that saw it, whatever the timer order" (forces the timer-first order; failed 5 of 5 before, passes after); the whole renderStreaming.test.ts passed 200 of 200 runs with three CPU-bound processes on four cores | release/0.4.0-final phase 1 |
| H24 | One malformed percent-escape in any cookie made the cookie parser throw, so every page of a session app answered 500 for that browser | Fixed | 0.4.0 | packages/core/src/session.ts (`parseCookieHeader` keeps the raw value); packages/core/src/__tests__/redteamFindings.test.ts | red team 2026-11-05 |
| H25 | A cookie name sent twice: the last value won, so a cookie tossed in from a sibling subdomain replaced the app's own | Fixed | 0.4.0 | session.ts (first value wins); redteamFindings.test.ts. Behavior change for duplicated names only | red team 2026-11-05 |
| H26 | The default CSRF check and `rateLimit` skipped every method but POST/PUT/PATCH/DELETE; an API route without `methods` ran its handler for a cookie-authenticated PURGE or PROPPATCH with no token | Fixed | 0.4.0 | packages/core/src/csrf.ts (`CSRF_SAFE_METHODS`: only GET/HEAD/OPTIONS skipped), rateLimit.ts; redteamFindings.test.ts; attack-prod.mjs (403 for five such methods) | red team 2026-11-05 |
| H27 | `ctx.url` took its host from an absolute-form or `//` request target instead of the `Host` header `allowedHosts` checks | Fixed | 0.4.0 | packages/core/src/trustProxy.ts (`targetPathAndQuery`); redteamFindings.test.ts | red team 2026-11-05 |
| H28 | `devora dev`: any web page could make Vite's `/__open-in-editor` open a path in the developer's editor | Fixed | 0.4.0 | packages/cli/src/server/apiMiddleware.ts (`createOpenInEditorGuardPlugin`); packages/cli/src/server/__tests__/openInEditorGuard.integration.test.ts | red team 2026-11-05 |
| H29 | `create-devora` and `devora new` wrote app names and domains unchecked into generated source, paths and the netlify.toml build command | Fixed | 0.4.0 | packages/scaffold/src/names.ts, used by both scaffolders before writing; packages/scaffold/src/__tests__/names.test.ts | red team 2026-11-05 |
| H30 | The CSRF token was double-submit (compared with a cookie), so someone who can set cookies for the app's domain could plant a pair they know | Fixed | 0.4.0 | packages/core/src/csrf.ts (`deriveSessionCsrfToken`: an HMAC of the session ID keyed with the session secret, separate from the store key) and session.ts (a request with a session cookie must carry that token; the CSRF cookie is not consulted for it; requests with no session keep the cookie; Bearer and `csrf = false` unchanged); csrfSessionBinding.test.ts (a token from another session, a planted cookie pair, a token with no session, no-cookie requests, the opt-outs); the CLI integration tests now take the token from a rendered page. A page that logs in with `fetch()` needs a reload before it writes (CHANGELOG, breaking change 3). A `__Host-` cookie name was not needed once the token is bound | red team 2026-11-05 |
| H31 | `rateLimit` keyed on the full IP: an IPv6 client could rotate addresses inside its /64, and the table drops its oldest entries at 10,000 keys | Fixed (the /64 part) | 0.4.0 | packages/core/src/rateLimit.ts (`rateLimitKey`: IPv6 by /64 prefix, IPv4-mapped as IPv4, zone id ignored, IPv4 unchanged); rateLimit.test.ts (rotating addresses in one /64 share a count, different /64s do not, spellings of one address, unreadable values); documented in packages/backend/AUTH.md. The 10,000-entry table limit is unchanged (a distributed flood can still push entries out; limit at the proxy too) | red team 2026-11-05 |
| H32 | The Netlify function reads the whole body before `maxBodyBytes` applies | Open (accepted) | - | Netlify caps function request bodies itself | red team 2026-11-05 |
| H34 | `devora dev` only: Vite's HMR WebSocket accepts a client that sends no `Origin` header. Browsers always send one, so only a local non-browser process can connect, and such a process can already read the project files | Open (accepted) | - | Dev server only; not in `devora start` | red team 2026-11-05 |
| H35 | `devora dev` only: the cross-site guard on `/__open-in-editor` (H28) passes a request that carries neither `Sec-Fetch-Site` nor `Origin`, so a non-browser caller on the same machine still reaches Vite's handler | Open (accepted) | - | By design of the H28 guard: it refuses browsers, not local tools | red team 2026-11-05 |
| H36 | `devora dev` (Vite): one `GET //` (or any request target starting with two slashes) from the local machine stopped the dev server: `new URL("//", base)` throws, in an async middleware, which is an unhandled rejection | Fixed | - | packages/cli/src/server/requestUrl.ts (origin-form targets are attached to a fixed origin) used by the page, API and boot-status middleware; devServer.integration.test.ts ("odd request targets", fails without the fix); found by the dev-server fuzzer (`pnpm run fuzz:dev-server`) | dev-server v2 fuzzing, 2026-11-09 |
| H33 | The repo's own pnpm settings lived only in `package.json`'s `"pnpm"` field, which pnpm 11 and later ignore: pnpm 12 could not install the monorepo (it fetched `@devorajs/core@^0.4.0` from npm instead of linking the workspace package), and the `esbuild` override hid two things: create-devora declared `^0.21.5` but was built with 0.28.2, and the test runner's vite 5 chain would otherwise bring esbuild 0.21.5 (moderate advisory GHSA-67mh-4wv8-2f99, dev server, development only; `pnpm audit --prod` is clean with or without the override) | Fixed (recorded) | 0.4.0 | pnpm-workspace.yaml now has `overrides`, `linkWorkspacePackages` and `allowBuilds` (pnpm 9 and 10 ignore them); create-devora declares `^0.28.2`. Checked without the override: build and 664 tests pass, and `pnpm audit` lists the esbuild advisory on the vitest chain (H18). Checked with pnpm 12.10.1: frozen install, one esbuild (0.28.2), workspace packages linked. The `"pnpm"` field stays for CI's pnpm 9.9.0 | override review 2026-11-08 |
| T3 | A fresh project did not install with pnpm 11 or later (tried 12.10) | Fixed | 0.4.0 | pnpm 11 and later ignore `link-workspace-packages` in `.npmrc` (`ERR_PNPM_FETCH_404` for `@devorajs/backend`, then `ERR_PNPM_IGNORED_BUILDS`). `pnpm-workspace.yaml` from the scaffold now has `linkWorkspacePackages: true` and `allowBuilds: esbuild: true` (`PNPM_WORKSPACE_YAML` in packages/scaffold/src/scaffoldProjectFiles.ts, packages/scaffold/src/__tests__/packageManagers.test.ts). A new project passed create, install, dev, build, start, add, script and one-off on pnpm 9.15, 10.34 and 12.10, Node 20 and 22. Projects made by create-devora 0.3.x still need the two keys added by hand. | package manager tests |
| T4 | A fresh project did not run under Yarn 4's default Plug'n'Play linker | Fixed | 0.4.0 | `create-devora` writes `.yarnrc.yml` with `nodeLinker: node-modules` when the package manager is Yarn (`YARNRC_YML`, same test file); not written for npm, pnpm or when none is given. A new project passed the same steps on Yarn 4.18 (default settings, no hand-made lockfile) and Yarn 1.22, Node 20 and 22. Projects made by 0.3.x need the file added by hand. | package manager tests |
| T5 | `@devorajs/cli` imports `esbuild` at runtime (the bundled Vercel and Netlify deploy code) but listed it only in `devDependencies`, so an install where Vite does not bring esbuild (Vite 8) failed with `Cannot find package 'esbuild'`, and Yarn 4 Plug'n'Play refused it (`@devorajs/cli tried to access esbuild, but it isn't declared in its dependencies`) | Fixed | 0.4.0 | `esbuild` `^0.28.2` (the adapters' range) is now in `dependencies` of packages/cli/package.json; `react-dom`, which `@devorajs/core` imports in its client hydration code, is declared as an optional peer. Built from the local tarballs on a fresh scaffold: Yarn 4.18 Plug'n'Play without `.yarnrc.yml`, pnpm 9 and 10 with `hoist=false`, npm, and npm with Vite 8.3.5 all pass install, build, `devora start` and `devora dev` (a served edit); the same projects built from the tarballs before the change fail on Plug'n'Play and on Vite 8. The scaffold still writes `nodeLinker: node-modules` for Yarn | local tarball tests 2026-11-04 |
