/**
 * The production build of the experimental engine: esbuild plus this package's own code, no Vite. Two bundles, the same two
 * the Vite build makes:
 *
 *  - `buildServerBundle`: every route, API route, the error page and entry-server as named entries (`<outDir>/<key>.js`),
 *    code splitting on, packages from node_modules left external (a linked workspace package is bundled: its source is
 *    TypeScript), CSS and assets emitted under `<outDir>/assets/`, and every `island(() => import("./X"))` call given a
 *    placeholder that the caller later swaps for the island's real URL.
 *  - `buildClientBundle`: the browser entries (island client, csr client, each island and csr route) with code splitting,
 *    minified, hashed names under `<outDir>/assets/`, and a map from entry key to its public URL.
 *
 * Nothing here evaluates the code it builds.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, transform, type Metafile, type Plugin } from "esbuild";
import { applyEdits, expandGlobs, findIslandCalls, parseModule, UNSUPPORTED_ISLAND_CALL_MESSAGE } from "./core.mjs";

const LOADERS: Record<string, "tsx" | "ts" | "jsx" | "js"> = { ".tsx": "tsx", ".ts": "ts", ".jsx": "jsx", ".js": "js", ".mjs": "js" };
const ASSET_LOADERS = Object.fromEntries(
  [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".webm", ".mp3", ".wav", ".pdf", ".txt"].map((e) => [e, "file" as const])
);
const NODE_MODULES = `${path.sep}node_modules${path.sep}`;

/** A placeholder this build writes for an island's URL, and the pattern that finds it again in the output. */
export const ISLAND_PLACEHOLDER_PATTERN = /__DEVORA_ISLAND_[0-9a-f]{16}__/g;

const sha = (text: string, length: number) => createHash("sha256").update(text).digest("hex").slice(0, length);

function defines(ssr: boolean): Record<string, string> {
  return {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env.MODE": '"production"',
    "import.meta.env.PROD": "true",
    "import.meta.env.DEV": "false",
    "import.meta.env.SSR": ssr ? "true" : "false",
    "import.meta.env.BASE_URL": '"/"',
  };
}

/**
 * Reads the two source-level features esbuild does not know: `import.meta.glob` (literal arguments, as in the dev server) and,
 * in the server bundle, the island calls. Only files that contain the trigger text are read here; every other file goes
 * through esbuild's own loader untouched.
 */
function sourcePlugin(options: { islands?: Map<string, string> }): Plugin {
  return {
    name: "devora:source",
    setup(b) {
      b.onLoad({ filter: /\.(tsx|ts|jsx|js|mjs)$/ }, async (args) => {
        if (args.path.includes(NODE_MODULES)) return undefined;
        const source = await readFile(args.path, "utf8");
        const hasGlob = source.includes("import.meta.glob");
        const hasIsland = options.islands !== undefined && source.includes("island");
        if (!hasGlob && !hasIsland) return undefined;
        const loader = LOADERS[path.extname(args.path)] ?? "js";
        let code = (await transform(source, { loader, format: "esm", jsx: "automatic", target: "esnext", sourcefile: args.path })).code;
        code = expandGlobs(code, args.path);
        if (hasIsland && code.includes("island")) {
          const program = parseModule(code);
          const { supported, unsupported } = findIslandCalls(program);
          if (unsupported.length > 0) throw new Error(`${args.path}: ${UNSUPPORTED_ISLAND_CALL_MESSAGE}`);
          const edits: { start: number; end: number; text: string }[] = [];
          for (const call of supported) {
            if (call.alreadyResolved) continue;
            const resolved = await b.resolve(call.specifier, { resolveDir: path.dirname(args.path), kind: "dynamic-import" });
            if (resolved.errors.length > 0 || resolved.external) {
              throw new Error(`[devora] island() import "${call.specifier}" doesn't resolve to a file in this app (${args.path})`);
            }
            const file = resolved.path;
            const placeholder = `__DEVORA_ISLAND_${sha(file, 16)}__`;
            options.islands!.set(placeholder, file);
            edits.push({ start: call.insertAt, end: call.insertAt, text: `, ${JSON.stringify(placeholder)}` });
          }
          code = applyEdits(code, edits);
        }
        return { contents: code, loader: "js", resolveDir: path.dirname(args.path) };
      });
    },
  };
}

/**
 * Server bundle: an image or font imported from JavaScript is copied to `<outDir>/assets/<name>-<hash>` and the import is its
 * public URL (`/assets/...`). (esbuild's own file loader would write relative URLs into the server's files.) An asset a
 * stylesheet refers to with `url(...)` is left to esbuild; moveStylesheets() rewrites those paths when it moves the stylesheet.
 */
