# Design: an experimental dev server of Devora's own (`devora dev --experimental-dev-server`)

Status: design. Opt-in only; Vite stays the default dev server and the only build. Nothing changes for an app
that does not pass the flag.

## Scope

- **In:** the development server for pages, islands, CSR routes and API routes of one app: transforms, React Fast
  Refresh, CSS and assets, island hydration, HMR, the same request pipeline (`createProdRequestHandler`-style
  rendering through core) as `devora dev`.
- **Out:** the production build (stays Vite + esbuild), SSG/ISR builds, adapters, plugins written for Vite. An app
  that needs a Vite plugin keeps using `devora dev`.

## Pieces

| Piece | How |
|---|---|
| Transforms | esbuild `transform` (TSX/JSX/TS → ESM, `jsx: "automatic"`), per file, cached by path + mtime + size. No bundling of app code. |
| Dependencies | Bare imports (`react`, `react-dom/client`, app deps) are pre-bundled once at start with esbuild into an ESM folder outside the project (`node_modules/.devora/deps`), keyed by the lockfile hash; served under `/_devora/deps/<name>.js`. A dependency that cannot be bundled is a clear start-up error naming it. |
| Fast Refresh | `react-refresh/runtime` served as a file (`/_devora/refresh.js`, never inline, so the CSP stays `default-src 'self'`); each component module gets the registration wrapper from `react-refresh/babel`-equivalent logic implemented with esbuild's output (`$RefreshReg$`/`$RefreshSig$` calls around exported components). Boundary rule: a module whose exports are all components is a refresh boundary; anything else bubbles to a full reload. |
| CSS and assets | `.css` imports become a module that adds a `<link>` (a file URL, no inline style); `?url`/static imports of images and fonts return a `/_devora/asset/<hash>/<name>` URL. `public/` is served as in production (static file handler from core, with its realpath check). |
| Islands | The islands plugin's job (find `island(() => import("./X"))`) is done by the same parser (`islandCalls.ts`) at transform time; the client URL is `/_devora/m/<project-relative path>`, never an absolute path. The streaming island cache is invalidated per module that changed (the module graph knows which islands depend on it). |
| Module graph | Import edges recorded at transform time (es-module-lexer). A change invalidates the changed module and its importers up to a refresh boundary. Server modules are re-imported with a version query; the dispose registry (`registerDisposable`) runs for every re-executed server module, as today. |
| HMR transport | One WebSocket at `/_devora/hmr`. Messages: `update` (list of module URLs + timestamps), `full-reload`, `error` (overlay text). Server → client only, plus a client `hello`. |

## Security rules (all mandatory, each with a test)

1. **Loopback only by default.** The server binds `127.0.0.1` (and `::1` if available). `--host` is refused with
   the experimental server in its first version.
2. **Host check.** Every HTTP request and the WebSocket upgrade must carry a `Host` of `localhost`, `127.0.0.1`,
   `[::1]` (any port) or a host in the app's `allowedHosts`; anything else gets 400 (DNS rebinding).
3. **WebSocket: Origin and token.** The upgrade needs `Origin` equal to the server's own origin and a per-launch
   token (32 random bytes, base64url) in the `Sec-WebSocket-Protocol` header; the token is written into the
   page's script URL, never into a cookie or a global. A missing or wrong Origin or token → 403, no upgrade.
4. **No arbitrary file serving.** There is no `/@fs/`-style route. Served URLs are: `/_devora/m/<path>` for a module
   inside the app or the project's `packages/` (allowlist of roots), `/_devora/deps/*` for pre-bundled
   dependencies, `/_devora/asset/*` for imported assets, and `public/`. Every file path is resolved with
   `realpath` and must stay inside an allowed root (symlinks followed; `..`, encoded `%2e`, backslashes, NUL
   refused before resolving). Dotfiles (`.env*`, `.git`) are never served, whatever the root.
5. **No eval of request input.** Nothing from a request (path, query, header, body, WebSocket message) is passed to
   `eval`, `Function`, `vm`, `import()` of a computed path outside the allowed roots, or a shell. Modules are
   imported by resolved file URL only.
6. **Limits.** Request headers 16 KB, request bodies `maxBodyBytes` (same as the app), WebSocket messages 64 KB,
   headers timeout 15 s, request timeout 60 s, at most 32 HMR clients.
7. **Refuses production.** Starting with `NODE_ENV=production` exits with an error; so does `devora start
   --experimental-dev-server`.
8. **Same response headers as today:** CSP (`default-src 'self'`, no inline script), nosniff, frame options, the
   SVG sandbox policy, `allowedHosts`.
9. **No editor endpoint.** Opening files in an editor from the overlay is not offered.

## Flag and wiring

`devora dev --experimental-dev-server` (also `DEVORA_EXPERIMENTAL_DEV_SERVER=1`). Code lives in its own package,
`packages/dev-server` (`@devorajs/dev-server`, private until accepted), so the CLI's default path does not import
it. Without the flag `devora dev` runs exactly the current code; the full suite runs with the flag off to prove it.

## Risks

- Fast Refresh correctness is the hard part (hooks signatures, boundaries). Falling back to a full reload is always
  allowed and is the safe default when unsure.
- Dependency pre-bundling of CommonJS packages (React 18 is CJS) needs esbuild's CJS-to-ESM interop; named exports
  must match what Vite produces, or apps break only in the experimental server.
- Maintenance: a second dev server doubles the surface the tests must cover. ACCEPTANCE.md sets the bar.
