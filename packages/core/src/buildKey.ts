import path from "node:path";

/**
 * Deterministic build key for a source file, relative to appRoot with its
 * extension stripped (e.g. "routes/settings", "entry-server"). Used both as
 * the rollup input name (so output files land at predictable paths, no
 * manifest needed for route resolution) and, at request time, to compute
 * the built file for a given source file. See ROADMAP.md #4.
 *
 * A dynamic route's file name (`routes/users/[id].tsx`) contains `[`/`]` —
 * Rollup silently sanitizes those out of a chunk's actual output filename
 * (confirmed directly: it produced `_id_.js`, not `[id].js`), which broke
 * the "build key doubles as the output path, no manifest needed" contract
 * this function exists for — a real bug found wiring up dynamic routes,
 * not anticipated in advance. Fixed by sanitizing here too, the one place
 * both the build-time Rollup input name and the request-time lookup key
 * are computed, so they can't drift apart the way they briefly did.
 */
export function toBuildKey(appRoot: string, filePath: string): string {
  const rel = path.relative(appRoot, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  return noExt
    .split(path.sep)
    .join("/")
    .replace(/[[\]]/g, "_");
}
