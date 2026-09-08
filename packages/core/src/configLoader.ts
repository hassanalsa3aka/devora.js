/**
 * CLI-only re-export, deliberately separate from the main `@devorajs/core`
 * entry (ROADMAP.md #4). loadProjectConfig.ts/loadAppConfig.ts need `jiti`
 * to load devora.config.ts/app.config.ts at CLI-time — nothing an SSR
 * route or entry-server.tsx ever calls needs either function.
 *
 * Real, measured finding, not a style choice: before this split, any SSR
 * build that imported *anything* from `@devorajs/core` (even just
 * `renderHtmlDocument`) transitively pulled `jiti` into the bundle via the
 * old single-barrel `export *` — Rollup's tree-shaking couldn't prove
 * `jiti`'s side-effecting internals were safe to drop even though nothing
 * used them. Cost: entry-server.js went from ~260KB down to ~5KB once this
 * split landed — verified by building both ways and measuring, not assumed
 * from the theory. This is the actual "give core a real build step" fix; a
 * separate `pnpm --filter @devorajs/core build` (real `tsc`, see that
 * package's `package.json`) exists too, for a different, smaller reason —
 * see ROADMAP.md #4.
 */
export * from "./loadProjectConfig.js";
export * from "./loadAppConfig.js";
