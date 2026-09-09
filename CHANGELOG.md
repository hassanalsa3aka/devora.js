# Changelog

This is a monorepo of independently-versioned packages (`@devorajs/core`, `@devorajs/cli`,
`@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`, `create-devora`, plus internal-only
`@devorajs/backend`/`@devorajs/adapter-node`/`@devorajs/scaffold`), so entries below note which
package(s) a change actually shipped in rather than a single project-wide version number.

This file starts where this repo's git history starts (2026-09-07). Everything before that —
the SSR handler, sessions/CSRF, security headers, islands, render modes, the CLI, all three
adapters, Docker/VPS/CI support — landed as one large initial commit; see `ROADMAP.md` for the
detailed, per-feature account of that work instead of a fabricated day-by-day history here.

## 2026-09-09

- **CI**: fixed `.github/workflows/ci.yml`'s pnpm install step, which was failing fast on every
  run — `corepack enable` had no `packageManager` field to pin a pnpm version (removed
  deliberately for Yarn compatibility, see README.md), so it couldn't resolve one on GitHub's
  runners. Now installs pnpm directly via `pnpm/action-setup` for that leg only.
- **Docs**: added live demo links (Vercel/Netlify/docs site), npm package links, a CI status
  badge, and cross-links between README/ROADMAP/architecture-v1.md.

## 2026-09-08

- **`@devorajs/cli` 0.1.2**, **`create-devora` 0.1.2**:
  - `devora new`/`devora add` now detect whether they're running inside this monorepo or a
    standalone scaffolded project, and generate the correct deploy build command for each
    (`node packages/cli/dist/index.js build ...` vs. `./node_modules/.bin/devora build ...`).
    Previously always assumed monorepo context, which broke standalone projects.
  - `@devorajs/cli` is now a real `dependencies` entry (not `devDependencies`) at both the
    project root and each app's own `package.json` — Netlify's production installs skip
    `devDependencies` entirely, and its workspace-scoped installs only read an app's own
    `package.json`, so it needed to be declared in both places to survive either.
- **`@devorajs/core` 0.1.1**, **`@devorajs/adapter-vercel` 0.1.1**, **`@devorajs/adapter-netlify`
  0.1.1**: version bump, expanded package descriptions, added per-package READMEs.
- Renamed the npm scope from `@devora/*` to `@devorajs/*` across every package, import, and doc.
- Added the internal `@devorajs/scaffold` package — the shared scaffolding logic used by both
  `devora new`/`add` and `create-devora`, so the two don't drift apart.

## 2026-09-07

- Initial commit: the framework itself — SSR/SSG/CSR/ISR render modes, islands, per-app
  session/CSRF handling, security headers by default, SEO primitives, the `devora` CLI, and
  `@devorajs/adapter-node`/`adapter-vercel`/`adapter-netlify`. See `ROADMAP.md` for the detailed
  build history behind this commit.
- Fixed a real Vercel deploy failure: `devora build` wasn't setting `NODE_ENV=production` itself,
  which silently depended on the caller having set it — invisible locally, but Vercel's custom
  `buildCommand` path doesn't reliably set it, causing a `jsxDEV is not a function` crash.
- Fixed a real Vercel deploy failure: the generated function was missing `react`/`react-dom` at
  runtime — Vercel's Build Output API doesn't trace dependencies for a pre-built function, so the
  adapters now vendor the resolved `react`/`react-dom` package trees directly into the function.
- Fixed a real Netlify deploy failure: `netlify.toml` was only ever generated as build *output*,
  too late for the build that was supposed to produce it. It's now a static, pre-committed file
  per app.
- Added `auth: "none"` as a third `AuthMode` — an app with no login (e.g. `marketing`) can now
  opt out of the entire session/cookie/CSRF carrier instead of needing an unused session secret.
- Added `vercel.json`/`netlify.toml` per app and wrote up the Vercel/Netlify deployment steps.
