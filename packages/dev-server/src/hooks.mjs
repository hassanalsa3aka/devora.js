// The server side of the experimental dev server: pages and API routes run in this process, and their modules are loaded by
// synchronous in-thread module hooks (module.registerHooks, Node 22.15+): no worker thread and no message round trip per module.
// For modules reached from an app route, the hooks:
//  - resolve extensionless and `.js`-for-`.ts` imports;
//  - give each module of the app (not node_modules) its own URL, `devora-src://<file>.devora-module?devora=<app>.<version>`,
//    and resolve an import to the importee's CURRENT version. Editing a file gives it, and every module that imports it
//    (directly or not), a new version: only those are executed again; everything else keeps its instance, as in Vite;
//  - own the loading of TypeScript and JSX files, so no other loader (the CLI may itself run under one) compiles them first:
//    esbuild transforms them (no bundling), island URLs are added, `.css` becomes an empty module, an image or font import
//    its URL;
//  - record who imports whom, for the invalidation above and for the dispose callbacks.
// Nothing from a request reaches this file: it only sees the specifiers the app's own code imports.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformSync } from "esbuild";
import { ASSET_EXT, CSS_EXT, applyEdits, islandEditsSync, parseModule, resolveFileSync, splitSourceMap, urlForFile } from "./core.mjs";

const SCHEME = "devora-src:";
// A name no other loader recognises as TypeScript or JSX, so that none of them tries to compile the file first.
const SUFFIX = ".devora-module";
const LOADERS = { ".tsx": "tsx", ".ts": "ts", ".mts": "ts", ".cts": "ts", ".jsx": "jsx", ".js": "js", ".mjs": "js" };
const inNodeModules = (file) => file.includes(`${path.sep}node_modules${path.sep}`);

function queryOf(url) {
  const i = typeof url === "string" ? url.indexOf("?") : -1;
  return i === -1 ? "" : url.slice(i + 1).split("#")[0];
}
function epochOf(url) {
  const match = /(?:^|&)devora=([^&]*)/.exec(queryOf(url));
  return match ? match[1] : undefined;
}
/** The file behind a `file:` or `devora-src:` URL. */
function fileOf(url) {
  const clean = url.split("?")[0].split("#")[0];
  return fileURLToPath(clean.startsWith(SCHEME) ? `file://${clean.slice(SCHEME.length + 2, -SUFFIX.length)}` : clean);
}
const srcUrl = (file, epoch) => `${SCHEME}//${pathToFileURL(file).pathname}${SUFFIX}?devora=${epoch}`;

/**
 * `frozen`: folders of the framework's own packages (never versioned; loaded once). Returns the hooks to register and the
 * graph operations the host needs.
 */
