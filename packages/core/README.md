<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# @devorajs/core

Framework internals for [devora.js](https://github.com/hassanalsa3aka/devora.js) — the SSR/
streaming request handler, session/CSRF handling, security headers, islands (partial hydration),
backend modules, generic API routes, middleware, and config loading that every devora.js app runs
on.

## You probably don't need to install this directly

This package is a dependency of apps scaffolded by `create-devora` or `devora new`/`add` — it's
already wired in for you. There's no standalone API meant to be used outside that context, so
installing it into an unrelated project won't do much on its own.

## What's in here

- **SSR & streaming rendering** — matches a route, runs its `loader`/`action`, renders it to HTML;
  `renderMode: "streaming"` sends the shell immediately and patches in each `<Island>`'s real
  content as its import resolves, via React's own Suspense contract.
- **Sessions & CSRF** — signed session cookies, opt-in per app (`auth: "shared" | "isolated" |
  "none"` in `devora.config.ts`), double-submit CSRF tokens. Cross-app isolation is
  cryptographically real — the cookie name is bound into the signature, so an `"isolated"` app
  stays isolated even if it shares a secret with the project's shared app.
- **Security headers** — CSP, HSTS, X-Frame-Options on by default, overridable per app.
- **Backend modules** — `defineModule()` organizes shared backend logic into scoped, composable
  units with no DI container, ever.
- **Generic API routes** — `apiRoute()` handlers under `apps/<name>/api/**`, matched by the same
  file-based router as page routes. An optional `methods` export rejects any undeclared HTTP
  method with a real `405` before the handler runs.
- **Middleware** — native `withMiddleware()` composition, plus optional `fromExpressMiddleware()`/
  `fromFastifyPlugin()` adapters for the wider npm ecosystem.
- **Islands** — partial hydration for client-only components (`island(() => import(...))`) without
  leaving the React ecosystem.
- **Config loading** (`@devorajs/core/config-loader`) — reads `devora.config.ts`/`app.config.ts`.

## Hardening (v2)

Request bodies are capped by default (`readBodyWithLimit`), a streaming response times out rather
than holding a connection open indefinitely (`DEFAULT_STREAM_TIMEOUT_MS`), and every one of these
was verified against a real reproduction, not assumed — see the main repo's
[Security model](https://github.com/hassanalsa3aka/devora.js/blob/main/README.md) docs for the
full account.

## Full documentation

For how these pieces fit together, the CLI, and deployment, see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
