# Sekhem: the Devora.js engine of our own

Sekhem is the second engine of Devora.js. By default `devora dev` and `devora build` run on Vite. Sekhem replaces Vite for both
commands with code of our own on top of esbuild. It is **experimental**: it is off unless you ask for it, and this page says what it
does, how it works, what it does not do and how it was tested.

## Quick start

Turn it on in the project, or per command:

```ts
// devora.config.ts
export default defineProject({
  engine: "own", // "vite" (default) or "own" (Sekhem)
  apps: [/* ... */],
  shared: { /* ... */ },
});
```

```bash
devora dev --engine=own          # dev server
devora build --engine=own        # production build
devora start                     # serves the build; the same for both engines
npx create-devora my-app --engine=own
```

The flag wins over the file. An unknown engine name is an error: Devora.js never falls back to the other engine silently. The old
switches `--experimental-dev-server` and `DEVORA_EXPERIMENTAL_DEV_SERVER=1` mean the same as `--engine=own`.

**Requirements.** Node 22.15 or later (Sekhem uses `module.registerHooks`; older Node gets a message and exits, and the Vite engine is
not affected). Sekhem is the separate package `@devorajs/sekhem`: `npm install --save-dev @devorajs/sekhem` (or pnpm or yarn). `npx create-devora my-app --engine=own` adds it to the new project. Without it, `--engine=own` stops with a message that says what to install.

A project created for Sekhem has no `vite.config.ts` and no `vite` or `@vitejs/plugin-react` dependency in its apps.

## What Sekhem is made of

| Part | What it does | Where |
|---|---|---|
| Dev server | Serves pages and API routes with the same handlers as the Vite path, transforms browser modules, sends hot updates | `packages/dev-server/src/server.ts` |
| Server module host | Loads your server code (routes, loaders, API routes, shared modules) with in-thread Node module hooks, tracks which module imports which, and re-runs only what changed | `hooks.mjs`, `serverModules.ts` |
| Browser modules | One esbuild transform per file, React Fast Refresh, islands, CSS, assets | `clientModules.ts`, `transform.ts` |
| Dependency bundle | Bundles `node_modules` packages the browser needs once, with a cache on disk | `deps.ts`, `depsCache.ts` |
| Hot updates | A WebSocket on 127.0.0.1 with an Origin check and a per-launch token | `hmr.ts` |
| Build | esbuild bundles for the server and for the browser, with the same output layout as the Vite build | `build.ts` |
| Rules for requests | Loopback only, host check, token, file confinement | `guards.ts`, `files.ts` |

## The dev server

**Server modules.** Your routes and everything they import on the server run through Node's own module system, with synchronous hooks
registered in the same thread (`module.registerHooks`). Each module has a version. When a file changes, Sekhem bumps the version of
that module and of the modules that import it, and nothing else, so the next request runs exactly those again. A file that no
module imported before (a new file an import now resolves to) makes the app's modules run again, because an import may now resolve
differently. Dispose callbacks (`import.meta.hot`-style cleanup registered through the framework) run for the modules that run again.

**Browser modules.** The browser asks for `/_devora/m/<path>`; Sekhem transforms that one file with esbuild (TypeScript, JSX,
tsconfig paths, `import.meta.glob`, CSS modules), instruments React components for Fast Refresh, rewrites imports to served URLs and
caches the result by file size and modification time. An island's browser URL is such a module URL.

**Dependencies.** The packages the browser imports from `node_modules` are bundled once with esbuild (code splitting on, CommonJS
packages converted, Node built-ins stubbed) and served from `/_devora/deps/`. The result is cached under
`<app>/node_modules/.devora/dev-server`, keyed by the lockfile, the package versions, the linked-source fingerprint and the esbuild
version, and every cache entry is checked against a SHA-256 before it is used. A second start reads the cache.

**Compile cache.** Compiled server modules are cached on disk by a hash of the source, the path and the esbuild version, and a
background pass compiles the rest of the app after start. A source edited while the server was stopped is never served from an old
entry.

**Hot updates.** The file watcher is the operating system's recursive watcher with no debounce. A change sends a message over
`/_devora/hmr` (WebSocket protocol `devora-hmr`) before the server is invalidated; a component edit is applied with Fast Refresh, an
edit that cannot be applied that way reloads the page.

## Changes applied without a restart

Each is covered by a test (`devServerLive.integration.test.ts`) that edits a file in a running server and fetches the page again:

| Change | Result |
|---|---|
| Edit a route in `ssr`, `csr`, `ssg`, `isr` or `streaming` mode | The next request shows it |
| Add a route file, remove a route file | Served, then a 404 |
| Change a route's render mode | The next request is answered in the new mode |
| Edit an island | The module the browser loads and the server-rendered page both change |
| Edit, add or remove an API route | The next request shows it |
| Edit a module outside the app (a shared package) | The next request shows it |

Changes to `devora.config.ts`, `app.config.ts` and the `.env` files restart `devora dev` by itself and print why (they are read once
at start). This is the same for both engines (`devRestart.test.ts`).

## The production build

`devora build --engine=own` runs two esbuild builds per app and then the same steps as the Vite build (pre-rendering of `ssg` and
`isr` routes, the session manifest, adapter output for Vercel and Netlify).

