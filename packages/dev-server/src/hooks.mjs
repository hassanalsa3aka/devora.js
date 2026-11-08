// Node module-loader hooks for the experimental dev server's SERVER side (pages and API routes run in this process).
// Registered once with module.register(). What they do, for modules reached from an app route (an import whose parent
// carries a `?devora=` query):
//  - resolve extensionless and `.js`-for-`.ts` imports;
//  - give every module of the app (not node_modules, not the framework's own packages) a `?devora=<app>.<n>` query that
//    it passes on to its imports, so bumping n re-executes the whole app graph on the next import (no stale module);
//  - own the loading of TypeScript and JSX files: they get the URL scheme `devora-src:` so that no other loader (the CLI
//    may itself run under one) compiles them first; esbuild transforms them (no bundling), island URLs are added, `.css`
//    becomes an empty module and an image or font import its URL;
//  - report import edges to the main thread (for disposing changed modules).
// Nothing from a request reaches this file: it only sees the specifiers the app's own code imports.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform } from "esbuild";
import { ASSET_EXT, CSS_EXT, applyEdits, islandEdits, parseModule, resolveFile, splitSourceMap, urlForFile } from "./core.mjs";

const SCHEME = "devora-src:";
// A name no other loader recognises as TypeScript or JSX, so that none of them tries to compile the file first.
const SUFFIX = ".devora-module";

let config = { projectRoot: "", frozen: [], roots: {} };
let port;

export function initialize(data) {
  config = { projectRoot: data.projectRoot, frozen: data.frozen ?? [], roots: {} };
  port = data.port;
  // The main thread tells this thread about each app (its URL roots) over the port, and waits for the pong.
  port.on("message", (message) => {
    if (message.app) config.roots[message.app.id] = message.app.roots;
    if (message.ping) port.postMessage({ pong: message.ping });
  });
}

const inNodeModules = (file) => file.includes(`${path.sep}node_modules${path.sep}`);

function isFrameworkSource(file) {
  return !inNodeModules(file) && config.frozen.some((dir) => file === dir || file.startsWith(dir + path.sep));
}

function isVersioned(file) {
  if (!config.projectRoot || inNodeModules(file)) return false;
  if (!file.startsWith(config.projectRoot + path.sep)) return false;
  return !isFrameworkSource(file);
}

function queryOf(url) {
  const i = typeof url === "string" ? url.indexOf("?") : -1;
  return i === -1 ? "" : url.slice(i + 1).split("#")[0];
}

function epochOf(url) {
  const match = /(?:^|&)devora=([^&]*)/.exec(queryOf(url));
  return match ? match[1] : undefined;
}

/** The URL roots of the app a module belongs to (the app id is the first part of its `?devora=` value). */
function rootsOf(url) {
  const epoch = epochOf(url);
  return config.roots[epoch ? epoch.split(".")[0] : ""] ?? [];
}

/** The file behind a `file:` or `devora-src:` URL. */
function fileOf(url) {
  const clean = url.split("?")[0].split("#")[0];
  return fileURLToPath(clean.startsWith(SCHEME) ? `file://${clean.slice(SCHEME.length + 2, -SUFFIX.length)}` : clean);
}

function srcUrl(file, epoch) {
  return `${SCHEME}//${pathToFileURL(file).pathname}${SUFFIX}?devora=${epoch}`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(SCHEME)) return { url: specifier, shortCircuit: true }; // an entry the main thread names
  const parent = context.parentURL;
  const epoch = epochOf(parent);
  if (!epoch) return nextResolve(specifier, context); // not reached from an app route: leave it to the default

  const parentFile = fileOf(parent);
  const relative = specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
  let file;
  if (relative) file = await resolveFile(path.resolve(path.dirname(parentFile), specifier.split("?")[0]));
  if (file === undefined) {
    // A bare specifier, a `node:` builtin or a `file:` URL: the default resolver, as seen from a real file.
    const next = await nextResolve(specifier, { ...context, parentURL: pathToFileURL(parentFile).href });
    if (!next.url.startsWith("file:")) return next;
    file = fileURLToPath(next.url);
  }
  if (isVersioned(file)) {
    if (port) port.postMessage({ edge: [parentFile, file] });
    return { url: srcUrl(file, epoch), shortCircuit: true };
  }
  if (!inNodeModules(file) && /\.(tsx|ts|jsx|mts|cts)$/.test(file)) {
    // TypeScript source that is not part of the app and not an installed package: the framework's own source in a
    // checkout of the repository, or a linked workspace package. One instance for all apps, compiled by these hooks.
    // Installed packages are compiled JavaScript and stay with the default loader.
    return { url: srcUrl(file, "fw"), shortCircuit: true };
  }
  return { url: pathToFileURL(file).href, shortCircuit: true };
}

const LOADERS = { ".tsx": "tsx", ".ts": "ts", ".mts": "ts", ".cts": "ts", ".jsx": "jsx", ".js": "js", ".mjs": "js" };

export async function load(url, context, nextLoad) {
  if (!url.startsWith(SCHEME)) return nextLoad(url, context);
  const file = fileOf(url);
  const ext = path.extname(file).toLowerCase();
  const versioned = isVersioned(file);
  if (CSS_EXT.test(file)) return { format: "module", source: "export default undefined;\n", shortCircuit: true };
  if (ASSET_EXT.test(file)) {
    return { format: "module", source: `export default ${JSON.stringify(urlForFile(file, rootsOf(url)) ?? "")};\n`, shortCircuit: true };
  }
  if (ext === ".json") return { format: "module", source: `export default ${await readFile(file, "utf8")};\n`, shortCircuit: true };
  const source = await readFile(file, "utf8");
  let code;
  try {
    const out = await transform(source, {
      loader: LOADERS[ext] ?? "js",
      format: "esm",
      jsx: "automatic",
      target: "es2022",
      sourcemap: "inline",
      sourcefile: file,
      // The module's URL is not a file URL here, so code that reads its own location gets the real one.
      define: { "import.meta.url": JSON.stringify(pathToFileURL(file).href), "import.meta.dirname": JSON.stringify(path.dirname(file)), "import.meta.filename": JSON.stringify(file) },
    });
    code = out.code;
  } catch (error) {
    throw new Error(`[devora dev-server] cannot transform ${file}: ${error.message}`);
  }
  if (versioned && code.includes("island")) {
    const { code: body, map } = splitSourceMap(code);
    const edits = await islandEdits(
      parseModule(body),
      async (spec) => (spec.startsWith(".") ? resolveFile(path.resolve(path.dirname(file), spec)) : undefined),
      (f) => urlForFile(f, rootsOf(url))
    );
    code = applyEdits(body, edits) + map;
  }
  return { format: "module", source: code, shortCircuit: true };
}
