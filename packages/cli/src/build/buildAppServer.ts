import path from "node:path";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { build as viteBuild, type Plugin } from "vite";
import type { Rollup } from "vite";
type OutputChunk = Rollup.OutputChunk;
import {
  listRouteFiles,
  resolveApiDir,
  toBuildKey,
  SESSION_MANIFEST_FILE,
  SESSION_STORE_BUILD_KEY,
  ROUTE_CSS_MANIFEST_FILE,
  ERROR_PAGE_BUILD_KEY,
  type SessionManifest,
} from "@devorajs/core";
import { ERROR_PAGE_FILES } from "../server/ssrMiddleware.js";
import { buildAppClient } from "./buildAppClient.js";
import { islandsBuildPlugin, ISLAND_PLACEHOLDER_RE } from "./islandsBuildPlugin.js";
import { viteLogLevel } from "../terminal/output.js";

/**
 * The real SSR production build (ROADMAP.md #4) — every route file plus
 * entry-server.tsx as named rollup entries. Named inputs give predictable
 * output paths (`dist/server/<key>.js`), so the production request handler
 * can compute a route's built file the same way `matchRoute` finds its
 * source file — no manifest needed for this part.
 *
 * Runs the client build for islands (buildAppClient.ts) FIRST — its
 * manifest-resolved URLs feed islandsBuildPlugin.ts, which injects them
 * into the SSR build the same way islandsPlugin.ts does for dev (a
 * `/@fs/<path>` URL there vs. a real hashed asset URL here). An app with no
 * islands skips the client build entirely (buildAppClient returns an empty
 * map) and pays nothing for this. The resolved island-client bootstrap URL
 * is written to `dist/server/island-manifest.json` for the production
 * request handler to read once at startup — see prodRequestHandler.ts.
 *
 * `react`/`react-dom` (real npm installs) get externalized as expected for
 * an SSR build. `@devorajs/core` does NOT — and correctly so, not a bug:
 * its package.json `exports` points straight at `.ts` source
 * (`./src/index.ts`), not a compiled `.js` file, so plain Node `import()`
 * couldn't execute it if it stayed external. Bundling it inline is what
 * makes the output actually runnable. Tried forcing `ssr.external: true`
 * to "fix" this — verified it changes nothing (same output), which is what
 * confirmed the above rather than leaving it assumed.
 *
 * Real, measured cost of that: every app's SSR bundle inlines its own copy
 * of `@devorajs/core`, including a second copy of `react` (the parts
 * islandComponent.tsx imports) separate from the externalized one used
 * elsewhere in the same bundle — ~255KB per app, paid even by an app with
 * zero islands. Tested whether this causes an actual two-React-instances
 * hook bug (the real risk, not just bundle bloat): it did not, in the one
 * scenario exercised (`useContext` in the island demo rendered correctly)
 * — React's `Symbol.for()`-keyed context types survive being defined by a
 * separate bundled React copy. Not proof it's safe for every hook in every
 * case, just what was actually verified. The real fix is giving
 * `packages/core` an actual build step (compiled `.js` output) so it can be
 * externalized like any other dependency — not done here, see ROADMAP.md #4.
 */
