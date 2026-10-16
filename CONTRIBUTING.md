# Contributing to Devora.js

Devora.js is early (pre-1.0) and built by one person so far — feedback, bug reports, and small
fixes are genuinely welcome. Bigger features are worth opening an issue to discuss first, since
the framework's scope is deliberately kept tight (see docs/design/architecture-v1.md §11 for what's
explicitly out of scope). Questions and early ideas are also welcome on
[Discord](https://discord.gg/wYFYmFxdS8).

## Running it locally

```bash
git clone https://github.com/hassanalsa3aka/devora.js.git
cd devora.js
pnpm install
pnpm exec devora dev --app=dashboard
pnpm run test
```

npm and Yarn also work — see `docs/history/VERIFICATION.md` for what's actually tested under each. Node
`>=20` required.

### pnpm versions

The repo is developed and tested with **pnpm 9** (CI installs `pnpm@9.9.0`; locally,
`npx pnpm@9.9.0 install` works without changing your global pnpm).

pnpm 11 no longer reads the `"pnpm"` field in the root
`package.json`, where this repo keeps its `esbuild` override. pnpm then warns that the field is
ignored and refuses to run scripts:

```
[ERR_PNPM_VERIFY_DEPS_BEFORE_RUN] Your node_modules are out of sync with your lockfile, and
installing would drop "pnpm.overrides" from the lockfile ...
```

Until the override moves (follow-up below), either use pnpm 9, or skip that check for a single
command:

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm run test
```

Don't run `pnpm install` with pnpm 11 and commit the result: it rewrites the lockfile without the
override.

Follow-up (not done yet): move `overrides` out of the `"pnpm"` field into `pnpm-workspace.yaml`,
where pnpm 11's warning points, and check that pnpm 9 still applies it.

## Filing a useful issue

- Check `README.md`'s "Current limitations" first — `ssg`/`isr` for dynamic
  routes without `getStaticParams()`, several `Set-Cookie` headers from one API response, and
  `isr` regeneration on Vercel/Netlify's serverless filesystem are known gaps, not bugs.
- Include: the Devora.js versions (`npx devora --version`, and `@devorajs/core` from your
  lockfile), which app/render mode you were using, the exact command, and what you expected vs.
  what happened. A minimal repro (even just `npm create devora@latest` plus one added file) makes a
  real fix much quicker.
- Security problems: don't open a public issue — see [SECURITY.md](SECURITY.md).

## What's welcome right now

- Bug reports against anything in `README.md`'s "Key features" list.
- Tests — see `docs/history/VERIFICATION.md` for exactly what's uncovered today.
- Small, focused fixes with a clear before/after.

## What to discuss first (open an issue before a PR)

- Anything touching `packages/core`'s public API shape.
- New render modes, new adapters, or anything in docs/design/architecture-v1.md §11's "not building yet"
  list.

## Versioning

Pre-1.0 (`0.x` across every package). Breaking changes can happen between minor versions, and
behavior changes can land in a patch release while the API settles — the CHANGELOG lists them
first in every release ("Behavior changes"). Check `CHANGELOG.md` before upgrading, and pin an
exact version if you need stability.

## Releasing (maintainers)

The packages' `exports` point at `src/*.ts` for development inside this repo; the published
versions must point at `dist/`. Publish one package at a time:

1. Bump the version, update `CHANGELOG.md`, and publish `@devorajs/core` before the packages
   that depend on it (the adapters, then `@devorajs/cli`, then `create-devora`).
2. **Build it first.** Neither publish script builds anything: `pnpm --filter <package> build`
   (`tsc` for core and the adapters, `node build.mjs` for the CLI and `create-devora`). Skipping
   this is how adapter-node 0.2.0 and adapter-vercel/netlify 0.2.2 went out without `dist/`.
3. Check it: `node scripts/checkPublishable.mjs <package-dir>...` stops when `dist/` is missing or
   empty or an `exports`/`main`/`types`/`bin` target does not exist; `pnpm pack` in the package
   folder must list `dist/` files. (`publish-package.mjs` and `preparePublish.mjs` run the same
   check, plus one against `npm pack --dry-run`, before they publish.)
4. Publish with `pnpm publish --access public --no-git-checks` from the package folder: pnpm
   applies `publishConfig` (`exports`/`main`/`types` → `dist/`); plain `npm publish` ignores it.
   The CLI's `prepare` script must not reach consumers: `node scripts/preparePublish.mjs
   <package-dir> -- --access public` is the npm-based alternative that swaps those fields and
   drops it, then restores `package.json`.
5. Install the published version into a fresh `npm create devora@latest` project and run `dev`,
   `build` and `start` before announcing it.

## Documenting changes

Every change that a user could notice comes with its documentation, in the same pull request:

- [ ] A line in `CHANGELOG.md` under the package it changed. A behavior change goes in the
      "Behavior changes" list first, with what existing apps must do.
- [ ] The page that describes it, if behavior or a setting changed: `docs/guides/` for how-to
      material, `docs/design/` for scope and architecture, and the docs site (`devorajs-docs`) for
      anything public.
- [ ] A test that fails without the change. A claim that could not be tested says so in
      `docs/history/VERIFICATION.md`.
- [ ] `node scripts/checkMarkdownLinks.mjs` reports no broken links.

### Tracking changes

Every change that is user-visible, or that closes or opens a finding, updates three things in the same commit:

1. **CHANGELOG.md**: one line under "Unreleased" (or the release heading), naming the behavior, not the file. <!-- version-ok -->
2. **ROADMAP.md**: the status of every item the change touches (Now, Next, Later, the status board, the work-item table).
3. **The findings table in ROADMAP.md**: a fixed finding gets its release and the file, test or CHANGELOG line that proves it; every new finding from a tester, audit or review gets a new row, with status Open or Unconfirmed, before anything is fixed. Never delete a row; change its status.

A claim of "fixed" needs evidence. If it cannot be checked, the status is Unconfirmed, not Fixed. ROADMAP.md is the single place that says what is open; other documents summarize and link to it.
