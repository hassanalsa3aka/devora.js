# packages/core dependency justifications

Every dependency added to `packages/core` must be listed here with a one-line reason (see architecture doc §7).

- **jiti** — lets the CLI load `devora.config.ts` and `app.config.ts` (TypeScript) at runtime in Node without a separate build step; no dynamic `eval`/`Function()` usage, it transpiles-then-requires from disk only.
- **react** (peer dependency, `^18.3.0 || ^19.0.0`) — `islandComponent.tsx` and `branding.tsx` are real components used directly in route JSX, not just types, so core needs React at runtime. It's a peer dependency so core always uses the app's own React install (one React instance; a second copy breaks hooks and context).
- **cors** (devDependency only, not a runtime dependency of `@devorajs/core`) — `middleware.test.ts` runs the real published `cors` package through `fromExpressMiddleware()` (architecture-v2.md §3.3) to prove that adapter works against an actual Express-ecosystem middleware, not just a hand-written fake shaped to fit. Never imported by any file under `dist/` or shipped to a consumer of this package.
