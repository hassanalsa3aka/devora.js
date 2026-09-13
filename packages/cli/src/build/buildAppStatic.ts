import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  listRouteFiles,
  routeFileToPath,
  isDynamicRouteFile,
  resolveStaticRoutePath,
  toBuildKey,
  resolveRenderMode,
  writeCachedRoute,
  readIslandClientUrl,
  type RouteModule,
  type RenderMode,
} from "@devorajs/core";

/**
 * Build-time pre-render for `ssg`/`isr` routes — the piece that was
 * entirely missing before (only a live per-request render existed). Runs
 * after buildAppServer.ts (needs its dist/server output already built and
 * importable) and writes each route's HTML into dist/static/<route>/, in
 * the exact shape isrCache.ts's readCachedRoute expects — `isr` routes'
 * build output doubles as their first cache entry, not a separate thing.
 */
export async function buildAppStatic(
  appRoot: string,
  serverOutDir: string,
  appDefaultRenderMode: RenderMode | undefined,
  options: { backendOnly?: boolean } = {}
): Promise<{ staticRoutes: string[] }> {
  // Backend-only app mode (architecture-v2.md §3.4) — no pages means no
  // entry-server.tsx build output at all (buildAppServer.ts skips it), so
  // this must return before ever trying to import it. A real bug found
  // wiring this up: this function used to import entry-server.js
  // unconditionally, before even checking whether any ssg/isr route
  // existed — harmless for a normal app (always has one), but a build-time
  // crash for a backend-only app that never built one in the first place.
  if (options.backendOnly) return { staticRoutes: [] };

  const routesDir = path.join(appRoot, "routes");
  const staticOutDir = path.join(appRoot, "dist", "static");
  const islandManifestPath = path.join(serverOutDir, "island-manifest.json");
  const islandClientUrl = await readIslandClientUrl(islandManifestPath);

  const entryServer = (await importBuilt(serverOutDir, "entry-server")) as {
    renderStatic: (
      routeModule: RouteModule,
      opts: { islandClientUrl?: string; params?: Record<string, string> }
    ) => Promise<{ html: string }>;
  };

  const staticRoutes: string[] = [];

  for (const filePath of listRouteFiles(routesDir)) {
    const key = toBuildKey(appRoot, filePath);
    const routeModule = (await importBuilt(serverOutDir, key)) as RouteModule;
    const mode = resolveRenderMode(routeModule, appDefaultRenderMode);
    if (mode !== "ssg" && mode !== "isr") continue;

    if (routeModule.action) {
      throw new Error(
        `[devora] route "${key}" is renderMode: "${mode}" but exports action — actions never run for ${mode} routes.`
      );
    }
    // A dynamic route (`[id].tsx`) has no single fixed URL — it needs
    // `getStaticParams()` (architecture-v2.md §3.6) to say which concrete
    // values to pre-render, one static file per entry. Still fails loudly,
    // just for a narrower reason now: a dynamic route with no
    // `getStaticParams()` export, not "dynamic routes don't support this."
    if (isDynamicRouteFile(routesDir, filePath)) {
      if (typeof routeModule.getStaticParams !== "function") {
        throw new Error(
          `[devora] route "${routeFileToPath(routesDir, filePath)}" is a dynamic route (renderMode: ` +
            `"${mode}") — needs a getStaticParams() export to know which values to pre-render. Add ` +
            `one, or use renderMode: "ssr"/"csr" instead.`
        );
      }
      const paramSets = await routeModule.getStaticParams();
      for (const params of paramSets) {
        const { html } = await entryServer.renderStatic(routeModule, { islandClientUrl, params });
        const routePath = resolveStaticRoutePath(routesDir, filePath, params);
        await writeCachedRoute(staticOutDir, routePath, html);
        staticRoutes.push(routePath);
      }
      continue;
    }

    const { html } = await entryServer.renderStatic(routeModule, { islandClientUrl });
    const routePath = routeFileToPath(routesDir, filePath);
    await writeCachedRoute(staticOutDir, routePath, html);
    staticRoutes.push(routePath);
  }

  return { staticRoutes };
}

async function importBuilt(serverOutDir: string, key: string): Promise<unknown> {
  const filePath = path.join(serverOutDir, `${key}.js`);
  return import(pathToFileURL(filePath).href);
}
