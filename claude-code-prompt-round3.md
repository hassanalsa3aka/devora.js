# Prompt for Claude Code — Devora.js hotfix round 3 + design + terminal logo

Paste everything below the line into Claude Code, started in the `devora.js` repo root.
Before you do, copy `devora-hotfix-round3.md` into the repo root (next to `devora-pre-v3-hotfixes.md`) so it can read the full evidence.

---

You are working in the devora.js framework repo. Read `CLAUDE.md`, `architecture-v1.md`, `architecture-v2.md`, `DEPLOYING.md` and `devora-hotfix-round3.md` (repo root) first. `devora-hotfix-round3.md` is the source of truth for this round: it merges four real-product reviews (three different products) plus source checks. Follow the locked decisions in `CLAUDE.md`; if a fix needs to break one, stop and ask.

## Ground rules

- Work in phases (below). After each phase: run the full test suite and typecheck, then give me a short report (what changed, how you verified it, what you could NOT verify) and wait for my "go" before the next phase.
- Verify before you fix. Everything marked UNCONFIRMED in the hotfix doc must be reproduced against current source first. Report "still broken / already fixed / cannot reproduce" with the file and line. Do not assume either way.
- Verify for real: scaffold a fresh project with the local `create-devora`, install it, and run `devora dev`, `devora build`, `devora start` with real HTTP requests (and Playwright for anything visual). A passing unit test alone does not close an item.
- Do not claim anything works on Vercel or Netlify unless you actually ran it there. This environment has no platform access, so say "verified by running the generated function outside the monorepo" and nothing stronger.
- Do not commit or push. Leave changes staged. Do not publish to npm. Do not add co-author lines.
- Every new dependency in `packages/core` needs a line in `packages/core/DEPENDENCIES.md`.
- Update `CHANGELOG.md`, `DEPLOYING.md` and the docs wording as you go. Remove or correct the claim in `CLAUDE.md` that Vercel deployment is "confirmed live" (it is no longer true while `nodejs20.x` is hardcoded).

## Phase 1 — Deployment adapters (highest priority; real projects failed on all of these)

1. **V1 runtime**: `adapters/adapter-vercel/src/index.ts:197` hardcodes `runtime: "nodejs20.x"`, which Vercel now rejects. Read it from the project's `engines.node` / running Node major, allow an adapter option to override it, and default to the current Vercel-supported LTS. Check `adapter-netlify` for the same pattern. Add a test.
2. **V8 ESM + CommonJS**: both `adapter-vercel/src/bundleForDeploy.ts` and `adapter-netlify/src/bundleForDeploy.ts` call esbuild with `format: "esm"` and no banner, so any inlined CJS package calling `require("events")` (for example `pg`) crashes at the first request with "Dynamic require of "events" is not supported" after a green build. Add the `createRequire` banner (`import{createRequire}from"node:module";globalThis.require??=createRequire(import.meta.url)`) to both esbuild calls in both adapters. Add a smoke test that bundles a package using `require("events")`, then runs the generated function outside the monorepo and requests it.
3. **V2 `api/` collision**: Devora's `apps/<name>/api/` is also Vercel's reserved `api/` folder. With Root Directory = `apps/<name>`, Vercel treats each file as its own function (25 files hit the Hobby 12-function limit) or type-checks them with its own tsconfig (hundreds of TS2835/TS2834 errors). Propose the smallest fix and ask me to choose before building: (a) `apiDir` option in `defineApp`, (b) adapter-generated `.vercelignore` plus a documented Root Directory requirement, (c) a different default folder name. Whatever you choose, document it in bold in `DEPLOYING.md`.
4. **V3 monorepo layout**: the generated `vercel.json` assumes the app is the project root and that `devora` is on PATH. In a workspace the binary is hoisted and `.vercel/output` is written inside `apps/<n>/`. Make the generated config workspace-aware, or add an adapter `--out <dir>` flag so no custom root script is needed. Document "N Devora apps in one repo = N Vercel projects" with the exact Root Directory and build command.
5. **V5 log line**: the adapter prints "verified locally in isolation, NOT deployed … see ROADMAP.md #4". `ROADMAP.md` is not in the npm package. Reword it and link to the docs site.
6. **V7 preflight**: before writing output, `devora build --adapter=vercel` should check that the runtime is supported, that there is no conflicting top-level `api/`, that `.vercel/output` will be where the platform looks, and that required env vars (session secrets per auth mode) are set, with a clear error instead of a bare first-request 500.
7. **V4 build hook**: add a documented `prebuild` hook (app config or CLI flag) for codegen such as Prisma and CSS builds on a clean checkout.

## Phase 2 — Sessions, cookies and security config

1. **Cookie `Secure`** (confirmed in `packages/core/src/session.ts` `buildCookieAttributes()`): it adds `Secure` whenever `NODE_ENV === "production"`, which breaks logins over plain HTTP. Add `sessions.cookie.secure: "auto" | true | false` and `trustProxy`; `"auto"` sets `Secure` only for HTTPS requests, reading `X-Forwarded-Proto` when `trustProxy` is on. Keep dev behaviour unchanged.
2. **K1 first-class settings** (Khepra had to patch core with patch-package): cookie `SameSite` per app, `X-Robots-Tag: noindex` per app, session active/idle lifetimes per app, all in `defineApp`/`devora.config.ts` and passed through `createProdRequestHandler`'s `security` object. Document defaults.
3. **Cookie `Domain`** option (`sessions.cookie.domain`) so shared login can work across subdomains. Until it ships, make sure every doc claiming "shared login" states the limitation.
4. CSRF cookie should not be set on responses to Bearer-authenticated requests, and apps should be able to opt out.
5. `devora start` must read `PORT`/`HOST`, log when it sets `NODE_ENV`, and `--adapter` must reject unknown values with a clear error.

