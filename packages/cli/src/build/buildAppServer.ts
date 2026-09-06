import path from "node:path";
import { writeFile } from "node:fs/promises";
import { build as viteBuild } from "vite";
import { listRouteFiles, toBuildKey } from "@devora/core";
import { buildAppClient } from "./buildAppClient.js";
import { islandsBuildPlugin } from "./islandsBuildPlugin.js";

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
 * an SSR build. `@devora/core` does NOT — and correctly so, not a bug:
 * its package.json `exports` points straight at `.ts` source
 * (`./src/index.ts`), not a compiled `.js` file, so plain Node `import()`
 * couldn't execute it if it stayed external. Bundling it inline is what
 * makes the output actually runnable. Tried forcing `ssr.external: true`
 * to "fix" this — verified it changes nothing (same output), which is what
 * confirmed the above rather than leaving it assumed.
 *
 * Real, measured cost of that: every app's SSR bundle inlines its own copy
 * of `@devora/core`, including a second copy of `react` (the parts
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
export async function buildAppServer(appRoot: string): Promise<{ serverOutDir: string }> {
  const routesDir = path.join(appRoot, "routes");
  const entryServerPath = path.join(appRoot, "entry-server.tsx");
  const serverOutDir = path.join(appRoot, "dist", "server");

  const { islandUrls, islandClientUrl, csrUrls, csrClientUrl } = await buildAppClient(appRoot);

  const input: Record<string, string> = { "entry-server": entryServerPath };
  for (const filePath of listRouteFiles(routesDir)) {
    input[toBuildKey(appRoot, filePath)] = filePath;
  }

  await viteBuild({
    root: appRoot,
    configFile: path.join(appRoot, "vite.config.ts"),
    plugins: [islandsBuildPlugin(islandUrls)],
    build: {
      ssr: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      rollupOptions: { input },
    },
  });

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
