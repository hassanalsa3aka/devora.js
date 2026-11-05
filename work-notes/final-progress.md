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
