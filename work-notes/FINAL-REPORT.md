# Final report, release/0.4.0-final

Unattended run of 2026-11-05 in a cloud container (Linux, Intel Xeon 2.1 GHz, 4 cores, 16 GB, Node 22.23.4,
pnpm 10.28.0). Nothing was merged, tagged or published; no settings were changed. Both branches are pushed:

| Repository | Branch | Head |
|---|---|---|
| hassanalsa3aka/devora.js | `release/0.4.0-final` | the commit that adds this file (`git log -1 origin/release/0.4.0-final`) |
| hassanalsa3aka/devorajs-docs | `release/0.4.0-final` | `e42f4bc` |

Pushes were refused (403) for the first 20 minutes; after you fixed GitHub access every phase was pushed.

## Phases

| Phase | State | Summary |
|---|---|---|
| 0 State | Done | Both branches from `origin/main`; merged `chore/dependabot-react` (devora.js) and `docs/post-fixes` (docs) with `--no-ff` |
| 1 Finish what is left | Done | Streaming flake: a real timer race between React's `setImmediate` retry and the island cache's `setTimeout(0)`; fixed with a test that fails 5/5 before, file passes 200/200 under load (H23). CHANGELOG wording replaced. Scaffold CI port base 11090 in 11000–11099. H22 done (also a real Vite 6 bug). Gate green |
| 4 Red team | Done | 6 findings fixed with regression tests (H24–H29), 3 open (H30–H32). 121 + 26 attack checks, ~95M fuzz inputs, ReDoS worst cases, supply chain |
| 5 Docs | Done | Security page next-release section and red-team summary (no exploit details for open items), roadmap (experimental section; mobile and Metro-class later), CLI reference for the experimental desktop command, release-day templates (and a bug in the release-day script), red-team blog draft, unpublished perf draft, fact-check table |
| 6 Verify and hand over | Done | Gate, scaffold matrix, docs build and SEO, screenshots, perf re-check against 3B, release-day notes, this report |
| 3B Performance | Done (core scope) | 10 backend + 5 pages frameworks, 8 scenarios, 5 runs. Two profile-driven fixes (S5 +8.3% form POST beyond the spread; S6 CPU removed). Extra scenarios not run (listed). Draft only, not published |
| 2 Own dev server | Partly | Pain analysis, design, acceptance criteria; the security core as `packages/dev-server` with tests. Not wired into the CLI (no flag): it does not render pages, so default behaviour cannot change. No benchmark against Vite (nothing to compare) |
| 3 Desktop target | Mostly | Design (Tauri kept), `packages/desktop`, `devora desktop dev|build|serve --experimental`, `examples/desktop-app`, end-to-end check in the container; the window itself needs your Mac (MANUAL-CHECK.md) |

## Tests and checks (final)

| Check | Result |
|---|---|
| Per-package typecheck (core, cli, 3 adapters, scaffold, create-devora) | 7 of 7 PASS (plus desktop and dev-server) |
| Full suite | 71 files, 664 tests, all PASS (65 / 627 on main) |
| check:docs, pack check | PASS; `work-notes/` and the new private packages are in no tarball |
| Streaming test file under load | 200 of 200 PASS |
| Scaffold matrix (`ci-scaffold-pm.mjs`), final branch | npm, Yarn 1, pnpm 9, 10, 12 PASS; Yarn 4 not run: corepack cannot reach repo.yarnpkg.com from this container (twice); CI covers it |
| Docs build / check:seo | PASS / 33 pages, all checks pass; screenshots at 375 and 1280 px of every changed page (security, roadmap, cli-reference), no horizontal overflow |
| Perf re-check, final branch vs 3B build (interleaved, 3 runs) | D −1.0%, F1 +1.8%, B −2.8% (all inside the spread); C +9.5% (the redirect fast path). No regression |

## Benchmarks (cloud container, relative only; `work-notes/perf/RESULTS.md`)

- JSON API (D–G): Devora.js 4th of 10 (3rd on F2, tied with NestJS-Fastify); Fastify, Hono, NestJS-Fastify ahead.
  Authenticated GET 17,995 vs Fastify 47,408 req/s (real session layer; S3 open).
- Pages (A–C): Devora.js had the highest req/s on all three in this run and the shortest cold build of five;
  SvelteKit starts faster, uses less memory and sends less JS.
- 0.4.0 vs 0.3.5: ties everywhere when interleaved, except the form POST, which was −15%; profile → the H4 redirect
  check; fixed (+8.3%, now ~5% below 0.3.5). A sequential "−13%" on the JSON list was container drift (S7).