function serverAssetPlugin(outDir: string): Plugin {
  const ASSET = new RegExp(`(${Object.keys(ASSET_LOADERS).map((e) => e.replace(".", "\\.")).join("|")})$`, "i");
  return {
    name: "devora:server-assets",
    setup(b) {
      b.onResolve({ filter: ASSET }, async (args) => {
        if (args.kind === "url-token" || args.pluginData?.devoraSkip) return undefined;
        const result = await b.resolve(args.path, { resolveDir: args.resolveDir, kind: args.kind, importer: args.importer, pluginData: { devoraSkip: true } });
        if (result.errors.length > 0) return { errors: result.errors };
        return { path: result.path, namespace: "devora-asset" };
      });
      b.onLoad({ filter: /.*/, namespace: "devora-asset" }, async (args) => {
        const bytes = await readFile(args.path);
        const ext = path.extname(args.path);
        const name = `${path.basename(args.path, ext).replace(/[^\w.-]/g, "_")}-${createHash("sha256").update(bytes).digest("hex").slice(0, 8)}${ext}`;
        await mkdir(path.join(outDir, "assets"), { recursive: true });
        await writeFile(path.join(outDir, "assets", name), bytes);
        return { contents: `export default ${JSON.stringify(`/assets/${name}`)};`, loader: "js" };
      });
    },
  };
}