export async function buildAppServer(
  appRoot: string,
  options: {
    backendOnly?: boolean;
    /** Absent for an auth: "none" app (no sessions at all). */
    sessions?: { manifest: SessionManifest; storeModulePath?: string };
    /** app.config.ts `apiDir`, normalized (default "api"). */
    apiDir?: string;
  } = {}
): Promise<{ serverOutDir: string }> {
  const routesDir = path.join(appRoot, "routes");
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const entryServerPath = path.join(appRoot, "entry-server.tsx");
  const serverOutDir = path.join(appRoot, "dist", "server");
  const clientOutDir = path.join(appRoot, "dist", "client");

  const input: Record<string, string> = options.backendOnly ? {} : { "entry-server": entryServerPath };
  for (const filePath of listRouteFiles(routesDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  // The app's error page (apps/<name>/error.tsx) — optional; rendered for
  // 404s and for errors thrown by pages (renderRoute.ts).
  const errorPagePath = options.backendOnly
    ? undefined
    : ERROR_PAGE_FILES.map((f) => path.join(appRoot, f)).find((f) => existsSync(f));
  if (errorPagePath) input[ERROR_PAGE_BUILD_KEY] = errorPagePath;
  // Generic API routes (architecture-v2.md §3.2) — same named-rollup-entry
  // trick as page routes above, so prodRequestHandler.ts can compute an API
  // route's built file the same way it already does for a page route, no
  // separate manifest needed. `listRouteFiles` returns [] if an app has no
  // API folder at all — the common case, and free.
  for (const filePath of listRouteFiles(apiDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }
  // The project's session store module (shared.sessions.store), bundled as
  // its own named entry so prodRequestHandler.ts can import() it by a fixed
  // key — same trick as routes above. It lives outside appRoot (usually
  // packages/backend), which Rollup handles fine for an explicit input.
  if (options.sessions?.storeModulePath) {
    input[SESSION_STORE_BUILD_KEY] = options.sessions.storeModulePath;
  }

  // 1. SSR build. It follows every import from every route, so it is where
  //    islands are discovered (islandsBuildPlugin.ts) and where the CSS each
  //    page imports is known (routeCssPlugin below; ssrEmitAssets makes Vite
  //    emit that CSS, and imported images/fonts, instead of dropping them).
  const islandPlaceholders = new Map<string, string>();
  const routeCss: Record<string, string[]> = {};
  await viteBuild({
    root: appRoot,
    logLevel: viteLogLevel(),
    configFile: path.join(appRoot, "vite.config.ts"),
    plugins: [islandsBuildPlugin(islandPlaceholders), routeCssPlugin(routeCss)],
    build: {
      ssr: true,
      ssrEmitAssets: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      rollupOptions: { input },
    },
  });

  // 2. Client build for exactly the islands the SSR build found (plus csr
  //    routes). Backend-only apps have neither (architecture-v2.md §3.4).
  const islandFiles = [...new Set(islandPlaceholders.values())];
  const { islandUrls, islandClientUrl, csrUrls, csrClientUrl } = options.backendOnly
    ? { islandUrls: new Map<string, string>(), islandClientUrl: undefined, csrUrls: new Map<string, string>(), csrClientUrl: undefined }
    : await buildAppClient(appRoot, islandFiles);

  // 3. Swap each island placeholder in the SSR output for its real URL.
  if (islandPlaceholders.size > 0) {
    await replaceIslandPlaceholders(serverOutDir, islandPlaceholders, islandUrls);
  }

  // 4. Publish what the SSR build emitted besides JS (route CSS, imported
  //    images/fonts) next to the client assets, where every adapter serves
  //    /assets/* from. After the client build, which empties dist/client.
  await publishSsrAssets(serverOutDir, clientOutDir);
  await writeFile(path.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE), JSON.stringify(routeCss, null, 2));

  if (options.sessions) {
    await writeFile(path.join(serverOutDir, SESSION_MANIFEST_FILE), JSON.stringify(options.sessions.manifest, null, 2));
  }

  await writeFile(
    path.join(serverOutDir, "island-manifest.json"),
    JSON.stringify({ islandClientUrl: islandClientUrl ?? null }, null, 2)
  );

  // Runtime-read manifest, not baked into the SSR bundle like islands'
  // resolved URLs are (islandsBuildPlugin.ts rewrites island() calls at
  // SSR-build time because SSR *does* render the real component and needs
  // the URL embedded in its markup). A csr route's server side never
  // renders the component at all — just the shell — so a plain JSON lookup
  // at request time is enough, no build-time rewrite needed.
  const csrRoutes: Record<string, string> = {};
  for (const [absPath, url] of csrUrls) {
    csrRoutes[toBuildKey(appRoot, absPath)] = url;
  }
  await writeFile(
    path.join(serverOutDir, "csr-route-manifest.json"),
    JSON.stringify({ csrClientUrl: csrClientUrl ?? null, routes: csrRoutes }, null, 2)
  );

  return { serverOutDir };
}

/**
 * Records, per entry (route, error page), the URLs of every CSS file it
 * pulls in — its own, its static imports', and its dynamic imports' (an
 * island's CSS is needed at first paint too, since SSR renders the island).
 * Read from Vite's chunk metadata, so it's exactly what the build emitted.
 */
function routeCssPlugin(out: Record<string, string[]>): Plugin {
  return {
    name: "devora:route-css",
    generateBundle(_options, bundle) {
      const chunks = new Map<string, OutputChunk>();
      for (const item of Object.values(bundle)) if (item.type === "chunk") chunks.set(item.fileName, item);
      for (const chunk of chunks.values()) {
        if (!chunk.isEntry) continue;
        const css = new Set<string>();
        const seen = new Set<string>();
        const visit = (fileName: string) => {
          if (seen.has(fileName)) return;
          seen.add(fileName);
          const current = chunks.get(fileName);
          if (!current) return;
          const meta = (current as OutputChunk & { viteMetadata?: { importedCss?: Set<string> } }).viteMetadata;
          for (const file of meta?.importedCss ?? []) css.add(`/${file}`);
          for (const dep of [...current.imports, ...current.dynamicImports]) visit(dep);
        };
        visit(chunk.fileName);
        if (css.size > 0) out[chunk.name] = [...css];
      }
    },
  };
}

async function replaceIslandPlaceholders(
  serverOutDir: string,
  placeholders: Map<string, string>,
  islandUrls: Map<string, string>
): Promise<void> {
  for (const file of await listFiles(serverOutDir, ".js")) {
    const code = await readFile(file, "utf-8");
    if (!code.includes("__DEVORA_ISLAND_")) continue;
    const replaced = code.replace(ISLAND_PLACEHOLDER_RE, (placeholder) => {
      const source = placeholders.get(placeholder);
      const url = source ? islandUrls.get(source) : undefined;
      if (!url) {
        throw new Error(`[devora] the client build produced no bundle for island ${source ?? placeholder} — please report this`);
      }
      return url;
    });
    await writeFile(file, replaced);
  }
}

/** Copies dist/server/assets/* except JS (server code) to dist/client/assets. */
async function publishSsrAssets(serverOutDir: string, clientOutDir: string): Promise<void> {
  const assetsDir = path.join(serverOutDir, "assets");
  if (!existsSync(assetsDir)) return;
  for (const file of await listFiles(assetsDir)) {
    if (/\.(m?js|map)$/.test(file)) continue;
    const dest = path.join(clientOutDir, "assets", path.relative(assetsDir, file));
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(file, dest);
  }
}

async function listFiles(dir: string, extension?: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, extension)));
    else if (!extension || entry.name.endsWith(extension)) out.push(full);
  }
  return out;
}
