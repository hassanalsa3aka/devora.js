# release/0.4.0-final — progress

Working log for the unattended integration run. Not part of any published package (work-notes/ is outside every
package folder; the pack check confirms it). Newest phase at the bottom.

Environment: cloud container, Linux, Node 22.23.4, npm 10.9.9, pnpm 10.28.0, Yarn 1.22.22, Bun 1.4.4.
No access to the maintainer's Mac: anything under ~/Developer/_lab is "needs local file".

Priority order used (from the brief): phases 0, 1, 4, 5, 6 first, then 3B, 2, 3.

## Phase 0 — state (done)

- Both repos: `release/0.4.0-final` created from `origin/main`.
  - devora.js main at a050152 (merge chore/vercel-ignore-dependabot). Main already contains release/0.4.0
    (security hardening H1–H21, 0.4.0 versions), chore/release-day-0.4.0, chore/ci-package-managers,
    chore/dependabot-majors.
  - devorajs-docs main at f048591 (sitemap lastmod after merging docs/release-day-0.4.0 and docs/seo).
- Merged with --no-ff:
  - devora.js: `origin/chore/dependabot-react` (948bc87: dependabot ignores react majors + fact-check fixes) → 979a242.
  - devorajs-docs: `origin/docs/post-fixes` (bd9b0be: drafts untracked; release-day script fixes) → f603ad5.
