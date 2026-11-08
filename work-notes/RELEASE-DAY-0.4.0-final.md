# Release day, 0.4.0 from release/0.4.0-final

What is still to do to publish 0.4.0 from the two integration branches, in order, with the exact commands, what to
check after each step, and how to roll back. Every command is marked **[run]** (run in the cloud container on
2026-11-05, result given) or **[not run]** (for the maintainer). Nothing was published, tagged or merged.

Branches: `release/0.4.0-final` in hassanalsa3aka/devora.js and in hassanalsa3aka/devorajs-docs. The final commit
hashes are in `work-notes/FINAL-REPORT.md`.

## 0. Before the day

- [not run] Read `work-notes/FINAL-REPORT.md`, `work-notes/redteam/REDTEAM.md` and the 0.4.0 CHANGELOG entry.
- [not run] Switch on GitHub's private vulnerability reporting (Settings → Code security). SECURITY.md names it.

## 1. Merge the integration branches into main

Framework:

```bash
cd devora.js && git fetch origin && git checkout main && git pull --ff-only origin main
git merge --no-ff origin/release/0.4.0-final -m "Merge release/0.4.0-final: 0.4.0 integration (streaming fix, H22, red-team fixes H24 to H29, docs)"
pnpm install --frozen-lockfile && pnpm run test && pnpm run check:docs
git push origin main
```

- [not run] Check: CI on main is green (build matrix, package-managers job, audit job).
- [run, on the branch] Full gate: 7 per-package typechecks, CLI bundle, full suite, check:docs, package builds, pack
  check: all PASS (see FINAL-REPORT.md for the counts).

Docs site:

```bash
cd devorajs-docs && git fetch origin && git checkout main && git pull --ff-only origin main
git merge --no-ff origin/release/0.4.0-final -m "Merge release/0.4.0-final: security page next-release section, roadmap wording, release-day fixes"
npm ci && npm run build && npm run check:seo
git push origin main
```

- [run, on the branch] `npm run build` exit 0; `npm run check:seo`: 33 pages, all checks pass.
- [not run] Check: the Vercel preview of main renders /security and /roadmap (screenshots of both at 375 and 1280 px
  are in devorajs-docs `work-notes/screenshots/`).

## 2. Framework release day (date, publish, tag)

```bash
cd devora.js
node scripts/release-day.mjs <YYYY-MM-DD> --dry-run
node scripts/release-day.mjs <YYYY-MM-DD> --notes /tmp/devora-0.4.0-notes.md
git add -A && git commit -m "release: 0.4.0, <YYYY-MM-DD>"
```

- [run] `--dry-run` with 2026-11-20: it would change CHANGELOG.md, ROADMAP.md and CLAUDE.md, and printed the plan.
- [not run] Then follow the plan the script prints, steps 1 to 7: state check (`npm whoami`), build and
  `checkPublishable` per package, publish in order core → adapter-node → adapter-vercel → adapter-netlify → cli →
  create-devora (each `npm view <pkg>@<version> version` before the next), the fresh-folder check, the example and
  benchmark lockfiles, `git tag -a v0.4.0`, `git push origin main v0.4.0`, `gh release create v0.4.0`.
- What to check: `npm view @devorajs/core version` prints 0.4.0; a fresh `npm create devora@latest` project installs,
  typechecks, builds and starts, and `/login` works; the examples CI job is green with the new lockfiles.

## 3. Docs release day

```bash
cd devorajs-docs
node scripts/release-day.mjs <YYYY-MM-DD> --dry-run --drafts=<folder with devora-0-4-0.* and security-review-nextjs-advisories.*>
node scripts/release-day.mjs <YYYY-MM-DD> --drafts=<same folder>
npm install && node scripts/check-guide-names.mjs && node scripts/check-versions.mjs
npm run build && npm run check:seo
git add -A && git commit -m "site: release 0.4.0"
git push origin main
```

- [run] `--dry-run` with 2026-11-20 and the two drafts as they were last tracked in git (06bbf28): all 8 steps
  apply, 12 files would change. Step 7 now really removes "once it is published" (fixed on this branch).
- [needs local file] The current drafts are on the maintainer's Mac (`~/Developer/_lab/drafts-backup/blog`); they may
  be newer than the git copies used for the dry run.
- [not run] Optional: publish the red-team post from devorajs-docs `work-notes/drafts/red-team-before-0-4-0.md`
  (it is Markdown; it would need converting to a route like the other posts, and its date set to the publishing day).
- What to check: /upgrading shows "Upgrading to 0.4.0" with the two new rows (duplicated cookies, app names);
  /security shows "New in 0.4.0"; the sitemap and RSS list the new posts.

## 3b. Decisions before publishing (not run)

- [not run] Decide whether `devora desktop ... --experimental` ships in 0.4.0 (it is in the CLI on this branch,
  opt-in; the window was never built). If not, revert commit 9578409's CLI wiring before step 2 (keep the package).
- [not run] Benchmark apps: `benchmarks/apps/devora*` pin 0.4.0, which npm does not have until step 2; their
  `npm ci` fails until then (the release-day script's step 5 refreshes their lockfiles after publishing).

## 4. After publishing

- [not run] Verify 0.4.0 on a live multi-app Vercel and Netlify deployment with sessions and API routes (finding N1).
- [not run] Re-measure performance on local hardware before publishing any number: the container results and the
  draft table are in `work-notes/perf/RESULTS.md` and devorajs-docs `work-notes/perf-draft/PERFORMANCE-DRAFT.md`.

## Rollback

- A package is broken within 72 hours of publishing: `npm unpublish @devorajs/<pkg>@0.4.0` is possible but
  discouraged; prefer `npm dist-tag add @devorajs/<pkg>@0.3.5 latest` for core and cli, and for each adapter its
  previous version (read it first with `npm view @devorajs/adapter-node dist-tags` before publishing), then `npm deprecate @devorajs/<pkg>@0.4.0 "<reason>; use 0.3.5 until 0.4.1"`.
- After 72 hours: deprecate and publish 0.4.1 with the fix.
- Git: `git revert -m 1 <merge commit>` on main (no history rewrite); delete nothing.
- Docs: `git revert` the "site: release 0.4.0" commit; Vercel redeploys main.
