import fs from "node:fs";
import path from "node:path";

const ROUTE_EXTENSIONS = new Set([".tsx", ".ts"]);

export interface RouteMatch {
  filePath: string;
  /** The concrete requested path (e.g. "/users/123" for a `[id].tsx` file,
   * not the file's own pattern) — what isr caching and logs should key on. */
  routePath: string;
  /** Values captured from any `[param]` segments in the matched file's
   * path — empty for a route with no dynamic segments. */
  params: Record<string, string>;
}

/**
 * File-based route matching (see architecture doc §4). Supports a single
 * dynamic segment per path part — `routes/users/[id].tsx` matches
 * `/users/123` with `params: { id: "123" }`. No catch-all/rest segments
 * (`[...slug]`) — out of scope for this slice, same as before.
 *
 * When more than one route file could match the same URL (a static and a
 * dynamic route occupying the same position — e.g. `users/new.tsx` and
 * `users/[id].tsx` both matching `/users/new`), the route with fewer
 * dynamic segments wins — a static segment is always more specific than a
 * parameter. This is resolved by scoring every candidate and picking the
 * lowest score, not by file-scan order.
 */
export function matchRoute(routesDir: string, urlPath: string): RouteMatch | null {
  const urlSegments = segmentsOf(normalizePath(urlPath));

  let best: { filePath: string; params: Record<string, string>; dynamicCount: number } | null = null;

  for (const filePath of collectRouteFiles(routesDir)) {
    const routeSegments = fileToRouteSegments(routesDir, filePath);
    if (routeSegments.length !== urlSegments.length) continue;

    const params: Record<string, string> = {};
    let dynamicCount = 0;
    let matched = true;
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSeg = routeSegments[i] as string;
      const urlSeg = urlSegments[i] as string;
      if (isDynamicSegment(routeSeg)) {
        params[paramName(routeSeg)] = decodeURIComponent(urlSeg);
        dynamicCount++;
      } else if (routeSeg !== urlSeg) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;

    if (!best || dynamicCount < best.dynamicCount) {
      best = { filePath, params, dynamicCount };
    }
  }

  if (!best) return null;
  return { filePath: best.filePath, routePath: normalizePath(urlPath), params: best.params };
}

/** All route paths under routesDir — used to generate sitemap.xml (§8).
 * A dynamic route (`[id].tsx`) has no single fixed URL, so its literal
 * pattern is never included here — see generateSitemapXml's own filter. */
export function listRoutePaths(routesDir: string): string[] {
  return collectRouteFiles(routesDir).map((filePath) => fileToRoutePath(routesDir, filePath));
}

/** All route file paths (absolute) under routesDir — used by the SSR build (ROADMAP.md #4). */
export function listRouteFiles(routesDir: string): string[] {
  return collectRouteFiles(routesDir);
}

/** The URL *pattern* a given route file corresponds to (e.g. "/users/[id]"
 * for a dynamic route) — used by the ssg/isr build step, which rejects a
 * dynamic route for either mode (see buildAppStatic.ts) since there's no
 * static-params API yet to know which concrete values to pre-render. */
export function routeFileToPath(routesDir: string, filePath: string): string {
  return fileToRoutePath(routesDir, filePath);
}

/** True if any segment of this route file's path is a `[param]` — used to
 * reject ssg/isr on a dynamic route before it silently mis-builds. */
export function isDynamicRouteFile(routesDir: string, filePath: string): boolean {
  return fileToRouteSegments(routesDir, filePath).some(isDynamicSegment);
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]") && segment.length > 2;
}

function paramName(segment: string): string {
  return segment.slice(1, -1);
}

function normalizePath(urlPath: string): string {
  if (urlPath === "" || urlPath === "/") return "/";
  return urlPath.replace(/\/+$/, "");
}

function segmentsOf(normalized: string): string[] {
  return normalized === "/" ? [] : normalized.slice(1).split("/");
}

function collectRouteFiles(routesDir: string): string[] {
  if (!fs.existsSync(routesDir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(routesDir, { withFileTypes: true })) {
    const full = path.join(routesDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (ROUTE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function fileToRouteSegments(routesDir: string, filePath: string): string[] {
  const rel = path.relative(routesDir, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  const segments = noExt.split(path.sep);
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

function fileToRoutePath(routesDir: string, filePath: string): string {
  const segments = fileToRouteSegments(routesDir, filePath);
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}
