# Prompt for Claude Code: update both repos' docs, refresh the docs site, add benchmarks

Start Claude Code in a folder that contains `devora.js/` and `devorajs-docs/` side by side
(clone `https://github.com/hassanalsa3aka/devorajs-docs` next to `devora.js` if it is missing).
Paste everything below the line.

---

You are updating documentation for Devora.js in two repos: `devora.js` (the framework) and
`devorajs-docs` (the documentation website, built with Devora.js itself). The framework is at
0.3.2 (`@devorajs/core` and `@devorajs/cli` 0.3.2, adapter-vercel and adapter-netlify 0.2.3,
adapter-node 0.2.1, create-devora 0.3.1), all published on npm. The docs site still targets 0.3.1.

Sources of truth, in this order: the source code at HEAD, the 0.3.2 section of `devora.js/CHANGELOG.md`,
`PAGES.md`, `packages/backend/AUTH.md`, `DEPLOYING.md`, then a fresh scaffold from `npm create devora@latest`.
If a document and the code disagree, the code wins; fix the document.

## Ground rules

- Work in the phases below. After each phase give me a short report (what changed, how you verified it,
  what you could NOT verify, decisions needed) and wait for my "go".
- Verify every claim before writing it: read the source or run it on a fresh scaffold. Do not copy a claim from an
  older document without checking it. Remove or correct stale claims; list each one you changed in the report.
- Nothing has been deployed on Vercel or Netlify with 0.3.2 yet. Do not write that any deploy "works" or is
  "confirmed live" for those platforms. Say what was verified (for example "the generated function was run
  outside the monorepo") and mark the rest "not yet verified on a live deployment".
- Do not invent numbers, users, testimonials, quotes, logos or performance claims. No superlatives
  ("fastest", "best", "blazing"). Keep the site's existing honest tone: say where another framework is the better choice.
- Documentation work only. Do not change framework source in `devora.js`. If a document would need a code change to
  be true, write the true version and list the mismatch in the report as a possible framework issue.
- Git: commit under my configured identity only (check `git config user.name` and `user.email`; stop and ask if
  empty). No `Co-Authored-By`, no "Generated with" line, no session links, and the words "Claude", "Anthropic"
  and "AI" must not appear in any commit message or in text you add to the repos (the existing project
  brief file name is the only exception). One commit per phase per repo, tested before committing. Work on a new
  branch in each repo (`docs/0.3.2` in devora.js, `site/0.3.2` in devorajs-docs). Do not push. Do not publish.
- Site constraints: the CSP forbids inline scripts and third-party hosts (only the existing analytics hosts are
  allowed), so icons must be inline SVG or CSS. The header component renders plain links only (no dropdowns). New pages
  must appear in `sitemap.xml`, the Pagefind search index (`scripts/build-docs.sh`), the JSON-LD helpers in `seo.tsx`
  and the OG card generator. Verify every page with Playwright screenshots at 375, 768 and 1440 px, light and dark, and
  check keyboard focus and contrast.

## Decisions I already made (tell me if one of them is wrong; otherwise follow them)

- **Header** (apps/docs/nav.ts): Docs, Examples, Blog, Compare, Search, GitHub, Discord, Theme. "Performance" joins
  only after I approve the benchmark results. Backend does not get its own header item: it already has two pages
  ("Backend", "Backend capabilities") in the Docs sidebar. Make it more visible with a home-page section instead.
- **Learn**: no separate section. The "Getting started" group stays. Add one tested tutorial,
  "Build a multi-app project" (marketing site + dashboard + API sharing one backend and one login).
- **Showcase** (updated): I now have two real products built with Devora.js: YallaDo https://yalla-do-app.vercel.app and
  Khepra https://khepra.vercel.app. Add a "Built with Devora.js" section on the home page (two cards: screenshot taken
  with Playwright, name, one line on what it is, which Devora features it uses, link). Do not add a header item or a
  separate /showcase page until there are at least 4 real entries. Do not invent features: read what each site really uses
  from its public behavior, and ask me when unsure. The docs site itself is a third entry.