## Phase 3 — Request access, head, CSS, islands (confirmed by two products each)

1. Page loaders and actions get the request: `ctx.request` (standard `Request`) or at least `ctx.url`, `ctx.headers`, `ctx.ip`. Actions can return data to the following render, not only redirects. Page-action `HttpError` keeps its real status (403 CSRF, 400, 404), redirect-after-POST is 303, and an app can define a custom error page.
2. A documented head/root-layout API (stylesheets, fonts, manifest, meta, scripts). Stop injecting global CSS such as `body { display:flex }` and the hardcoded favicon path unless the app opts in. Link route-imported CSS in SSR/SSG HTML.
3. Island discovery: `island()` calls outside `routes/*` are silently ignored. Either follow imports statically, or fail the build with the file and line.
4. `multipart/form-data` in actions with a configurable size limit.
5. Build must not execute request-time-only server modules (or must document the rule loudly).
6. Fix the published `.d.ts` so a fresh scaffold passes `tsc --noEmit` (`CsrfField` return type, render types, `session`/`setSession` typing). Add a CI check that typechecks a fresh scaffold against the built packages.

## Phase 4 — Dev experience and quick wins

1. **Vite watcher spam**: in a real project the dev log fills with `[vite] page reload .vercel/output/static/index.html` and `.vercel/output/functions/index.func/dist/static/index.html`, because adapter output inside `apps/<n>/` is watched. In `createAppDevServer` (`packages/cli/src/commands/dev.ts`) add `server.watch.ignored` for `**/.vercel/**`, `**/.netlify/**` and `**/dist/**`, and verify the spam is gone.
2. **First-load reload / "invalid hook call"**: the log shows `new dependencies optimized: @devorajs/core/client` followed by `optimized dependencies changed. reloading` on first load. Pre-bundle with `optimizeDeps.include` (core/client, react, react-dom) and verify a cold first load has no reload and no invalid-hook error.
3. `devora --version` prints a hardcoded `0.1.0` (`packages/cli/src/index.ts`). Read it from `package.json`.
4. Load `.env` / `.env.local` automatically (document the order), or document loudly why not.
5. Add a small `cors({ origins })` option to `defineApp`.
6. API-only apps should not pre-render `/` (it prints `pre-rendered (ssg/isr): /`). Make the API app's default `/` a small status page only if nothing else is defined.
7. Replace links to `ROADMAP.md` in error messages with the docs site.
8. Fix `devora add api` generating page-app files for a backend-only app.
9. Add `engines` fields and allow React 19 / newer Vite if tests pass.

## Phase 5 — Design pass (shared shell, all scaffolded apps)

Problem, from a screenshot of a deployed Devora app (the default API landing page): the content is short, and the "Built with devora.js" footer sits directly under the content in the middle of the screen instead of at the bottom, and the page looks plain.

Cause to confirm: `packages/core/src/theme.ts` makes `body` a flex column with `min-height: 100vh`, but `PageShell` in `packages/core/src/branding.tsx` renders `<main className="devora-page">` with no `flex: 1`, so nothing pushes `<footer className="devora-footer">` down.

Do this:
1. Sticky-bottom footer: `main` grows (`flex: 1`), footer stays at the bottom on short pages and below the content on long pages. Verify at 375px, 768px and 1440px widths, short and long pages, light and dark, with Playwright screenshots.
2. Improve the design of `PageShell`, header, footer and the default landing/status page: a clearer type scale and spacing rhythm, a centered content column with a sensible max width, a refined header (logo, app-name badge, nav that wraps cleanly on mobile), better card, form, button and focus styles, consistent border and shadow tokens, a footer with the logo plus optional custom links, good contrast in both themes, and no layout shift. Keep it dependency-free and CSP-safe (no inline scripts), and keep the existing `nav` and `footer` props backward compatible.
3. Show me before/after screenshots for the default marketing, dashboard, admin and API-only scaffolds.

## Phase 6 — Terminal logo, like Next.js and Vite

When someone runs `npx create-devora@latest` and when they run `npm run dev` (also `devora build` and `devora start`), print a branded header the way Next.js (`▲ Next.js 16`) and Vite (`VITE v5 ready in 300 ms`) do.

- Build a compact text mark (max 6 lines) from the Devora logo (`assets/icons/devorajs.png`, the `d›` glyph) using ANSI color, with a truecolor gradient and 256-color and no-color fallbacks. Terminals cannot render the PNG portably, so do not use inline images.
- Show `devora.js <version> (version read from package.json)` and `ready in N ms` for `dev`, then the existing per-app `Local` / `Network` / `API` lines and route tables. Keep the route table, but keep the output scannable: group per app, and consider a summary with counts plus `--routes` to expand (ask me before changing the default).
- `create-devora` (`create-devora/src/index.ts`): print the logo at the start and a clear "next steps" block at the end (`cd`, install, `npm run dev`).
- Respect `NO_COLOR`, `FORCE_COLOR`, non-TTY output and CI (plain text, no animation), and add `--quiet`. No dependency unless justified in `DEPENDENCIES.md`; plain ANSI escape codes are enough.
- Add tests for the formatter (color on/off, narrow terminals) and show me the output as text.

## Final report format

For each phase: a table of items with status (done / already fixed / could not reproduce / blocked), the files changed, how it was verified, and anything unverified. End with the exact list of packages that need a coordinated release (`@devorajs/core`, `@devorajs/cli`, `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify`, `create-devora`), a proposed version number with reasons (note that `shared.backend` becoming optional is already pending for that release), and any breaking changes users must know about. Do not publish.
