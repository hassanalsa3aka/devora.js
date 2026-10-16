# Roadmap

Devora.js is early and pre-1.0, built by one person. This page says what has shipped, version by
version, and what is next. Every block below is taken from [CHANGELOG.md](CHANGELOG.md) and the
git tags (`v0.3.2` and `v0.3.4` are the only tags); the long, dated account of how each piece was
built and verified is the [build log](docs/history/BUILD-LOG.md).

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

## Now

- Outside testers: [TESTING.md](TESTING.md) is a 15-minute guide; what they hit shapes the next releases.
- Ship the clear "no session store configured" message (in the CHANGELOG under "Unreleased").
- Verify 0.3.4 on a live Vercel and Netlify deployment (the generated functions have been run outside the monorepo; live deployments exist for earlier releases).

## Next

- `isr` regeneration on a serverless filesystem: verify it, or document the supported setup.
- Several `Set-Cookie` headers and streamed responses (server-sent events) from API routes.
- Move the `esbuild` override out of `package.json`'s `"pnpm"` field (pnpm 11 ignores it).

## Later

- A third-party security audit and signed release provenance, once the API surface settles.
- Desktop and native mobile apps: **planned goals, not started, no dates**. If they happen, the business logic, backend client, validation and design tokens would be shared and the UI would be platform-specific.

## Not planned

- A built-in ORM, auth provider or file storage (bring your own).
- A real-time sync engine (use a realtime server, see [REALTIME](docs/guides/REALTIME.md)).
- A custom RSC-style server/client serialization protocol.

Everything else is indexed in [docs/README.md](docs/README.md).
