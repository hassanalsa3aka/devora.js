import type { Plugin } from "vite";
import { findIslandCalls, insertIslandUrls, originalLocation, UNSUPPORTED_ISLAND_CALL_MESSAGE } from "./build/islandCalls.js";

/**
 * Resolves `island(() => import("./Chart"))` calls into
 * `island(() => import("./Chart"), "/@fs/<absolute-resolved-path>")` so the
 * client hydration bootstrap (island-client.tsx) knows what URL to
 * dynamically `import()` in the browser. Vite serves any file under
 * `/@fs/<absolute path>` regardless of project root — a real, documented
 * Vite dev-server feature, not something this plugin invents.
 *
 * Calls are found with the parser (islandCalls.ts), in any module — the
 * same rule the production build applies, so an island that works in dev
 * works after `devora build`, and an unsupported call shape is an error in
 * both instead of an island that silently never hydrates.
 */
export function islandsPlugin(): Plugin {
  return {
    name: "framework:islands",
    async transform(code, id) {
      // "island" not "island(" — the generic form (island<Props>(...)) has
      // no literal "island(" substring; this fast-path check missed it
      // until caught while wiring production hydration (ROADMAP.md #4).
      if (id.includes("node_modules") || id.startsWith("\0") || !/\.(tsx|ts|jsx|js|mjs)$/.test(id) || !code.includes("island")) {
        return null;
      }
      const { supported, unsupported } = findIslandCalls(this.parse(code) as never);
      if (unsupported.length > 0) {
        // Point at the line the developer wrote, not esbuild's output.
        const loc = originalLocation(code, unsupported[0]!.start, this.getCombinedSourcemap());
        if (loc) this.error({ message: UNSUPPORTED_ISLAND_CALL_MESSAGE, id, loc: { file: id, ...loc } });
        this.error(UNSUPPORTED_ISLAND_CALL_MESSAGE, unsupported[0]!.start);
      }

      const edits: { insertAt: number; url: string }[] = [];
      for (const call of supported) {
        if (call.alreadyResolved) continue;
        const resolved = await this.resolve(call.specifier!, id);
        if (!resolved) continue; // let the app's own import() error surface normally
        edits.push({ insertAt: call.insertAt!, url: `/@fs${resolved.id.split("?")[0]}` });
      }
      if (edits.length === 0) return null;
      return { code: insertIslandUrls(code, edits), map: null };
    },
  };
}
