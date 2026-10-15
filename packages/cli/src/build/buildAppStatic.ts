import path from "node:path";
import fs from "node:fs";
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
  ROUTE_CSS_MANIFEST_FILE,
  type HeadConfig,
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
 *
 * Only ssg/isr routes are imported (and so executed) here. A route's render
 * mode is read from its source (`export const renderMode = "ssr"`) rather
 * than by importing it — before round 3 every route was imported, so a
 * request-time-only module (a DB/storage client reading secrets at import)
 * crashed builds that ran without those secrets, e.g. a Docker build stage.
 * A route whose renderMode isn't a plain string literal is still imported
 * to find out.
 */
export async function buildAppStatic(
  appRoot: string,
  serverOutDir: string,
  appDefaultRenderMode: RenderMode | undefined,
  options: { backendOnly?: boolean; head?: HeadConfig; domain?: string } = {}
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

  const staticRoutes: string[] = [];
  const candidates = listRouteFiles(routesDir).filter((filePath) => {
    const declared = readDeclaredRenderMode(fs.readFileSync(filePath, "utf-8"));
    if (declared === "unknown") return true; // must import to know
    const mode = declared ?? appDefaultRenderMode ?? "ssr";
    return mode === "ssg" || mode === "isr";
  });
  if (candidates.length === 0) return { staticRoutes };

  const entryServer = (await importBuilt(serverOutDir, "entry-server")) as {
    renderStatic: (
      routeModule: RouteModule,
      opts: { islandClientUrl?: string; params?: Record<string, string | string[]>; url?: string; head?: HeadConfig; styles?: string[] }
    ) => Promise<{ html: string }>;
  };
  const routeCss = readJson<Record<string, string[]>>(path.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE)) ?? {};
  const origin = options.domain ? `https://${options.domain}` : "http://localhost";

  for (const filePath of candidates) {
    const key = toBuildKey(appRoot, filePath);
    const routeModule = (await importBuilt(serverOutDir, key)) as RouteModule;
    const mode = resolveRenderMode(routeModule, appDefaultRenderMode);
    if (mode !== "ssg" && mode !== "isr") continue;
    const pageOptions = (routePath: string) => ({ islandClientUrl, url: new URL(routePath, origin).href, head: options.head, styles: routeCss[key] });

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
        const routePath = resolveStaticRoutePath(routesDir, filePath, params);
        const { html } = await entryServer.renderStatic(routeModule, { ...pageOptions(routePath), params });
        await writeCachedRoute(staticOutDir, routePath, html);
        staticRoutes.push(routePath);
      }
      continue;
    }

    const routePath = routeFileToPath(routesDir, filePath);
    const { html } = await entryServer.renderStatic(routeModule, pageOptions(routePath));
    await writeCachedRoute(staticOutDir, routePath, html);
    staticRoutes.push(routePath);
  }

  return { staticRoutes };
}

async function importBuilt(serverOutDir: string, key: string): Promise<unknown> {
  const filePath = path.join(serverOutDir, `${key}.js`);
  return import(pathToFileURL(filePath).href);
}

const LITERAL_RENDER_MODE_RE =
  /export\s+(?:const|let|var)\s+renderMode\s*(?::\s*[\w.<>"' |]+)?=\s*["'](ssr|ssg|csr|streaming|isr)["']/;
const ANY_RENDER_MODE_EXPORT_RE = /export\s+(?:const|let|var|function)\s+renderMode\b|export\s*\{[^}]*\brenderMode\b[^}]*\}/;

/**
 * A route's declared renderMode, read from source: the literal value,
 * `undefined` when it declares none (so the app default applies), or
 * "unknown" when it exports one that isn't a plain string literal.
 */
export function readDeclaredRenderMode(source: string): RenderMode | undefined | "unknown" {
  const literal = LITERAL_RENDER_MODE_RE.exec(source);
  if (literal) return literal[1] as RenderMode;
  return ANY_RENDER_MODE_EXPORT_RE.test(source) ? "unknown" : undefined;
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return undefined;
  }
}
