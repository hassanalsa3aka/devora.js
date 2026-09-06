import fs from "node:fs";
import path from "node:path";
import { ISLAND_CALL_RE } from "@devora/core";

/**
 * Finds every `island(() => import("specifier"))` call across the given
 * source files and resolves each specifier to an absolute file path — a
 * plain filesystem regex scan (same pattern `islandsPlugin.ts` uses),
 * deliberately not routed through Vite's resolver, so this can run before
 * any build starts (ROADMAP.md #4's production island hydration).
 *
 * Reads raw, untransformed source (no TS/JSX stripping) — this is exactly
 * why `ISLAND_CALL_RE` has to tolerate a generic type argument
 * (`island<Props>(...)`) itself, rather than relying on some other plugin
 * having stripped it first the way the dev/build Vite plugins can.
 */
const RESOLVE_EXTENSIONS = ["", ".tsx", ".ts", ".jsx", ".js"];

export function discoverIslandFiles(sourceFiles: string[]): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles) {
    const code = fs.readFileSync(file, "utf-8");
    for (const match of code.matchAll(ISLAND_CALL_RE)) {
      const resolved = resolveSpecifier(path.dirname(file), match[2]);
      if (resolved) found.add(resolved);
    }
  }
  return [...found];
}

function resolveSpecifier(fromDir: string, specifier: string): string | null {
  const base = path.resolve(fromDir, specifier);
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