/** Packages installed in node_modules stay external in the server bundle; linked workspace sources (real path outside it) are bundled. */
function externalPackagesPlugin(appRoot: string): Plugin {
  // A package is left external only when the built server can load it at run time: the app's own folders must resolve it too.
  // (An app without React, built from a linked core that imports React, gets React bundled, as the Vite build does.)
  const loadable = new Map<string, boolean>();
  return {
    name: "devora:external-packages",
    setup(b) {
      b.onResolve({ filter: /^[^./#\\]/ }, async (args) => {
        if (args.pluginData?.devoraSkip || path.isAbsolute(args.path)) return undefined;
        const result = await b.resolve(args.path, { resolveDir: args.resolveDir, kind: args.kind, importer: args.importer, pluginData: { devoraSkip: true } });
        if (result.errors.length > 0) return { errors: result.errors, warnings: result.warnings };
        if (result.external) return { path: args.path, external: true };
        if (!result.path.includes(NODE_MODULES)) return result;
        let ok = loadable.get(args.path);
        if (ok === undefined) {
          const fromApp = await b.resolve(args.path, { resolveDir: appRoot, kind: args.kind, pluginData: { devoraSkip: true } });
          ok = fromApp.errors.length === 0 && !fromApp.external;
          loadable.set(args.path, ok);
        }
        return ok ? { path: args.path, external: true } : result;
      });
    },
  };
}

/** Collects every output file below a directory. */
async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

export interface ServerBundleResult {
  /** Entry key → the public URLs of every stylesheet that entry (or anything it imports, dynamic imports included) pulls in. */
  routeCss: Record<string, string[]>;
  /** Placeholder → absolute island source file. */
  islands: Map<string, string>;
  /** The esbuild metafile, for size reporting. */
  metafile: Metafile;
}

/** Stylesheets get content-hashed names under assets/, so they can sit next to the client's assets and cache forever. */
async function moveStylesheets(appRoot: string, outDir: string, metafile: Metafile): Promise<Map<string, string>> {
  const renamed = new Map<string, string>();
  await mkdir(path.join(outDir, "assets"), { recursive: true });
  for (const out of Object.keys(metafile.outputs)) {
    if (!out.endsWith(".css")) continue;
    const abs = path.resolve(appRoot, out);
    let css = await readFile(abs, "utf8");
    // url(...) references esbuild wrote relative to the stylesheet's old place become absolute public URLs
    css = css.replace(/url\(\s*(["']?)([^)"'\s]+)\1\s*\)/g, (whole, quote: string, ref: string) => {
      if (/^(data:|https?:|\/|#)/.test(ref)) return whole;
      const target = path.resolve(path.dirname(abs), ref.replace(/[?#].*$/, ""));
      const rel = path.relative(outDir, target);
      return rel.startsWith("..") ? whole : `url(${quote}/${rel.split(path.sep).join("/")}${quote})`;
    });
    await writeFile(abs, css);
    const text = Buffer.from(css);
    const name = `${path.basename(abs, ".css").replace(/[^\w.-]/g, "_")}-${createHash("sha256").update(text).digest("hex").slice(0, 8)}.css`;
    const dest = path.join(outDir, "assets", name);
    if (abs !== dest) {
      await copyFile(abs, dest);
      await rm(abs);
    }
    renamed.set(out, `/assets/${name}`);
  }
  return renamed;
}

export async function buildServerBundle(options: {
  appRoot: string;
  entries: Record<string, string>;
  outDir: string;
  logLevel?: "silent" | "warning";
}): Promise<ServerBundleResult> {
  const { appRoot, entries, outDir } = options;
  await rm(outDir, { recursive: true, force: true });
  const islands = new Map<string, string>();
  const result = await build({
    absWorkingDir: appRoot,
    entryPoints: Object.entries(entries).map(([out, input]) => ({ in: input, out })),
    outdir: outDir,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "node",
    target: "node20",
    jsx: "automatic",
    entryNames: "[dir]/[name]",
    chunkNames: "chunks/[name]-[hash]",
    assetNames: "assets/[name]-[hash]",
    loader: ASSET_LOADERS,
    define: defines(true),
    metafile: true,
    write: true,
    legalComments: "none",
    logLevel: options.logLevel ?? "warning",
    // import.meta.url style code in a bundled module needs a banner for require() of CommonJS dependencies that stay bundled
    banner: { js: 'import { createRequire as __devoraCreateRequire } from "node:module"; const require = __devoraCreateRequire(import.meta.url);' },
    plugins: [serverAssetPlugin(outDir), externalPackagesPlugin(appRoot), sourcePlugin({ islands })],
  });
  const metafile = result.metafile;
  const cssUrls = await moveStylesheets(appRoot, outDir, metafile);

  // Entry key → its stylesheets, following static and dynamic imports like the Vite build's route CSS manifest does.
  const byOutput = new Map(Object.entries(metafile.outputs));
  const routeCss: Record<string, string[]> = {};
  for (const [out, info] of byOutput) {
    if (!info.entryPoint || out.endsWith(".css")) continue;
    const key = path.relative(outDir, path.resolve(appRoot, out)).replace(/\\/g, "/").replace(/\.js$/, "");
    const css = new Set<string>();
    const seen = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const current = byOutput.get(file);
      if (!current) return;
      if (current.cssBundle && cssUrls.has(current.cssBundle)) css.add(cssUrls.get(current.cssBundle)!);
      for (const imp of current.imports) if (!imp.external) visit(imp.path);
    };
    visit(out);
    if (css.size > 0) routeCss[key] = [...css];
  }
  return { routeCss, islands, metafile };
}

/** Swaps every island placeholder in the server output for its URL. Throws when an island has none. */
export async function replaceIslandPlaceholders(serverOutDir: string, placeholders: Map<string, string>, urlOf: (file: string) => string | undefined): Promise<void> {
  for (const file of await listFiles(serverOutDir)) {
    if (!file.endsWith(".js")) continue;
    const code = await readFile(file, "utf8");
    if (!code.includes("__DEVORA_ISLAND_")) continue;
    const replaced = code.replace(ISLAND_PLACEHOLDER_PATTERN, (placeholder) => {
      const source = placeholders.get(placeholder);
      const url = source ? urlOf(source) : undefined;
      if (!url) throw new Error(`[devora] the client build produced no bundle for island ${source ?? placeholder} — please report this`);
      return url;
    });
    await writeFile(file, replaced);
  }
}

export interface ClientBundleResult {
  /** Entry key → public URL (`/assets/...js`). */
  urls: Map<string, string>;
  metafile: Metafile;
}

export async function buildClientBundle(options: {
  appRoot: string;
  /** Entry key → absolute source file. */
  entries: Record<string, string>;
  outDir: string;
  publicDir?: string;
  logLevel?: "silent" | "warning";
}): Promise<ClientBundleResult> {
  const { appRoot, entries, outDir } = options;
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  if (options.publicDir && existsSync(options.publicDir)) await cp(options.publicDir, outDir, { recursive: true });
  const keys = Object.keys(entries);
  if (keys.length === 0) return { urls: new Map(), metafile: { inputs: {}, outputs: {} } };
  const result = await build({
    absWorkingDir: appRoot,
    entryPoints: keys.map((out) => ({ in: entries[out]!, out })),
    outdir: path.join(outDir, "assets"),
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    minify: true,
    entryNames: "[dir]/[name]-[hash]",
    chunkNames: "[name]-[hash]",
    assetNames: "[name]-[hash]",
    publicPath: "/assets",
    loader: ASSET_LOADERS,
    define: defines(false),
    metafile: true,
    write: true,
    legalComments: "none",
    logLevel: options.logLevel ?? "warning",
    plugins: [sourcePlugin({})],
  });
  const byInput = new Map(Object.entries(entries).map(([key, file]) => [path.resolve(file), key]));
  const urls = new Map<string, string>();
  for (const [out, info] of Object.entries(result.metafile.outputs)) {
    if (!info.entryPoint || !out.endsWith(".js")) continue;
    const key = byInput.get(path.resolve(appRoot, info.entryPoint));
    if (key) urls.set(key, `/${path.relative(outDir, path.resolve(appRoot, out)).replace(/\\/g, "/")}`);
  }
  return { urls, metafile: result.metafile };
}
