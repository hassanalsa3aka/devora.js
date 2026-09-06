import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  listRouteFiles,
  routeFileToPath,
  toBuildKey,
  resolveRenderMode,
  writeCachedRoute,
  readIslandClientUrl,
  type RouteModule,
  type RenderMode,
} from "@devora/core";

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
  appDefaultRenderMode: RenderMode | undefined
): Promise<{ staticRoutes: string[] }> {
  const routesDir = path.join(appRoot, "routes");
  const staticOutDir = path.join(appRoot, "dist", "static");
  const islandManifestPath = path.join(serverOutDir, "island-manifest.json");
  const islandClientUrl = await readIslandClientUrl(islandManifestPath);

  const entryServer = (await importBuilt(serverOutDir, "entry-server")) as {
    renderStatic: (routeModule: RouteModule, opts: { islandClientUrl?: string }) => Promise<{ html: string }>;
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
