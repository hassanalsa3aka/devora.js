import type { Plugin } from "vite";
import { runAndClearDisposable } from "@devorajs/core";

/**
 * Real plugin-side half of `registerDisposable()` (disposeRegistry.ts) —
 * see that file's doc comment for the full reasoning. `handleHotUpdate`
 * fires on the Vite dev server itself, with the real file path Vite is
 * about to invalidate, before the next `ssrLoadModule` call re-executes it
 * — exactly the moment a registered cleanup needs to run.
 */
export function moduleDisposePlugin(): Plugin {
  return {
    name: "devora-module-dispose",
    handleHotUpdate(ctx) {
      runAndClearDisposable(ctx.file);
    },
  };
}
