<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# create-devora

The installer for [devora.js](https://github.com/hassanalsa3aka/devora.js) — a security-first
React framework whose headline feature is native multi-app support (one project, several
independently-deployable apps sharing a core and a backend). It currently uses Vite for the dev
server and the client build; the production server is the framework's own.

## Quickstart

```bash
npm create devora@latest
# or
yarn create devora@latest
# or
pnpm create devora@latest
```

Each form does the same thing — pick whichever matches the package manager you want the
generated project to use.

## Package managers

The commands for a generated project, for each package manager:

| Task | npm | Yarn | pnpm |
|---|---|---|---|
| Create a project | `npm create devora@latest` | `yarn create devora` (Yarn 4: `yarn dlx create-devora`) | `pnpm create devora` (or `pnpm dlx create-devora`) |
| Install | `npm install` | `yarn install` | `pnpm install` |
| Dev servers | `npm run dev` | `yarn dev` | `pnpm run dev` |
| Build | `npm run build` | `yarn build` | `pnpm run build` |
| Serve the build | `npm run start` | `yarn start` | `pnpm run start` |
| Add a package to one app | `npm install dayjs -w apps/app` | `yarn workspace @project/app-app add dayjs` | `pnpm --filter @project/app-app add dayjs` |
| Add a package to the project root | `npm install dayjs` | `yarn add -W dayjs` (Yarn 4: `yarn add dayjs`) | `pnpm add -w dayjs` |
| Run a package script | `npm run typecheck` | `yarn typecheck` | `pnpm run typecheck` |
| Run the project's CLI once | `npx devora list` | `yarn devora list` | `pnpm exec devora list` |

`@project/app-app` stands for the `name` in that app's `package.json`.

What differs, as seen when these commands were run:

- **npm 11** prints `Unknown project config "link-workspace-packages"` on every command (the project's `.npmrc`
  carries a pnpm 9/10 setting) and an `allowScripts` warning for esbuild. npm 10 prints neither. Everything works.
- **Yarn 1** warns about an unmet peer dependency (`react`); a plain `yarn add` at the root asks for `-W`.
- **Yarn 4** prints peer-dependency warnings (`YN0002`) about `react`. A new project works with Yarn 4's default
  settings, because `create-devora` writes a `.yarnrc.yml` with `nodeLinker: node-modules` when you pick Yarn
  (Plug'n'Play, Yarn 4's default, does not run the CLI). A project made by `create-devora` 0.3.x needs that one-line
  file added before installing.
- **pnpm 9 and 10**: a plain `pnpm add` at the root asks for `-w`.
- **pnpm 11 and later** (12.10 was tried) work with a new project, because `pnpm-workspace.yaml` now carries
  `linkWorkspacePackages: true` and `allowBuilds: esbuild: true`. A project made by `create-devora` 0.3.x fails to
  install on pnpm 11 and later (`ERR_PNPM_FETCH_404` for `@devorajs/backend`, then `ERR_PNPM_IGNORED_BUILDS`): use pnpm
  9 or 10, or add those two keys to its `pnpm-workspace.yaml`.

**What is covered.** CI installs this repository's workspace under npm 10, Yarn 1 and pnpm 9.9 on every push; the tests and every app build run under pnpm only. A new project from the 0.4.0 `create-devora` was installed, run in dev, built, served, given a package and a script and the one-off command, by hand, on Node 20 and Node 22 with npm 10 and 11, Yarn 1.22 and 4.18 (through corepack, default settings) and pnpm 9.15, 10.34 and 12.10: all passed. Bun and Deno were not tested, so they are not listed as supported.


## What it asks

1. **Project name** — the directory it creates.
2. **What do you need?** — `full-stack` (default), `frontend`, or `backend` (see `--scope` below).
3. **App names** — comma-separated, defaults to `marketing,dashboard,admin` as a starting preset
   (`api` for a backend-only project).
   You can list just one, or a dozen — a devora.js project can hold any number of independently
   built and deployed apps.
4. **Per-app auth** — for each app, whether it needs sessions at all: `shared` (one login across
   every app that uses it — the common case; for apps on different subdomains, set
   `shared.sessions.cookie.domain` in `devora.config.ts`, or the browser keeps a separate login per host), `isolated` (its own separate session context, e.g.
   an admin panel with a different identity provider), or `none` (no login on this app at all —
   skips generating a login/logout flow entirely, and the app never needs a session secret
   configured). Asked per app, not once for the whole project, since a marketing site and a
   dashboard in the same project often need different answers.

Non-interactive use (CI, scripting) is supported: `npm create devora@latest my-app -- --scope=fullstack --apps=a,b --auth=a:none,b:shared --pm=npm --skip-install`
(`--pm=npm|pnpm|yarn` picks the package manager; it's detected from how you ran it otherwise).

`--scope` (or the "What do you need?" prompt) picks what's generated:

- `fullstack` (default) — page apps plus one shared backend, `packages/backend`.
- `frontend` — page apps only; no `packages/backend`.
- `backend` — backend-only API apps (routes in `endpoints/`, served under `/api`; no pages or React) plus `packages/backend`.

Every project gets at most one shared backend. Backend logic only one app needs can live inside that
app — see "The shared backend pattern" in the docs.

## What you get

A real, working project: `devora.config.ts` declaring your apps, a `packages/backend` starter,
shared brand assets, and each app scaffolded with API routes in `endpoints/` (`apiDir:
"endpoints"`, served under `/api`), a `vite.config.ts` and committed `vercel.json`/`netlify.toml`.
Page apps also get routes, an `error.tsx` error page and (for `shared`/`isolated` apps) a working
login/logout flow; backend-only apps get API routes only (plus a Bearer login when they use auth). The
project depends on `@devorajs/core` and `@devorajs/cli` `^0.4.0`, has a `typecheck` script, and
runs on React 18 (19 is supported too). Dependencies are installed automatically, so once it
finishes:

```bash
cd my-app
npm run dev   # or pnpm/yarn — whichever you picked
```

...starts every app in dev mode immediately, printing each app's URL and routes. Add another app
later with `npx devora add <name>` (`--kind=api` for a backend-only API app).

Before deploying an app with login, set `shared.sessions.store` in `devora.config.ts` to a store
backed by your database (production refuses to start without one) and a `DEVORA_SESSION_SECRET`
— see the [Deploying](https://github.com/hassanalsa3aka/devora.js/blob/main/docs/guides/DEPLOYING.md) guide.

## Full documentation

This package only covers scaffolding. For everything else — the CLI, render modes, deployment to
Vercel/Netlify/a plain VPS, the security model — see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
