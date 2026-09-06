import type { Plugin } from "vite";
import { ISLAND_CALL_RE } from "@devora/core";

/**
 * Production counterpart to islandsPlugin.ts (ROADMAP.md #4). Same
 * `island(() => import("specifier"))` regex scan, but instead of a dev-only
 * `/@fs/<path>` URL, injects the real hashed client asset URL from
 * buildAppClient.ts's manifest lookup — the second argument becomes
 * `undefined` (via JSON.stringify on a Map miss returning undefined →
 * omitted) if that specifier has no client build (shouldn't happen, since
 * this only runs with the same island set buildAppClient discovered, but
 * fails soft rather than crashing the SSR build if it ever does).
 */
export function islandsBuildPlugin(islandUrls: Map<string, string>): Plugin {
  return {
    name: "framework:islands-build",
    async transform(code, id) {
      // "island" not "island(" — see islandsPlugin.ts's identical fix.
      if (id.includes("node_modules") || !/\.(tsx|ts)$/.test(id) || !code.includes("island")) {
        return null;
      }

      const matches = [...code.matchAll(ISLAND_CALL_RE)];
      if (matches.length === 0) return null;

      let result = code;
      for (const match of matches) {
        const [original, , specifier] = match;
        const resolved = await this.resolve(specifier, id);
        if (!resolved) continue;
        const url = islandUrls.get(resolved.id);
        if (!url) continue;
        const replaced = original.slice(0, -1) + `, ${JSON.stringify(url)})`;
        result = result.replace(original, replaced);
      }
      return { code: result, map: null };
    },
  };
}