**Server bundle.** Every route, API route, the error page, `entry-server` and the session store module is a named entry
(`dist/server/<key>.js`), with code splitting. Packages installed in `node_modules` stay external when the built server can load
them at run time (the app's own folders resolve them too); a linked workspace package, whose source is TypeScript, is bundled. CSS is
written to `dist/server/assets/` under content-hashed names and the list of stylesheets each route needs (including those of its
islands) goes to the route CSS manifest. Images and fonts imported from code are copied to `assets/` and imported as their public URL.
`import.meta.env.PROD`, `DEV`, `MODE`, `SSR` and `BASE_URL` are replaced.

**Islands.** `island(() => import("./X"))` calls get a placeholder in the server bundle; after the browser bundle is built the
placeholder is replaced by the island's hashed URL. A call in any other shape fails the build with a message.

**Browser bundle.** The island client, the client-rendered routes and each island are entries, minified, with hashed names under
`dist/client/assets/`; the public folder is copied to `dist/client/`. Every entry keeps its default export.

**Same output.** Because the layout is the same, `devora start` serves a Sekhem build and a Vite build with the same code. On the
repository's four example apps every route answered with the same status, headers and normalised page under both builds
(`pnpm run compare:build-parity`).

## What is supported, and what is not

| | Sekhem |
|---|---|
| React 18 and 19, TypeScript, JSX | yes |
| Fast Refresh, islands, all five render modes | yes |
| tsconfig `paths` and `baseUrl` | yes |
| CSS, CSS modules, images and fonts as URLs, JSON | yes |
| `import.meta.glob` with literal patterns | yes (lazy and eager, the `import` option) |
| Vite plugins, `resolve.alias`, `define`, `server.proxy` from `vite.config.ts` | no: Sekhem does not read `vite.config.ts`, except a literal `publicDir`; it prints a warning for settings it ignores |
| PostCSS, Tailwind, Sass, Less | no (a plugin design is written down, not built) |
| `VITE_` variables in browser code | no |
| Source maps in the production build | no |
| Small assets inlined as data URIs | no (files are always served) |
| `--host`, HTTPS in dev | no: loopback only |
| Windows and Linux | not tested |

## Security rules

- The dev server binds 127.0.0.1 or ::1 only and refuses to start with `NODE_ENV=production`.
- Every request's Host is checked against localhost, the loopback addresses and the app's `allowedHosts`, so a name that only resolves to
  127.0.0.1 (DNS rebinding) is refused.
- The WebSocket checks the Origin and a per-launch token that the page receives.
- Files are served only from the listed roots, after resolving symbolic links, and never dotfiles. Nothing from a request reaches
  esbuild except a path that passed those checks.
- Framework code does not use `eval` or `new Function`.
- The caches check a hash before use and never follow links. Someone who can write the cache folder with a self-consistent entry has the
  same power as someone who can edit your sources or `node_modules`.
- Checked so far: a fuzzer sent about 99,000 request paths and 35,000 damaged cache entries without a problem; a comparison script runs
  the same attacks against both engines (path escape, host and Origin checks, WebSocket token, request limits, cache attacks). Request-level attacks against the built output run with
  `pnpm run compare:built-security` (about 75 checks, for a Vite build and a Sekhem build). Not done: a review by someone outside the project. There has been no third-party audit.

## How it was tested

| Check | Command |
|---|---|
| Unit and integration tests | `pnpm run test`; the Sekhem tests alone: `DEVORA_TEST_DEV_SERVER=experimental pnpm exec vitest run packages/dev-server` |
| Same pages as the Vite build | `pnpm run compare:build-parity` |
| Same pages in dev | `pnpm run compare:dev-parity` |
| Attacks against both dev servers | `pnpm run compare:dev-security`, `pnpm run fuzz:dev-server` |
| Runs without Vite | `pnpm run check:no-vite` (loads nothing from Vite and passes dev, build and start) |
| A real browser | `pnpm run check:dev-browser` |
| Measurements | `pnpm run measure:build`, `pnpm run measure:dev-perf`, `node benchmarks/run-backend.mjs` |

The Node lines 20, 22, 24 and 26 were checked; Sekhem refuses Node older than 22.15 (tested).

## Troubleshooting

- **"needs Node 22.15 or later"**: use a newer Node, or `--engine=vite`.
- **A warning that `vite.config.ts` has settings Sekhem does not read**: plugins, aliases, `define` and proxy settings are ignored. Keep
  using the Vite engine for an app that needs them.
- **A stale dependency bundle**: delete `<app>/node_modules/.devora/dev-server` and start again.
- **Timing marks**: `DEVORA_DEV_TRACE=1 devora dev --engine=own` prints where start-up and each change spends its time.
- **A change that did not apply**: restart the dev server and report it with the file that changed.

## Where Sekhem is behind

Vite has plugins, a large ecosystem and years of use; Sekhem has none of that. Open items: a plugin API
(the design is in the repository's notes: no Vite plugin API, a small Devora one later), PostCSS and Sass, source maps in the build,
`VITE_` variables, and Windows and Linux tests.

For numbers (build time, memory, dev server, requests) see the [Performance page](https://devorajs-docs-docs.vercel.app/performance).
