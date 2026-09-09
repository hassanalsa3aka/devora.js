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
 * "/users/[id]" (there's no static-params API yet to know which concrete
 * values exist — see router.ts).
 */
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
