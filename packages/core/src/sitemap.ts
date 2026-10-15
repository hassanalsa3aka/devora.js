/**
 * sitemap.xml, auto-generated from an app's route tree (§8) — reflects the
 * file-based route tree exactly, regardless of which renderMode values are
 * actually implemented yet (see ROADMAP.md #1); a listed route that isn't
 * "ssr" will 404 if crawled until its render mode lands, same as any direct
 * visit. Whether this is called at all is gated per app by `sitemap: true`
 * in app.config.ts (opt-in, default off — see AppRuntimeConfig, ROADMAP.md
 * #7); once an app opts in, its *entire* route tree is listed, with no
 * further per-route exclusion — except a dynamic route (`[id].tsx`), which
 * has no single fixed URL and is skipped rather than listed literally as
 * "/users/[id]". `collectSitemapPaths` below adds the concrete URLs a
 * dynamic route's `getStaticParams()` lists.
 */
import { isDynamicRouteFile, listRouteFiles, resolveStaticRoutePath, routeFileToPath } from "./router.js";
import type { RouteModule } from "./route.js";

/**
 * Every URL the sitemap should list: each static route, plus one URL per
 * `getStaticParams()` entry of a dynamic route (`[id]`, `[...slug]`). A
 * dynamic route without `getStaticParams` has no known URLs and is left out.
 * `loadRoute` is how the caller imports a route module (Vite's SSR loader in
 * dev, the built server bundle in production).
 */
export async function collectSitemapPaths(
  routesDir: string,
  loadRoute: (filePath: string) => Promise<RouteModule | undefined>
): Promise<string[]> {
  const out = new Set<string>();
  for (const filePath of listRouteFiles(routesDir)) {
    if (!isDynamicRouteFile(routesDir, filePath)) {
      out.add(routeFileToPath(routesDir, filePath));
      continue;
    }
    const mod = await loadRoute(filePath);
    if (!mod?.getStaticParams) continue;
    for (const params of await mod.getStaticParams()) {
      out.add(resolveStaticRoutePath(routesDir, filePath, params));
    }
  }
  return [...out].sort();
}

export function generateSitemapXml(routePaths: string[], domain: string): string {
  const urls = routePaths
    .filter((routePath) => !routePath.includes("["))
    .map((routePath) => `  <url><loc>https://${domain}${routePath === "/" ? "" : routePath}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
