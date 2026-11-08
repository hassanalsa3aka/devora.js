/**
 * The page handler needs to know which stylesheets a route (and what it imports) pulls in, so it can put `<link>` tags in
 * the server-rendered HTML. This reads import lines from the source files (no transform, no parsing) and exposes the
 * result the way a module graph does: nodes with an id, a URL and the modules they import.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { CSS_EXT, scanImports, urlForFile } from "./core.mjs";
import type { UrlRoot } from "./core.mjs";

const EXTS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

function resolveSync(abs: string): string | undefined {
  const isFile = (p: string) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  };
  if (isFile(abs)) return abs;
  const m = /\.(m?js|jsx)$/.exec(abs);
  if (m) for (const ext of [".ts", ".tsx"]) if (isFile(abs.slice(0, -m[0].length) + ext)) return abs.slice(0, -m[0].length) + ext;
  for (const ext of EXTS) if (isFile(abs + ext)) return abs + ext;
  for (const ext of EXTS) if (isFile(path.join(abs, "index" + ext))) return path.join(abs, "index" + ext);
  return undefined;
}

interface Node {
  id: string;
  url: string;
  importedModules: Set<Node>;
}

export function createCssGraph(roots: UrlRoot[]) {
  const nodeFor = (file: string, seen: Map<string, Node>): Node => {
    const known = seen.get(file);
    if (known) return known;
    const node: Node = { id: file, url: urlForFile(file, roots) ?? file, importedModules: new Set() };
    seen.set(file, node);
    if (CSS_EXT.test(file) || !/\.(tsx|ts|jsx|js|mjs)$/.test(file)) return node;
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      return node;
    }
    for (const spec of scanImports(source)) {
      if (!spec.startsWith(".")) continue;
      const clean = spec.split("?")[0]!;
      if (spec.includes("?")) continue; // ?inline, ?raw, ?url are values, not stylesheets
      const target = resolveSync(path.resolve(path.dirname(file), clean));
      if (target) node.importedModules.add(nodeFor(target, seen));
    }
    return node;
  };
  return {
    getModulesByFile(file: string): Set<Node> | undefined {
      try {
        statSync(file);
      } catch {
        return undefined;
      }
      // Imports of imports can change without this file changing, so the graph is read per request (small, and dev only).
      return new Set([nodeFor(file, new Map())]);
    },
  };
}
