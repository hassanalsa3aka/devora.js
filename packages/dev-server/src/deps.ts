/**
 * Dependencies of browser code (react, react-dom, the framework's client, anything an island imports) are bundled once
 * with esbuild into ES modules that live in memory and are served under /_devora/deps/. One build with code splitting, so
 * every dependency shares one copy of react. A CommonJS dependency has no named exports as an ES module, so the importer
 * is rewritten to take them from the default export (clientModules.ts), as Vite's optimizer does.
 */
import { createRequire } from "node:module";
import { computeCacheKey, readCache, resolveCacheRoot, writeCache } from "./depsCache.js";
import { builtinModules } from "node:module";
import { build, type Plugin } from "esbuild";

const ownRequire = createRequire(import.meta.url);

export const DEPS_PREFIX = "/_devora/deps/";
export const depKey = (specifier: string): string => specifier.replace(/[/@]/g, "_");

export interface DepsManager {
  has(specifier: string): boolean;
  isCjs(specifier: string): boolean;
  /** The bundled file (a dependency entry or a shared chunk) by file name. */
  file(name: string): string | undefined;
  /** Adds dependencies and rebuilds when any is new; true when the set changed (clients must reload). */
  add(specifiers: string[]): Promise<boolean>;
  readonly specifiers: string[];
  /** Whether the first set came from the on-disk cache (for the trace and the tests). */
  readonly fromCache: boolean;
}

/**
 * Browser code that reaches a Node builtin through a shared barrel (the core's main entry, say) gets an empty module for
 * it, as in Vite's dev server: nothing breaks until the code actually calls it.
 */
const builtinsAsEmpty: Plugin = {
  name: "devora-node-builtins",
  setup(b) {
    const names = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
    b.onResolve({ filter: /^(node:)?[a-z_/]+$/ }, (args) => (names.has(args.path) ? { path: args.path, namespace: "devora-empty" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "devora-empty" }, (args) => {
      const message = JSON.stringify(`Module "${args.path}" was externalized for browser compatibility and cannot be used in browser code.`);
      return { contents: `module.exports = new Proxy({}, { get(_t, key) { if (key === "__esModule" || key === "then") return undefined; throw new Error(${message}); } });`, loader: "js" };
    });
  },
};

async function bundle(specifiers: string[], appRoot: string) {
  const entries: Record<string, string> = {};
  for (const s of specifiers) entries[depKey(s)] = s;
  const result = await build({
    absWorkingDir: appRoot,
    entryPoints: entries,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outdir: "deps",
    entryNames: "[name]",
    chunkNames: "chunk-[hash]",
    write: false,
    metafile: true,
    logLevel: "silent",
    plugins: [builtinsAsEmpty],
    // The refresh runtime is the framework's own dependency, not something every app installs.
    alias: { "react-refresh/runtime": ownRequire.resolve("react-refresh/runtime") },
    define: { "process.env.NODE_ENV": '"development"' },
  });
  const files = new Map<string, string>();
  for (const f of result.outputFiles) files.set(f.path.split(/[\\/]/).pop()!, f.text);
  const cjs = new Set<string>();
  for (const [out, meta] of Object.entries(result.metafile.outputs)) {
    if (!meta.entryPoint) continue;
    const key = out.split("/").pop()!.replace(/\.js$/, "");
    const spec = specifiers.find((s) => depKey(s) === key);
    if (spec && result.metafile.inputs[meta.entryPoint]?.format === "cjs") cjs.add(spec);
  }
  return { files, cjs };
}

export async function createDepsManager(appRoot: string, initial: string[], options: { cache?: boolean } = {}): Promise<DepsManager> {
  let specifiers = [...new Set(initial)];
  let state = { files: new Map<string, string>(), cjs: new Set<string>() };
  let fromCache = false;
  const cacheRoot = options.cache === false ? undefined : await resolveCacheRoot(appRoot);
  const rebuild = async (useCache: boolean) => {
    let key: string | undefined;
    if (cacheRoot) {
      try {
        key = await computeCacheKey(appRoot, specifiers);
        if (useCache) {
          const hit = await readCache(cacheRoot, key, specifiers);
          if (hit) {
            state = hit;
            fromCache = true;
            return;
          }
        }
      } catch {
        key = undefined; // an unreadable tree is not cached
      }
    }
    fromCache = false;
    try {
      state = await bundle(specifiers, appRoot);
    } catch (error) {
      // Name the dependency that cannot be bundled, instead of esbuild's list of every failure.
      for (const s of specifiers) {
        try {
          await bundle([s], appRoot);
        } catch (one) {
          throw new Error(`[devora dev-server] cannot pre-bundle the dependency "${s}": ${(one as Error).message}`);
        }
      }
      throw error;
    }
    if (cacheRoot && key) await writeCache(cacheRoot, key, specifiers, state);
  };
  await rebuild(true);
  return {
    has: (s) => specifiers.includes(s),
    isCjs: (s) => state.cjs.has(s),
    file: (name) => state.files.get(name),
    async add(more) {
      const fresh = more.filter((s) => !specifiers.includes(s));
      if (fresh.length === 0) return false;
      specifiers = [...specifiers, ...fresh];
      await rebuild(true);
      return true;
    },
    get specifiers() {
      return specifiers;
    },
    get fromCache() {
      return fromCache;
    },
  };
}