- Other remote branches seen and NOT merged (not asked): devora.js release/0.3.5, release/0.4.0 (already in main),
  v2, fix/*, docs/wording-after-0.3.5, dependabot/*; docs: docs/package-managers, docs/seo,
  docs/release-day-0.4.0, site/launch-polish (checked ancestry where relevant in later phases).
- Decision: commits carry no attribution trailers (maintainer's rule overrides the harness reminder).
- Decision: only `release/0.4.0-final` and `release/0.4.0-final-<phase>` are pushed; the harness's default
  session branch is not used.
- **Was blocked — push (resolved by the maintainer at about 00:20; phases 0 and 1 pushed then):** `git push -u origin release/0.4.0-final` answers 403 in both repos ("Claude doesn't have GitHub
  access to hassanalsa3aka/<repo> for your organization"). Fetch works; writes do not. Fixing it needs the
  maintainer's GitHub/claude.ai settings (reconnect GitHub or install the GitHub App with write access), which the
  brief lists as a hard stop. No other route (API file uploads) was tried, so nothing was written to GitHub.
  Work continues as local commits on `release/0.4.0-final` in the container; at the end of each phase a git bundle
  of both branches is written to the session scratchpad so the work can be recovered while the container lives.

## Phase 1 — finish what is left (done)

- a) Streaming flake: real cause found in about 30 minutes, not a test-only race. React 18's server renderer
  retries a suspended component from `setImmediate`; the island cache removed a failed import on `setTimeout(0)`.
  Timer first → same-request re-import → the first error never reported. Fixed in islandComponent.tsx (remove on
  read; 1 s unref'd timer only for abandoned entries). New deterministic test failed 5/5 before, passes after;
  renderStreaming.test.ts 200/200 under 3 CPU hogs on 4 cores. Finding H23 added; H19 row says it was not the only
  cause; CHANGELOG wording now states both causes and the measured runs (replaces "no longer loses that error").
  The "1 in 96 / 2 in 96" figures are from the brief (maintainer's runs), not re-measured here.
- b) scripts/ci-scaffold-pm.mjs: it used `PM_TEST_PORT` default 4300 with no range check. Now default 11090,
  exits 2 outside 11000-11099 (checked: 4300, 11099, "abc" all refused). The run itself (scaffold + install)
  was not executed in phase 1 (phase 6 runs the matrix).
- c) No ROADMAP finding is literally marked "quick-fix". Checked the open list: H22 was small and safe → done
  (and turned out to be a real Vite 6 bug too: a listed custom host got Vite's 403). Not done, recorded:
  the esbuild override move out of package.json "pnpm" (CI pins pnpm 9.9.0, which does not read overrides from
  pnpm-workspace.yaml: moving it could change CI's lockfile resolution — needs a decision); H18 (vitest 3 breaks
  55 integration tests; not small); S3 (needs a behaviour decision).
- d) Gate: 7 per-package typechecks PASS, CLI bundle rebuilt, full suite 65 files / 627 tests PASS,
  check:docs PASS, package builds PASS, pack check PASS (work-notes/ not in any tarball).

Resume notes: phase 1 committed locally; push still refused (see phase 0). Next: phase 4 (red team).
Gate script: $SCRATCH/gate.sh (copy kept under work-notes/redteam/scripts/gate.sh from phase 4 on).

## Phase 4 — red team (done)

Report: work-notes/redteam/REDTEAM.md; scripts in work-notes/redteam/scripts/ (attack-prod.mjs 121 checks,
attack-dev.mjs 26, fuzz.mts 9 parsers ~95M inputs, redos.mts 12 worst cases, gate.sh).
- Fixed with regression tests (each fails without its fix): H24 cookie escape → 500 for every page; H25 duplicate
  cookie names (first wins); H26 CSRF + rateLimit for every method but GET/HEAD/OPTIONS; H27 ctx.url host from an
  absolute-form/`//` target; H28 dev `/__open-in-editor` cross-site guard; H29 scaffold app name/domain validation.
- Open, need a decision (ROADMAP): H30 CSRF token not bound to the session (double-submit; needs cookie write access
  on the domain), H31 rateLimit IPv6 /64 rotation and table eviction, H32 Netlify reads the body before maxBodyBytes
  (accepted: platform cap).
- Behaviour changes to call out at release: duplicated cookie names (first wins); CSRF/rateLimit on unusual methods;
  scaffolders refuse uppercase or odd app names (`Web` is refused; existing projects unaffected).
- Gate after the fixes: 7 typechecks PASS, suite 68 files / 644 tests PASS, check:docs PASS, pack check PASS.
- Time: about 1 h 45 min (over 45 min: the breadth of the brief's list; no single item took longer than 20 min).

Resume notes: phase 4 committed and pushed. Next: phase 5 (docs repo).

## Phase 5 — docs (done; devorajs-docs release/0.4.0-final)

- security.tsx "Next release" section: method rule, four new default rows (ctx.url host, cookies, dev
  open-in-editor, scaffold names), "do not share the domain", two upgrade checks, a "Red-team pass" paragraph (no
  exploit details for the open H30/H31). roadmap.tsx: mobile and Metro-class tooling after desktop, nothing in code.
- Release-day templates (upgrading-040.changes.tsx, release-day.mjs CSRF callout) updated; two new upgrade rows.
  Fixed a release-day.mjs bug: step 7's second edit was always skipped as "already applied".
- Blog draft: work-notes/drafts/red-team-before-0-4-0.md (not routed/linked, date left for publishing day).
- Fact-check: work-notes/FACT-CHECK-final.md (docs repo), every new sentence in both repos.
- Docs build exit 0; check:seo 33 pages all pass; release-day dry run all 8 steps (drafts from git 06bbf28,
  the current drafts are "needs local file").
- Not done: experimental dev server / desktop docs (phases 2 and 3 not started yet); package-manager table
  unchanged (no change to document). Performance numbers: none (phase 3B not run yet).

## Phase 6 — verify and hand over (done, first pass; repeated at the end if later phases change code)

- Full gate after phase 4: PASS (68 files / 644 tests); scripts tests 14 PASS; check:docs PASS after phase 6 edits.
- Scaffold matrix from the local build (scripts/ci-scaffold-pm.mjs): npm PASS, yarn1 PASS, pnpm9 PASS, pnpm10 PASS,
  pnpm12 PASS, yarn4 FAIL twice for the same environment reason (corepack cannot download Yarn from
  repo.yarnpkg.com through this container's network: ENOTFOUND, then UND_ERR_ABORTED with NODE_USE_ENV_PROXY=1).
  Not a code failure; CI's package-managers job covers Yarn 4. Recorded and skipped per the brief.
- Docs: build PASS, SEO PASS, screenshots of /security and /roadmap at 375 and 1280 px (no horizontal overflow) in
  devorajs-docs work-notes/screenshots/.
- Perf re-run against 3B: not possible yet (3B not run); repeated at the end if 3B runs.
- RELEASE-DAY-0.4.0-final.md written; framework release-day.mjs text points at release/0.4.0-final; CHANGELOG's
  findings line updated (H1 to H29; H18, H30 to H32 open).
