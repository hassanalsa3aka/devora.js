import { createHash } from "node:crypto";
import type { Plugin } from "vite";
import { findIslandCalls, insertIslandUrls, originalLocation, UNSUPPORTED_ISLAND_CALL_MESSAGE } from "./islandCalls.js";

/** Matches a placeholder this plugin wrote, in built output. */
export const ISLAND_PLACEHOLDER_RE = /__DEVORA_ISLAND_[0-9a-f]{16}__/g;

/**
 * Production counterpart to islandsPlugin.ts, run inside the SSR build. The
 * SSR build already follows every import from every route, so this is
 * where islands are discovered — including one declared in a shared
 * component (round 3: discovery used to scan route files only, and such an
 * island silently never hydrated). Each `island(() => import("./X"))` gets
 * a placeholder second argument, recorded in `collected` (placeholder →
 * absolute file). buildAppServer.ts then runs the client build for exactly
 * those files and swaps each placeholder for its real hashed URL.
 *
 * A call in a shape the build can't wire up, or a specifier that doesn't
 * resolve, fails the build with its file and position.
 */
export function islandsBuildPlugin(collected: Map<string, string>): Plugin {
  return {
    name: "framework:islands-build",
    async transform(code, id) {
      // "island" not "island(" — see islandsPlugin.ts's identical fix.
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
        if (!resolved || resolved.external) {
          this.error(`[devora] island() import "${call.specifier}" doesn't resolve to a file in this app`, call.start);
        }
        const file = resolved.id.split("?")[0]!;
        const placeholder = `__DEVORA_ISLAND_${createHash("sha256").update(file).digest("hex").slice(0, 16)}__`;
        collected.set(placeholder, file);
        edits.push({ insertAt: call.insertAt!, url: placeholder });
      }
      if (edits.length === 0) return null;
      return { code: insertIslandUrls(code, edits), map: null };
    },
  };
}
