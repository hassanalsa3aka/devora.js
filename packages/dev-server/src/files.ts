/**
 * What the experimental dev server may read from disk. There is no "/@fs/<any path>" route: a URL maps to a file
 * only inside a fixed list of roots (the app folder, the project's packages/ folder, public/), the path is checked
 * before and after resolving symlinks, and dotfiles and dot folders (.env, .git) are never served.
 */
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export interface ServedRoot {
  /** URL prefix, e.g. "/_devora/m/app/". Must start and end with "/". */
  prefix: string;
  /** Absolute folder on disk. */
  dir: string;
}

export type ResolveResult = { file: string } | { refused: "outside" | "dotfile" | "malformed" | "missing" };

function isInside(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
}

/** Maps a URL pathname to a real file inside one of `roots`, or says why not. */
export async function resolveServedFile(pathname: string, roots: readonly ServedRoot[]): Promise<ResolveResult> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { refused: "malformed" };
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return { refused: "malformed" };
  const root = roots.find((r) => decoded.startsWith(r.prefix));
  if (!root) return { refused: "outside" };
  const rel = decoded.slice(root.prefix.length);
  const segments = rel.split("/");
  if (segments.some((s) => s === ".." || s === ".")) return { refused: "outside" };
  if (segments.some((s) => s.startsWith("."))) return { refused: "dotfile" };
  const rootDir = path.resolve(root.dir);
  const candidate = path.resolve(rootDir, rel);
  if (!isInside(candidate, rootDir)) return { refused: "outside" };
  let real: string;
  let realRoot: string;
  try {
    [real, realRoot] = await Promise.all([realpath(candidate), realpath(rootDir)]);
    if (!(await stat(real)).isFile()) return { refused: "missing" };
  } catch {
    return { refused: "missing" };
  }
  if (!isInside(real, realRoot)) return { refused: "outside" };
  if (path.relative(realRoot, real).split(path.sep).some((s) => s.startsWith("."))) return { refused: "dotfile" };
  return { file: real };
}
