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
  // What each file imports (already resolved to files), read once and kept until the host says the file changed. The host
  // learns of every change from the file watcher, so nothing is re-checked per request.
  const scanned = new Map<string, string[]>();
  const importsOf = (file: string): string[] => {
    const known = scanned.get(file);
    if (known) return known;
    const resolved: string[] = [];
    try {
      for (const spec of scanImports(readFileSync(file, "utf8"))) {
        if (!spec.startsWith(".") || spec.includes("?")) continue; // ?inline, ?raw, ?url are values, not stylesheets
        const target = resolveSync(path.resolve(path.dirname(file), spec));
        if (target) resolved.push(target);
      }
    } catch {
      // unreadable: no imports
    }
    scanned.set(file, resolved);
    return resolved;
  };
  const nodeFor = (file: string, seen: Map<string, Node>): Node => {
    const known = seen.get(file);
    if (known) return known;
    const node: Node = { id: file, url: urlForFile(file, roots) ?? file, importedModules: new Set() };
    seen.set(file, node);
    if (CSS_EXT.test(file) || !/\.(tsx|ts|jsx|js|mjs)$/.test(file)) return node;
    for (const target of importsOf(file)) node.importedModules.add(nodeFor(target, seen));
    return node;
  };
  const graphs = new Map<string, Set<Node>>();
  return {
    getModulesByFile(file: string): Set<Node> | undefined {
      const known = graphs.get(file);
      if (known) return known;
      try {
        statSync(file);
      } catch {
        return undefined;
      }
      const graph = new Set([nodeFor(file, new Map())]);
      graphs.set(file, graph);
      return graph;
    },
    /**
     * A file changed. If it is one this graph has read and it still exists, only its own imports are read again; a file
     * that appeared or went away can change what any import resolves to, so everything is read again.
     */
    clear(file?: string): void {
      graphs.clear();
      let exists = true;
      if (file) {
        try {
          statSync(file);
        } catch {
          exists = false;
        }
      }
      if (file && exists && scanned.has(file)) scanned.delete(file);
      else scanned.clear();
    },
  };
}
