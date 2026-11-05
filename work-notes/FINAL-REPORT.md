# Final report, release/0.4.0-final

Unattended run of 2026-11-05 in a cloud container (Linux, 4 cores, 15 GB, Node 22.23.4, pnpm 10.28.0). Nothing was
merged, tagged or published; no settings were changed. Both branches are pushed:

| Repository | Branch | Head |
|---|---|---|
| hassanalsa3aka/devora.js | `release/0.4.0-final` | see `git log -1 origin/release/0.4.0-final` (this file is in the last commit) |
| hassanalsa3aka/devorajs-docs | `release/0.4.0-final` | `daddf0b` |

Pushes were refused (403) for the first 20 minutes; you fixed GitHub access and every phase since is pushed.

## Phases

| Phase | State | Summary |
|---|---|---|
| 0 State | Done | Both branches from `origin/main`; merged `chore/dependabot-react` (devora.js) and `docs/post-fixes` (docs) with `--no-ff` |
| 1 Finish what is left | Done | Streaming flake: a real timer race, fixed (H23); scaffold CI port base 11090 in 11000–11099; H22 done (also a Vite 6 bug); gate green |
| 4 Red team | Done | 6 findings fixed with regression tests (H24–H29), 3 open (H30–H32); 121 + 26 attack checks, ~95M fuzz inputs, ReDoS checks |
| 5 Docs | Done (for phases 0–4) | Security page next-release section, roadmap wording, release-day templates and a script bug, a blog draft, fact-check table |
| 6 Verify and hand over | Done (first pass) | Gate, scaffold matrix (5 of 6; Yarn 4 blocked by the container network), docs build and SEO, screenshots, release-day notes |
| 3B Performance | Not done at the time of this report | See the bottom of `work-notes/final-progress.md` for whether it ran later |
| 2 Own dev server | Not done | Not started |
| 3 Desktop target | Not done | Not started |

## Commits (devora.js, in order after main)

`979a242` merge chore/dependabot-react · `b3e2604` phase 0 notes · `27fbf41` streaming fix (H23) · `3526d0b` CI port
base · `cfc2dce` H22 · `2b7b9d6` phase 1 docs and CLI bundle · `89014cd` cookies (H24, H25) · `84e9ebc` CSRF and
rateLimit methods (H26) · `9ce504a` ctx.url host (H27) · `afb4ea2` tests H24–H27 · `8ac6469` dev open-in-editor guard
(H28) · `7487bdf` scaffold names (H29) · `8a1a1a6` CLI bundle · `293362e` red-team docs · `5d8968d` phase 4 notes ·
`e5b2905` release-day notes.

Docs: `f603ad5` merge docs/post-fixes · `f72288b` security and roadmap pages, release-day fixes, draft, fact check ·
`daddf0b` screenshots.

## Tests and checks

| Check | Result |
|---|---|
| Per-package typecheck (core, cli, 3 adapters, scaffold, create-devora) | 7 of 7 PASS |
| Full suite | 68 files, 644 tests, all PASS (was 65 / 627 on main) |
| check:docs | PASS (143 links, 0 broken; no stale versions) |
| Pack check (`checkPackContents.mjs`) | PASS; `work-notes/` is in no tarball |
| Streaming test file under load | 200 of 200 PASS (3 CPU-bound processes, 4 cores) |
| Scaffold matrix (`ci-scaffold-pm.mjs`) | npm, Yarn 1, pnpm 9, 10, 12 PASS; Yarn 4 not run (corepack cannot reach repo.yarnpkg.com here, twice) |
| Docs build / check:seo | PASS / 33 pages, all checks pass |
| Docs release-day dry run | all 8 steps apply (with the drafts from git history) |
| Benchmarks | none run yet (phase 3B) |

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

## Experimental features

None were built (phases 2 and 3 not done). Nothing new is behind a flag.

## Behaviour changes in this branch on top of what main already had

- CSRF and rateLimit apply to every method except GET, HEAD and OPTIONS.
- A duplicated cookie name: the first value wins. A malformed cookie value is kept as sent.
- `ctx.url` never takes its host from the request target.
- `devora dev`: cross-site `/__open-in-editor` gets 403; a listed `allowedHosts` host reaches the app (no Vite 403).
- `create-devora` and `devora new` refuse app names other than lowercase letters, digits, `-`, `_` (≤ 50).

## Skipped because they need local files

- `~/Developer/_lab/...` (anything there), including the current 0.4.0 post drafts: the docs release-day dry run
  used the copies from git history (06bbf28) instead.
- The "1 in 96 / 2 in 96" flake counts are quoted from the brief, not re-measured.

## Needs your decision

1. H30 (bind the CSRF token to the session, or `__Host-` cookies) and H31 (IPv6 /64 keys for rateLimit).
2. The `esbuild` override in package.json's `"pnpm"` field (pnpm 11 ignores it); CI still pins pnpm 9.9.0, which does
   not read overrides from pnpm-workspace.yaml. Not changed.
3. Whether to publish the red-team blog draft (devorajs-docs `work-notes/drafts/red-team-before-0-4-0.md`).

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
- Re-measure performance on local hardware before publishing any number.
- Verify on a live multi-app Vercel and Netlify deployment (finding N1).
