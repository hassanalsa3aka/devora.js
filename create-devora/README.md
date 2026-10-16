<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# create-devora

The installer for [devora.js](https://github.com/hassanalsa3aka/devora.js) — a Vite-based,
security-first web framework whose headline feature is native multi-app support (one project,
several independently-deployable apps sharing a core and a backend).

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
project depends on `@devorajs/core` and `@devorajs/cli` `^0.3.5`, has a `typecheck` script, and
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