- **Live demos** (new): I deployed the multi-app test projects. Open each URL with Playwright, record the HTTP status and a
  screenshot, and list the ones that work as "Live demos" on `/examples`, grouped by platform:
  Netlify: https://devora-admin.netlify.app, https://devora-dashboard.netlify.app, https://devorajs.netlify.app.
  Vercel: https://devora-js-admin.vercel.app, https://devora-js-dashboard.vercel.app, https://devora-js-marketing.vercel.app.
  Do not say which Devora.js version they were built with unless you can verify it; ask me. If one is down or broken, tell me
  and leave it out. These deployments are the first real Vercel/Netlify evidence for the multi-app layout; describe them
  as "deployed by the maintainer", not as a platform certification.
- **Templates and Examples are one section**, `/examples`, backed by runnable folders in `devora.js/examples/`
  (not in any published package). Start with three: (1) marketing + dashboard + shared API (multi-app default),
  (2) backend-only API with Bearer login for a mobile client, (3) content site with `ssg` and islands.
  Add more examples only for things that really work in the framework today (for example uploads, CSRF-protected forms,
  head/SEO, error pages, a custom adapter); each one must run from a fresh checkout and be in CI. Prefer 5 working examples
  over 10 thin ones. Each example card shows: what it demonstrates, which apps it contains, a copy-able command, and
  links to the code folder and (if one exists) the live demo.
- **Performance widget** (new): model it on the benchmark panel on bun.com. A card with tabs (one per scenario), a bar
  chart with the framework name and exact version on each row, the value on the right, a "lower/higher is better" label,
  a footnote with the exact setup (hardware, OS, Node version, concurrency, "median of N"), and a "reproduce" link to the
  scripts. Devora.js is shown in the accent colour, the others in neutral grey, rows sorted by result, so a row where Devora.js
  loses stays visible. Tabs: Build time, Requests/second (SSR page), Requests/second (form POST), Memory, JavaScript sent
  to the browser. Be aware that Devora.js runs on Node and Vite, so raw throughput is mostly Node's; do not write that Devora.js
  "handles more users". The honest claims are the measured ones, for example how little JavaScript islands send, or the
  cost of the built-in security defaults (CSRF, CSP, headers) compared with running a plain Node server. Bar values must come
  from the generated JSON file, never typed by hand. Implement the bars in CSS and the tab switch with radio inputs or a small
  same-origin script (CSP allows no inline scripts), with a readable table fallback without JavaScript.
- **Blog**: small. `/blog` plus three posts: "Devora.js 0.3.2: what changed and what to do", "Why multi-app is a
  first-class idea", "One repo, several Vercel projects: deploying a multi-app project". Add `/rss.xml` as a
  build-time static file (API routes always answer JSON, so do not use `apiRoute`) and BlogPosting JSON-LD.
  Use the real date of each post and my GitHub name as author.
- **Performance comparison**: build and run the benchmark first, publish second (Phase 5, then Phase 6 after my approval).

## Phase 1: documentation in the devora.js repo

1. Inventory every Markdown file and package README: README.md, ROADMAP.md, the project brief, architecture-v1/v2.md,
   DEPLOYING.md, PAGES.md, AUTH.md, CHANGELOG.md, VERIFICATION.md, DEPENDENCIES.md, and the READMEs of core, cli,
   scaffold, create-devora and each adapter. Check which of CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md and
   issue/PR templates exist.
2. Update versions, install commands and feature lists to 0.3.2. Cover: cookie `secure`/`sameSite`/`domain`/`trustProxy`,
   `csrf: false`, `apiDir`, `cors`, the `head` API, error pages, actions returning data (`fail`, `redirect`),
   uploads and `maxBodyBytes`, `.env` loading, `PORT`/`HOST`, `--quiet`, `--routes`, `--host`, `--out`,
   `devora add --kind`, the terminal output, `prebuild`, adapter-node being published, and React 19 / Vite 6 ranges.
3. Remove stale claims: ROADMAP.md links in user-facing text, "React 18 only", "loaders don't get the query string",
   `nodejs20.x`, "confirmed live" for Vercel/Netlify, the `api/` folder as the default for new apps (new apps use `endpoints/`),
   the streaming contradiction between the project brief and architecture-v2.md.