## Red-team findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| H24 | Medium | A malformed cookie escape made every page a 500 for that browser | Fixed, test |
| H25 | Low | Duplicated cookie name: last value won (cookie tossing) | Fixed, test |
| H26 | Medium | CSRF default and rateLimit skipped methods other than POST/PUT/PATCH/DELETE | Fixed, test |
| H27 | Medium | `ctx.url` host taken from an absolute-form or `//` target, bypassing allowedHosts | Fixed, test |
| H28 | Low (dev) | Any page could trigger Vite's `/__open-in-editor` | Fixed, test |
| H29 | Medium (local) | Scaffold app names and domains unchecked in generated code, paths and the Netlify command | Fixed, test |
| H30 | Low–medium | CSRF token not bound to the session (double-submit) | Open, needs your decision |
| H31 | Low | rateLimit and IPv6 /64 rotation, table eviction | Open, needs your decision |
| H32 | Info | Netlify reads the body before maxBodyBytes | Open, accepted (platform cap) |

Details: `work-notes/redteam/REDTEAM.md`. The full `pnpm audit` still lists the vitest advisories (H18, dev-only).

## Experimental, and how to turn it on

- **Desktop target:** `devora desktop dev --experimental --app <name>` (serve the built app behind the desktop
  rules and print a launch URL), `devora desktop build --experimental --app <name>` (write the Tauri project),
  `devora desktop serve --experimental --app <name>` (the sidecar; token in `DEVORA_DESKTOP_TOKEN`). Without
  `--experimental` it exits with a message. It ships inside the CLI if this branch is published.
- **Dev server core:** `packages/dev-server` (private). Not reachable from the CLI; nothing to turn on yet.

## Behaviour changes in this branch on top of main

- CSRF and rateLimit apply to every method except GET, HEAD and OPTIONS.
- A duplicated cookie name: the first value wins. A malformed cookie value is kept as sent.
- `ctx.url` never takes its host from the request target.
- `devora dev`: cross-site `/__open-in-editor` gets 403; a listed `allowedHosts` host reaches the app.
- `create-devora` and `devora new` refuse app names other than lowercase letters, digits, `-`, `_` (≤ 50).
- New, opt-in: `devora desktop ... --experimental`.

## Skipped because they need local files

- Anything under `~/Developer/_lab`, including the current 0.4.0 post drafts (the docs release-day dry run used
  the copies from git history, 06bbf28).
- The "1 in 96 / 2 in 96" flake counts are quoted from the brief, not re-measured.

## Needs your decision

1. H30 (bind the CSRF token to the session, or `__Host-` cookies) and H31 (IPv6 /64 keys for rateLimit).
2. S3 (memory session store clones every record) and S7 (interleave the benchmark harness).
3. The `esbuild` override in package.json's `"pnpm"` field (pnpm 11 ignores it; CI pins pnpm 9.9.0). Not changed.
4. Whether `devora desktop` should ship in 0.4.0 (it is opt-in and tested without a display) or wait for 0.4.1.
5. Whether to publish the red-team post and, after re-measuring locally, the performance draft.
6. How to package the desktop sidecar (Node single-executable or another bundler).

## Merge both branches into main

```bash
cd devora.js && git fetch origin && git checkout main && git pull --ff-only origin main
git merge --no-ff origin/release/0.4.0-final -m "Merge release/0.4.0-final"
pnpm install --frozen-lockfile && pnpm run test && pnpm run check:docs
git push origin main
```

```bash
cd devorajs-docs && git fetch origin && git checkout main && git pull --ff-only origin main
git merge --no-ff origin/release/0.4.0-final -m "Merge release/0.4.0-final"
npm ci && npm run build && npm run check:seo
git push origin main
```

## What you must do by hand

- Switch on GitHub private vulnerability reporting (repository settings).
- `npm login` and the publish steps in `work-notes/RELEASE-DAY-0.4.0-final.md` (each command marked run or not run).
- Run the Yarn 4 scaffold check locally or watch CI's package-managers job.
- Desktop click-through on your Mac: `work-notes/desktop/MANUAL-CHECK.md` (Rust, Tauri CLI, the sidecar binary,
  navigation, `window.open`, IPC, signing).
- Re-measure performance on local hardware before publishing any number (`work-notes/perf/PLAN.md`, Reproduce).
- Verify on a live multi-app Vercel and Netlify deployment (finding N1).
