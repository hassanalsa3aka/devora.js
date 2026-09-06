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
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

export interface CachedRoute {
  html: string;
  renderedAt: number;
}

function cachePaths(staticOutDir: string, routePath: string): { htmlPath: string; metaPath: string } {
  const dir = routePath === "/" ? staticOutDir : path.join(staticOutDir, routePath.slice(1));
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

export async function writeCachedRoute(staticOutDir: string, routePath: string, html: string): Promise<void> {
  const { htmlPath, metaPath } = cachePaths(staticOutDir, routePath);
  await mkdir(path.dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, html);
  await writeFile(metaPath, JSON.stringify({ renderedAt: Date.now() }));
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