4. CHANGELOG.md: add a note under 0.3.2 that adapter-node 0.2.0 and adapter-vercel/netlify 0.2.2 were published
   without build output and replaced by 0.2.1 / 0.2.3; label the older "Unreleased" headings that shipped in 0.3.1.
5. DEPLOYING.md: add a short section "Container platforms (Docker on Cloud Run, AWS App Runner/Fargate, Azure
   Container Apps, Oracle Cloud VM)": `PORT`/`HOST`, `trustProxy`, the required shared session store, HTTPS at the load
   balancer, and a warning that these were not tested on those clouds. Only mark something verified if you ran it.
6. The repo's `package.json` uses a `pnpm` field that pnpm 11 no longer reads (it caused `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`).
   Do not change the config. Document the problem and the `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` workaround in a
   contributor note, and list it as a follow-up.
7. Add any missing of CONTRIBUTING.md, SECURITY.md and a short issue template (bug report, feature request) in the
   same plain style, with the Discord invite https://discord.gg/wYFYmFxdS8. Add npm-version and Discord badges to the README.

## UI/UX rules for everything added to the site (apply in every phase)

- Reuse the site's existing design tokens, spacing, type scale and components. Do not add fonts, UI libraries or third-party hosts.
  Where a new component is needed (card, chip, tabs, bar chart, comparison table), build it once, put it in a shared file, and reuse it.
- One visual language: the same card radius, border, heading sizes and link style on every new page as on the existing ones.
- Mobile first. Nothing may scroll sideways at 375 px. Tables become stacked cards on small screens.
- Accessibility: contrast AA in light and dark, visible keyboard focus, real buttons and links, tabs with correct roles and arrow-key
  support, status shown by icon or text as well as colour, `prefers-reduced-motion` respected, images with alt text and set
  width/height (no layout shift).
- Performance of the site itself: no new render-blocking assets, screenshots as optimized WebP/AVIF with width/height,
  lazy-loaded below the fold. Run Lighthouse on home, /compare, /examples and /blog before and after; no score may drop, and
  accessibility must be at least 95. Report the numbers.
- Before each phase's commit, send me before/after screenshots (375, 768, 1440; light and dark) of every page that changed.

## Phase 2: refresh the docs site content (devorajs-docs)

1. Bump `@devorajs/core` and `@devorajs/cli` to `^0.3.2` in `apps/docs/package.json` and the root package.json, install,
   build, and run the preflight (`devora build --adapter=vercel`). The 0.3.2 shell changed (extra wrapper element,
   theme only on shell pages, footer layout). Take before/after screenshots of every existing page and fix regressions in
   the site's own CSS. Do not modify the framework.
2. Update every existing route against 0.3.2, one by one. Concrete items already found: `compare.tsx` has
   `DEVORA_VERSION = "0.3.1"`, still says "React 18 only", "loaders don't receive the query string" (now false) and
   "No catch-all routes" (re-check); `deployment.tsx`, `security.tsx`, `backend.tsx`, `backend-capabilities.tsx`,
   `cli-reference.tsx` and `api-reference.tsx` all need the 0.3.2 features listed in Phase 1, item 2.
3. New docs pages (sidebar groups stay as they are, add entries): "Pages, forms and errors" (from PAGES.md), "Upgrading to 0.3.2"
   (the behavior-change list from the CHANGELOG, each with what to do), and the tutorial "Build a multi-app project".
   Test the tutorial on a fresh scaffold from the published packages; every command must work as written.
