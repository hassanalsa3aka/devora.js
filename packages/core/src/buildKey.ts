import path from "node:path";

/**
 * Deterministic build key for a source file, relative to appRoot with its
 * extension stripped (e.g. "routes/settings", "entry-server"). Used both as
 * the rollup input name (so output files land at predictable paths, no
 * manifest needed for route resolution) and, at request time, to compute
 * the built file for a given source file. See ROADMAP.md #4.
 */
export function toBuildKey(appRoot: string, filePath: string): string {
  const rel = path.relative(appRoot, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  return noExt.split(path.sep).join("/");
}