export function createServerHooks({ projectRoot, frozen = [] }) {
  const apps = new Map(); // app id -> { roots, versions, outgoing and importers (the import graph), loaded (files that have been loaded), unresolved (modules with an import that did not resolve) }
  let counter = 0;
  // Compiled output by file, kept across versions: an edit recompiles only the files that changed.
  const compiled = new Map();

  const isFrameworkSource = (file) => !inNodeModules(file) && frozen.some((dir) => file === dir || file.startsWith(dir + path.sep));
  const isVersioned = (file) => !!projectRoot && !inNodeModules(file) && file.startsWith(projectRoot + path.sep) && !isFrameworkSource(file);
  const appOf = (url) => {
    const epoch = epochOf(url);
    return epoch && epoch !== "fw" ? apps.get(epoch.split(".")[0]) : undefined;
  };
  const rootsOf = (url) => appOf(url)?.roots ?? [];
  const versionOf = (app, file) => app.versions.get(file) ?? 0;

  function recordEdge(app, parent, child) {
    let out = app.outgoing.get(parent);
    if (!out) app.outgoing.set(parent, (out = new Set()));
    out.add(child);
    let inn = app.importers.get(child);
    if (!inn) app.importers.set(child, (inn = new Set()));
    inn.add(parent);
  }
  /** A module is about to run again: what it imported last time is forgotten; its imports are recorded as they resolve. */
  function forgetEdges(app, file) {
    for (const child of app.outgoing.get(file) ?? []) app.importers.get(child)?.delete(file);
    app.outgoing.delete(file);
  }

  return {
    hooks: {
      resolve(specifier, context, nextResolve) {
        if (specifier.startsWith(SCHEME)) return { url: specifier, shortCircuit: true }; // an entry the host names
        const parent = context.parentURL;
        const epoch = epochOf(parent);
        if (!epoch) return nextResolve(specifier, context); // not reached from an app route: the default
        const parentFile = fileOf(parent);
        const app = appOf(parent);
        const relative = specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
        let file;
        if (relative) file = resolveFileSync(path.resolve(path.dirname(parentFile), specifier.split("?")[0]));
        if (relative && file === undefined) app?.unresolved.add(parentFile); // cleared again when the module runs and everything resolves
        if (file === undefined) {
          // A bare specifier, a `node:` builtin or a `file:` URL: the default resolver, as seen from a real file.
          let next;
          try {
            next = nextResolve(specifier, { ...context, parentURL: pathToFileURL(parentFile).href });
          } catch (error) {
            // Remember who was waiting for this: when a file appears, those modules must run again.
            app?.unresolved.add(parentFile);
            throw error;
          }
          if (!next.url.startsWith("file:")) return next;
          file = fileURLToPath(next.url);
        }
        if (app && isVersioned(file)) {
          recordEdge(app, parentFile, file);
          return { url: srcUrl(file, `${epoch.split(".")[0]}.${versionOf(app, file)}`), shortCircuit: true };
        }
        if (!inNodeModules(file) && /\.(tsx|ts|jsx|mts|cts)$/.test(file)) {
          // TypeScript source that is not part of the app and not an installed package: the framework's own source in a
          // checkout of the repository, or a linked workspace package. One instance for all apps, compiled by these hooks.
          return { url: srcUrl(file, "fw"), shortCircuit: true };
        }
        return { url: pathToFileURL(file).href, shortCircuit: true };
      },

      load(url, context, nextLoad) {
        if (!url.startsWith(SCHEME)) return nextLoad(url, context);
        const file = fileOf(url);
        const ext = path.extname(file).toLowerCase();
        const app = appOf(url);
        const versioned = !!app && isVersioned(file);
        if (versioned) {
          forgetEdges(app, file);
          app.loaded.add(file);
          app.unresolved.delete(file);
        }
        if (CSS_EXT.test(file)) return { format: "module", source: "export default undefined;\n", shortCircuit: true };
        if (ASSET_EXT.test(file)) return { format: "module", source: `export default ${JSON.stringify(urlForFile(file, rootsOf(url)) ?? "")};\n`, shortCircuit: true };
        if (ext === ".json") return { format: "module", source: `export default ${readFileSync(file, "utf8")};\n`, shortCircuit: true };
        const info = statSync(file);
        const key = `${info.size}:${info.mtimeMs}:${versioned}`;
        const hit = compiled.get(file);
        if (hit?.key === key) return { format: "module", source: hit.code, shortCircuit: true };
        const source = readFileSync(file, "utf8");
        let code;
        try {
          code = transformSync(source, {
            loader: LOADERS[ext] ?? "js",
            format: "esm",
            jsx: "automatic",
            target: "es2022",
            sourcemap: "inline",
            sourcefile: file,
            // The module's URL is not a file URL here, so code that reads its own location gets the real one.
            define: { "import.meta.url": JSON.stringify(pathToFileURL(file).href), "import.meta.dirname": JSON.stringify(path.dirname(file)), "import.meta.filename": JSON.stringify(file) },
          }).code;
        } catch (error) {
          throw new Error(`[devora dev-server] cannot transform ${file}: ${error.message}`);
        }
        if (versioned && code.includes("island")) {
          const { code: body, map } = splitSourceMap(code);
          const edits = islandEditsSync(
            parseModule(body),
            (spec) => (spec.startsWith(".") ? resolveFileSync(path.resolve(path.dirname(file), spec)) : undefined),
            (f) => urlForFile(f, rootsOf(url))
          );
          code = applyEdits(body, edits) + map;
        }
        compiled.set(file, { key, code });
        return { format: "module", source: code, shortCircuit: true };
      },
    },

    addApp(id, roots) {
      apps.set(id, { roots, versions: new Map(), outgoing: new Map(), importers: new Map(), loaded: new Set(), unresolved: new Set() });
    },

    /** The URL to import to get this file's current version, for an app. */
    entryUrl(id, file) {
      const app = apps.get(id);
      return srcUrl(file, `${id}.${app ? versionOf(app, file) : 0}`);
    },

    /**
     * A file changed. It and every module that imports it (transitively, cycles included) get a new version, so the next
     * import runs them again and nothing else. A file the server never loaded, or one that no longer exists (deleted,
     * renamed), can change what an import resolves to anywhere, so every module of the app is run again.
     * Returns the files whose modules will run again.
     */
    invalidate(id, file) {
      const app = apps.get(id);
      if (!app) return [file];
      let exists = true;
      try {
        statSync(file);
      } catch {
        exists = false;
      }
      const known = app.loaded.has(file);
      const affected = new Set([file]);
      if (!exists || !known) {
        for (const f of app.loaded) affected.add(f);
      } else {
        const queue = [file];
        while (queue.length > 0) {
          for (const parent of app.importers.get(queue.pop()) ?? []) {
            if (!affected.has(parent)) {
              affected.add(parent);
              queue.push(parent);
            }
          }
        }
      }
      // Modules that last failed to resolve an import may succeed now (the file came back or appeared).
      for (const f of app.unresolved) affected.add(f);
      app.unresolved.clear();
      for (const f of affected) app.versions.set(f, ++counter);
      return [...affected];
    },

    /** Every app module that has been loaded (for the tests and the trace). */
    loaded(id) {
      const app = apps.get(id);
      return app ? [...app.loaded] : [];
    },
  };
}