4. Compare page (https://devorajs-docs-docs.vercel.app/compare): content AND a UI/UX redesign. Read `comparison-page-redesign.md`
   first and reuse what still fits. Content: refresh the npm download numbers (state the date and source), re-verify every "not
   supported yet" row, keep the "Scale, honestly" section, stop hard-coding the version (read it from the installed package).
   UI/UX: open the live page with Playwright at 375, 768 and 1440 and write down what is hard to read before changing anything.
   Then: a short summary block at the top ("Choose Devora.js if... / Choose something else if..."); a comparison table with a
   sticky header row and sticky first column, rows grouped by topic (rendering, backend, security, deploy, ecosystem); status
   chips with an icon and a text label ("Built in", "Partial", "Not yet", "Use a library"), never colour alone; a "last verified"
   date and version stamp; a filter to pick which frameworks to show; stacked cards instead of a table on mobile; the npm
   download table as a small bar chart with the date and source; a link to /performance once it exists. No marketing language.
   `COMPARISONS-DRAFT.md` and `comparison-page-redesign.md` are drafts of a page that now exists: move them to `drafts/` and tell me.
5. Update the docs README (version, screenshots, structure).

## Phase 3: site structure and header

1. `nav.ts`: Docs, Examples, Blog, Compare, Search, GitHub, Discord, Theme. GitHub opens
   https://github.com/hassanalsa3aka/devora.js, Discord opens https://discord.gg/wYFYmFxdS8, both with
   `rel="noopener noreferrer"`, accessible names and inline-SVG icons. If the shared header cannot render an icon link,
   use text links and report the gap as a framework request instead of patching core. The nav must wrap cleanly at 375 px.
2. Home page: a "One shared backend" section (links to Backend and Backend capabilities), the "Built with Devora.js"
   section (YallaDo, Khepra, this site: see the Showcase decision), a live-demos teaser linking to `/examples`, and links to Blog.
   Keep the page short: if it gets long, cut sections instead of shrinking them.
3. Add `/examples` and `/blog` shells, sitemap entries, OG cards and search indexing. Footer links stay (they already include
   GitHub, Discord, X, Privacy).

## Phase 4: Examples and Blog

1. Build the three examples in `devora.js/examples/`, each with a README (what it shows, how to run, how to deploy), built and
   run for real from a fresh checkout, and added to the existing CI workflow so they cannot rot. Check that examples are not
   included in any package's npm `files`.
2. `/examples` page: one card per example with a short description, the GitHub folder link and the exact run commands.
3. Write the three blog posts from the CHANGELOG, DEPLOYING.md and the architecture docs. Factual, no hype, short, with
   code that was run. Add `/rss.xml` and BlogPosting JSON-LD. Check feed validity.

## Phase 5: benchmark harness (no website change in this phase)

Create `devora.js/benchmarks/` (not published to npm) with the same three scenarios implemented natively in Devora.js,
Next.js (latest), Astro, SvelteKit and React Router 7 (framework mode): (A) a static content page, (B) a server-rendered page
with a loader returning 100 in-memory items and one interactive component, (C) a form POST with validation.
Rules for fairness: each framework uses its own documented production setup and defaults; identical HTML output and
behavior; no tuning only Devora; production builds only; pinned versions and Node version recorded.
Measure: cold and warm build time; server start time; idle memory; requests per second and p50/p99 latency
(autocannon, fixed concurrency, warm-up, at least 5 runs, report median and spread); client JavaScript transferred
(gzip and brotli, measured in a real browser with Playwright); hydration time. Record hardware, OS, Node version, date and exact
versions. Save raw JSON plus a generated Markdown report, and a README explaining how to reproduce.
Run it, show me the results, include where Devora.js loses, and STOP. Do not publish or describe the results anywhere else
until I approve.

## Phase 6 (only after I approve the results): the /performance page

Add `/performance` and a link from the Compare page and header. Top of the page: the Bun-style benchmark widget described in the
"Performance widget" decision (the same widget appears as a compact card on the home page). Below it: methodology, results tables, hardware, versions,
date, link to the raw data and the scripts, a plain list of caveats, and the scenarios where Devora.js is slower or larger.
No "fastest" language. Add it to sitemap, search and OG cards.

## Final report (per phase)

A table of items (done / already correct / could not verify / blocked), the files changed in each repo, how each was verified,
what is unverified, and the `git log --format='%h %an <%ae> %s'` of the new commits for both repos, plus the result of
`git log --format='%an%n%ae%n%B' | grep -iE 'claude|anthropic|co-authored'` in each repo (it must be empty).
Ask me before starting anything that needs a decision I have not made above.
