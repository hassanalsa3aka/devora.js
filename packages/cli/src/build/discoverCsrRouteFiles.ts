import fs from "node:fs";

/**
 * Finds every route file declaring `renderMode = "csr"` — a plain
 * filesystem regex scan of raw source (same pattern discoverIslandFiles.ts
 * uses for island() calls), so this can run before any build starts.
 * Regex, not a full AST transform — a route either has this literal
 * assignment or it doesn't; no dynamic/computed renderMode is supported.
 */
const CSR_RENDER_MODE_RE = /renderMode\s*=\s*["']csr["']/;

export function discoverCsrRouteFiles(sourceFiles: string[]): string[] {
  return sourceFiles.filter((file) => CSR_RENDER_MODE_RE.test(fs.readFileSync(file, "utf-8")));
}
