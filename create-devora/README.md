# create-devora

The installer for [devora.js](https://github.com/hassanalsa3aka/devora.js) — a Vite-based,
security-first web framework whose headline feature is native multi-app support (one project,
several independently-deployable apps sharing a core and a backend).

## Quickstart

```bash
npx create-devora@latest
# or
yarn create devora@latest
# or
pnpm create devora@latest
```

Each form does the same thing — pick whichever matches the package manager you want the
generated project to use.

## What it asks

1. **Project name** — the directory it creates.
2. **App names** — comma-separated, defaults to `marketing,dashboard,admin` as a starting preset.
   You can list just one, or a dozen — a devora.js project can hold any number of independently
   built and deployed apps.
3. **Per-app auth** — for each app, whether it needs sessions at all: `shared` (one login across
   every app that uses it — the common case), `isolated` (its own separate session context, e.g.
   an admin panel with a different identity provider), or `none` (no login on this app at all —
   skips generating a login/logout flow entirely, and the app never needs a session secret
   configured). Asked per app, not once for the whole project, since a marketing site and a
   dashboard in the same project often need different answers.

Non-interactive use (CI, scripting) is supported: `create-devora my-app --apps=a,b --auth=a:none,b:shared --skip-install`.

## What you get

A real, working project: `devora.config.ts` declaring your apps, a `packages/backend` starter,
shared brand assets, and each app scaffolded with routes, a `vite.config.ts`, and (for
`shared`/`isolated` apps) a working login/logout flow. Dependencies are installed automatically,
so once it finishes:

```bash
cd my-app
npm run dev   # or pnpm/yarn — whichever you picked
```

...starts every app in dev mode immediately.

## Full documentation

This package only covers scaffolding. For everything else — the CLI, render modes, deployment to
Vercel/Netlify/a plain VPS, the security model — see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
