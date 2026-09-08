import type { Plugin } from "vite";
import { ISLAND_CALL_RE } from "@devorajs/core";

/**
 * Resolves `island(() => import("./Chart"))` calls into
 * `island(() => import("./Chart"), "/@fs/<absolute-resolved-path>")` so the
 * client hydration bootstrap (island-client.tsx) knows what URL to
 * dynamically `import()` in the browser. Vite serves any file under
 * `/@fs/<absolute path>` regardless of project root — a real, documented
 * Vite dev-server feature, not something this plugin invents.
 *
 * Deliberately a regex scan, not a full AST transform — matches only the
 * literal call shape `island(() => import("specifier"))`, optionally with a
 * TS generic (`island<Props>(...)`); no dynamic or computed specifiers, no
 * other wrapping. See ROADMAP.md #3.
 */
export function islandsPlugin(): Plugin {
  return {
    name: "framework:islands",
    async transform(code, id) {
      // "island" not "island(" — the generic form (island<Props>(...)) has
      // no literal "island(" substring; this fast-path check missed it
      // until caught while wiring production hydration (ROADMAP.md #4).
      if (id.includes("node_modules") || !/\.(tsx|ts)$/.test(id) || !code.includes("island")) {
        return null;
      }

      const matches = [...code.matchAll(ISLAND_CALL_RE)];
      if (matches.length === 0) return null;

      let result = code;
      for (const match of matches) {
        const [original, , specifier] = match;
        const resolved = await this.resolve(specifier, id);
        if (!resolved) continue; // let the app's own import() error surface normally
        const clientUrl = `/@fs${resolved.id}`;
        const replaced = original.slice(0, -1) + `, ${JSON.stringify(clientUrl)})`;
        result = result.replace(original, replaced);
      }
      return { code: result, map: null };
    },
  };
}
