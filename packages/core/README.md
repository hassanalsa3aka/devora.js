# @devorajs/core

Framework internals for [devora.js](https://github.com/hassanalsa3aka/devora.js) — the SSR
request handler, session/CSRF handling, security headers, islands (partial hydration), and
config loading that every devora.js app runs on.

## You probably don't need to install this directly

This package is a dependency of apps scaffolded by `create-devora` or `devora new`/`add` — it's
already wired in for you. There's no standalone API meant to be used outside that context, so
installing it into an unrelated project won't do much on its own.

## What's in here

- **SSR rendering** — matches a route, runs its `loader`/`action`, renders it to HTML.
- **Sessions & CSRF** — signed session cookies, opt-in per app (`auth: "shared" | "isolated" |
  "none"` in `devora.config.ts`), double-submit CSRF tokens.
- **Security headers** — CSP, HSTS, X-Frame-Options on by default, overridable per app.
- **Islands** — partial hydration for client-only components (`island(() => import(...))`) without
  leaving the React ecosystem.
- **Config loading** (`@devorajs/core/config-loader`) — reads `devora.config.ts`/`app.config.ts`.

## Full documentation

For how these pieces fit together, the CLI, and deployment, see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
