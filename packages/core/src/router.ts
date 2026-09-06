import fs from "node:fs";
import path from "node:path";

const ROUTE_EXTENSIONS = new Set([".tsx", ".ts"]);

export interface RouteMatch {
  filePath: string;
  routePath: string;
}

/**
 * File-based route matching (see architecture doc §4). Static segments only
 * for this slice — dynamic segments (e.g. routes/users/[id].tsx) aren't
 * supported yet.
 */
export function matchRoute(routesDir: string, urlPath: string): RouteMatch | null {
  const normalized = normalizePath(urlPath);
  for (const filePath of collectRouteFiles(routesDir)) {
    if (fileToRoutePath(routesDir, filePath) === normalized) {
      return { filePath, routePath: normalized };
    }
  }
  return null;
}

/** All route paths under routesDir — used to generate sitemap.xml (§8). */
export function listRoutePaths(routesDir: string): string[] {
  return collectRouteFiles(routesDir).map((filePath) => fileToRoutePath(routesDir, filePath));
}

/** All route file paths (absolute) under routesDir — used by the SSR build (ROADMAP.md #4). */
export function listRouteFiles(routesDir: string): string[] {
  return collectRouteFiles(routesDir);
}

/** The URL path a given route file resolves to — used by the ssg/isr build
 * step to know where to write a route's pre-rendered HTML. */
export function routeFileToPath(routesDir: string, filePath: string): string {
  return fileToRoutePath(routesDir, filePath);
}

function normalizePath(urlPath: string): string {
  if (urlPath === "" || urlPath === "/") return "/";
  return urlPath.replace(/\/+$/, "");
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

function fileToRoutePath(routesDir: string, filePath: string): string {
  const rel = path.relative(routesDir, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  const segments = noExt.split(path.sep);
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}
