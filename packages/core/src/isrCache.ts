/**
 * ISR's disk-backed cache (ROADMAP.md's render-modes item). Deliberately
 * literal files on disk, not an in-memory/opaque cache — "no hidden
 * caching/magic" (CLAUDE.md) applies to this too. The same directory
 * (dist/static/<route>) doubles as both the ssg build output and isr's
 * initial cache entry — buildAppStatic.ts writes both the same way.
 *
 * Only ever verified/verifiable under adapter-node's long-lived process —
 * a Vercel/Netlify function invocation doesn't reliably share a writable
 * persistent filesystem across invocations, so isr's staleness/regeneration
 * logic has nowhere durable to write on those targets. Flagged, not solved.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export interface CachedRoute {
  html: string;
  renderedAt: number;
}

/**
 * Real bug fixed here (Phase 4 security audit): `routePath` ultimately comes
 * from substituting a dynamic route's `getStaticParams()` values into a path
 * template (`router.ts`'s `resolveStaticRoutePath`) — realistically
 * CMS/DB-backed data, not a hardcoded literal. Nothing validated that a
 * param value couldn't itself contain `/` or `..` segments, so a single
 * tainted entry (`{ id: "../../../etc/pwned" }`) let `path.join` walk this
 * write (and `revalidatePath`'s delete, below) outside `staticOutDir`
 * entirely — an arbitrary build-time file write/delete, not just a bad
 * cache path. Same containment-check shape `prodRequestHandler.ts`'s
 * `serveAsset` already uses correctly for request-driven asset paths.
 */
function cachePaths(staticOutDir: string, routePath: string): { htmlPath: string; metaPath: string } {
  const base = path.resolve(staticOutDir);
  const dir = routePath === "/" ? base : path.resolve(base, routePath.slice(1));
  if (dir !== base && !dir.startsWith(base + path.sep)) {
    throw new Error(
      `[devora] refusing to write ISR cache for route "${routePath}" — it resolves outside "${staticOutDir}". ` +
        `Check this route's getStaticParams() for a param value containing "/" or "..".`
    );
  }
  return { htmlPath: path.join(dir, "index.html"), metaPath: path.join(dir, "index.meta.json") };
}

export async function readCachedRoute(staticOutDir: string, routePath: string): Promise<CachedRoute | undefined> {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  if (!existsSync(htmlPath)) return undefined;

  const html = await readFile(htmlPath, "utf-8");
  let renderedAt = 0;
  if (existsSync(metaPath)) {
    try {
      renderedAt = (JSON.parse(await readFile(metaPath, "utf-8")) as { renderedAt: number }).renderedAt;
    } catch {
      // Missing/corrupt metadata — treat as maximally stale rather than failing the request.
    }
  }
  return { html, renderedAt };
}

/**
 * Real bug fixed here (Phase 4 security audit): this used to `writeFile`
 * straight to `htmlPath`/`metaPath` — a plain `writeFile` truncates the
 * destination on open, so two requests racing to regenerate the same stale
 * `isr` page (both past the staleness check before either finishes
 * rendering) could interleave their writes, producing a spliced file with
 * the right final length but a torn mix of both renders' bytes. Measured
 * directly: 30 concurrent racing pairs of ~8MB writes to one cache path
 * produced 10 torn files. Writing to a unique temp file in the same
 * directory (so the later `rename()` stays on one filesystem, required for
 * atomicity) and renaming it into place fixes this — POSIX `rename()`
 * replacing an existing file is atomic, so any reader sees either the
 * complete old file or the complete new one, never a splice of both.
 */
async function writeAtomic(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, data);
  await rename(tempPath, filePath);
}

export async function writeCachedRoute(staticOutDir: string, routePath: string, html: string): Promise<void> {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  await mkdir(path.dirname(htmlPath), { recursive: true });
  await writeAtomic(htmlPath, html);
  await writeAtomic(metaPath, JSON.stringify({ renderedAt: Date.now() }));
}

export function isStale(renderedAt: number, revalidateSeconds: number): boolean {
  return Date.now() - renderedAt > revalidateSeconds * 1000;
}

/**
 * Manual revalidation trigger (architecture-v1.md §5's `revalidatePath()`).
 * Deletes the cached entry outright rather than re-rendering in place —
 * the next request's normal staleness check (finds nothing cached) does
 * the regeneration, so there's exactly one code path that ever renders an
 * isr page, not two slightly-different ones.
 */
export async function revalidatePath(staticOutDir: string, routePath: string): Promise<void> {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  await rm(htmlPath, { force: true });
  await rm(metaPath, { force: true });
}
