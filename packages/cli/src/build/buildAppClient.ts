import path from "node:path";
import { readFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { build as viteBuild, resolveConfig } from "vite";
import { listRouteFiles, toBuildKey } from "@devora/core";
import { discoverIslandFiles } from "./discoverIslandFiles.js";
import { discoverCsrRouteFiles } from "./discoverCsrRouteFiles.js";

interface ViteManifestEntry {
  file: string;
  src?: string;
  isEntry?: boolean;
}

export interface ClientBuildResult {
  /** Absolute island source file → its real, hashed public URL (e.g. "/assets/components/Counter-B2LbqBKm.js"). */
  islandUrls: Map<string, string>;
  /** Public URL of the built island-client.tsx bootstrap, if any islands were found. */
  islandClientUrl?: string;
  /** Absolute csr route file → its real, hashed public URL. */
  csrUrls: Map<string, string>;
  /** Public URL of the built csr-client.tsx bootstrap, if any csr routes were found. */
  csrClientUrl?: string;
}

/**
 * Client build for islands (ROADMAP.md #3/#4) AND renderMode: "csr" routes
 * (ROADMAP.md's render-modes item) — both need a real client-side Vite
 * build producing a real hashed asset URL, so they share one build pass
 * rather than two (an app using only one of the two pays for exactly what
 * it uses; an app using neither skips this file's build entirely). Real
 * Vite manifest (`build.manifest: true`), verified against its actual shape
 * (a quick throwaway build + inspecting `.vite/manifest.json`) rather than
 * assumed — entries are keyed by root-relative source path with
 * `.src`/`.file`.
 */
export async function buildAppClient(appRoot: string): Promise<ClientBuildResult> {
  const routesDir = path.join(appRoot, "routes");
  const routeFiles = listRouteFiles(routesDir);
  const islandFiles = discoverIslandFiles(routeFiles);
  const csrFiles = discoverCsrRouteFiles(routeFiles);

  if (islandFiles.length === 0 && csrFiles.length === 0) {
    // No JS to bundle — but a real bug found while verifying the shared
    // branding header (ROADMAP.md's shared-design item): an app with no
    // islands/csr routes never ran a Vite client build at all, so its
    // `publicDir` (the logo/favicon, see apps/*/vite.config.ts) never got
    // copied to `dist/client` — the app-wide header's logo 404'd in
    // production for exactly this reason on marketing (no islands/csr).
    // Copy publicDir directly, skipping the (real, still avoided) cost of
    // a full JS bundling pass for an app that doesn't need one.
    const resolved = await resolveConfig(
      { root: appRoot, configFile: path.join(appRoot, "vite.config.ts") },
      "build"
    );
    if (resolved.publicDir && existsSync(resolved.publicDir)) {
      await cp(resolved.publicDir, path.join(appRoot, "dist", "client"), { recursive: true });
    }
    return { islandUrls: new Map(), csrUrls: new Map() };
  }

  const islandClientPath = path.join(appRoot, "island-client.tsx");
  const csrClientPath = path.join(appRoot, "csr-client.tsx");
  const clientOutDir = path.join(appRoot, "dist", "client");

  const input: Record<string, string> = {};
  if (islandFiles.length > 0) input["island-client"] = islandClientPath;
  if (csrFiles.length > 0) input["csr-client"] = csrClientPath;
  for (const file of islandFiles) {
    input[toBuildKey(appRoot, file)] = file;
  }
  for (const file of csrFiles) {
    input[toBuildKey(appRoot, file)] = file;
  }

  await viteBuild({
    root: appRoot,
    configFile: path.join(appRoot, "vite.config.ts"),
    build: {
      outDir: clientOutDir,
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input,
        // Real, previously-undiscovered bug, found while verifying csr's
        // production build by actually inspecting a built chunk's exports
        // (not just its content-type/status code, which is all earlier
        // island verification checked): Rollup's default
        // preserveEntrySignatures ("exports-only") does NOT reliably keep
        // an entry's `export default` when nothing in the same build
        // graph statically imports it — which is every entry here, since
        // each is only ever reached via a browser's own runtime
        // `import(url)` to a URL outside this build's static graph, not a
        // static import Rollup can see. Confirmed directly: without this,
        // `import()`-ing a built island/csr chunk in plain Node returned
        // `{ default: undefined }` — the component code was silently
        // tree-shaken away entirely, not just misplaced. "strict" forces
        // Rollup to treat every entry's exports as used, regardless of
        // whether anything in the graph statically references them.
        preserveEntrySignatures: "strict",
      },
    },
  });

  const manifestPath = path.join(clientOutDir, ".vite", "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`[devora] client build for islands/csr produced no manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as Record<string, ViteManifestEntry>;

  const islandUrls = new Map<string, string>();
  const csrUrls = new Map<string, string>();
  let islandClientUrl: string | undefined;
  let csrClientUrl: string | undefined;
  for (const entry of Object.values(manifest)) {
    if (!entry.isEntry || !entry.src) continue;
    const absoluteSrc = path.resolve(appRoot, entry.src);
    if (absoluteSrc === islandClientPath) {
      islandClientUrl = `/${entry.file}`;
    } else if (absoluteSrc === csrClientPath) {
      csrClientUrl = `/${entry.file}`;
    } else if (islandFiles.includes(absoluteSrc)) {
      islandUrls.set(absoluteSrc, `/${entry.file}`);
    } else if (csrFiles.includes(absoluteSrc)) {
      csrUrls.set(absoluteSrc, `/${entry.file}`);
    }
  }

  return { islandUrls, islandClientUrl, csrUrls, csrClientUrl };
}
