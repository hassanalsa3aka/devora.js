import type { Plugin } from "vite";
import { runAndClearDisposable, clearStreamingModuleCache } from "@devorajs/core";

/**
 * Real plugin-side half of `registerDisposable()` (disposeRegistry.ts) —
 * see that file's doc comment for the full reasoning. `handleHotUpdate`
 * fires on the Vite dev server itself, with the real file Vite is about to
 * invalidate, before the next `ssrLoadModule` call re-executes it —
 * exactly the moment a registered cleanup needs to run.
 *
 * Real, previously-undiscovered gap closed here: only `ctx.file` (the
 * literal file that was saved) used to be disposed. The crash this exists
 * to prevent (ROADMAP.md #6 / DATABASE.md) happens whenever the module
 * *holding the connection* re-executes — which happens not only when that
 * exact file is edited, but whenever anything it imports changes too,
 * since Vite's own HMR propagation invalidates the whole importer chain
 * (`ctx.modules`, not just `ctx.file`). Editing a shared `env.ts` that
 * `db/index.ts` imports re-executes `db/index.ts` exactly the same way
 * editing `db/index.ts` directly does — this now disposes every module in
 * `ctx.modules`, not just the one file that was actually saved.
 *
 * Also clears `islandComponent.tsx`'s streaming-mode module cache on every
 * edit — an unrelated mechanism, but the same dev-server lifecycle event is
 * exactly what it needs too (see `clearStreamingModuleCache`'s own doc
 * comment for the real staleness bug this fixes), and this is the one place
 * that event is already wired into every dev server.
 */
export function moduleDisposePlugin(): Plugin {
  return {
    name: "devora-module-dispose",
    handleHotUpdate(ctx) {
      const files = new Set([ctx.file, ...ctx.modules.map((m) => m.file).filter((f): f is string => f !== null)]);
      for (const file of files) {
        runAndClearDisposable(file);
      }
      clearStreamingModuleCache();
    },
  };
}
