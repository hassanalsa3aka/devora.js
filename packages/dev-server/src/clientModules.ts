/**
 * What the browser gets for an app file: esbuild's output (TSX/TS/JSX to ES modules, no bundling) with every import
 * rewritten to a URL the server serves (never an absolute path), island URLs added, React Fast Refresh registration
 * around components, and an `import.meta.hot` object. The import graph recorded here decides, when a file changes,
 * between a Fast Refresh update and a full reload.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";
import { CSS_EXT, ASSET_EXT, applyEdits, instrumentRefresh, islandEdits, listImports, parseModule, resolveFile, splitSourceMap, urlForFile } from "./core.mjs";
import type { UrlRoot } from "./core.mjs";
import { DEPS_PREFIX, depKey, type DepsManager } from "./deps.js";

const LOADERS: Record<string, "tsx" | "ts" | "jsx" | "js"> = { ".tsx": "tsx", ".ts": "ts", ".jsx": "jsx", ".js": "js", ".mjs": "js" };
const ENV = JSON.stringify({ MODE: "development", DEV: true, PROD: false, SSR: false, BASE_URL: "/" });

export interface ClientModule {
  code: string;
  isBoundary: boolean;
  /** Absolute files this module imports (scripts, styles, assets). */
  imports: string[];
  /** Bare specifiers this module imports (dependencies it needs bundled). */
  bare: string[];
}

export interface ClientModules {
  load(file: string): Promise<ClientModule>;
  urlOf(file: string): string | undefined;
  /** True once the server has served this file to a browser (transforming it to decide what a change means does not count). */
  wasLoaded(file: string): boolean;
  markServed(file: string): void;
  importersOf(file: string): string[];
  isBoundary(file: string): boolean;
  invalidate(file: string): void;
  /** Bare specifiers seen in browser modules. */
  readonly bareImports: Set<string>;
}

export function createClientModules(options: { roots: UrlRoot[]; deps: () => DepsManager | undefined; onNewDependency?: (specifier: string) => void }): ClientModules {
  const cache = new Map<string, { key: string; module: ClientModule }>();
  const served = new Set<string>();
  const importers = new Map<string, Set<string>>();
  const bareImports = new Set<string>();
  const urlOf = (file: string) => urlForFile(file, options.roots);

  async function load(file: string): Promise<ClientModule> {
    const info = await stat(file);
    const key = `${info.size}:${info.mtimeMs}`;
    const hit = cache.get(file);
    if (hit?.key === key) return hit.module;
    const ext = path.extname(file).toLowerCase();
    const url = urlOf(file) ?? "/_devora/m/unknown";
    const source = await readFile(file, "utf8");
    const out = await transform(source, {
      loader: LOADERS[ext] ?? "js",
      format: "esm",
      jsx: "automatic",
      target: "es2022",
      sourcemap: "inline",
      // The URL, not the path: nothing in what the browser gets names a folder of the developer's machine.
      sourcefile: url,
      define: { "process.env.NODE_ENV": '"development"', "import.meta.env": ENV },
    });
    const { code: body, map } = splitSourceMap(out.code);
    const program = parseModule(body);
    const edits: { start: number; end: number; text: string }[] = [];
    const imports: string[] = [];
    const bare: string[] = [];
    const dir = path.dirname(file);
    const deps = options.deps();

    for (const ref of listImports(program)) {
      const spec = ref.specifier;
      let target: string | undefined;
      if (spec.startsWith("./") || spec.startsWith("../")) {
        const resolved = await resolveFile(path.resolve(dir, spec.split("?")[0]!));
        if (!resolved) continue; // the browser reports the missing file itself
        imports.push(resolved);
        const u = urlOf(resolved);
        target = u === undefined ? "/_devora/m/outside-the-served-folders" : CSS_EXT.test(resolved) || ASSET_EXT.test(resolved) || resolved.endsWith(".json") ? `${u}?import` : u;
      } else if (!spec.startsWith("/") && !spec.startsWith("data:") && !spec.startsWith("http:") && !spec.startsWith("https:") && !spec.startsWith("node:")) {
        bareImports.add(spec);
        bare.push(spec);
        if (deps && !deps.has(spec)) options.onNewDependency?.(spec);
        target = `${DEPS_PREFIX}${depKey(spec)}.js`;
      }
      if (target !== undefined) edits.push({ start: ref.start, end: ref.end, text: JSON.stringify(target) });
    }

    // CommonJS dependencies: named imports come from the default export.
    let interop = 0;
    for (const node of program.body as any[]) {
      if (node.type !== "ImportDeclaration" || typeof node.source.value !== "string") continue;
      const spec: string = node.source.value;
      if (!deps?.isCjs(spec) || node.specifiers.length === 0) continue;
      const named = node.specifiers.filter((s: any) => s.type === "ImportSpecifier");
      const ns = node.specifiers.find((s: any) => s.type === "ImportNamespaceSpecifier");
      const def = node.specifiers.find((s: any) => s.type === "ImportDefaultSpecifier");
      if (named.length === 0 && !ns) continue; // a default import already works
      const id = `__d${++interop}`;
      const target = JSON.stringify(`${DEPS_PREFIX}${depKey(spec)}.js`);
      let text = `import ${id} from ${target};`;
      if (def) text += `const ${def.local.name} = ${id};`;
      if (ns) text += `const ${ns.local.name} = ${id};`;
      if (named.length > 0) text += `const { ${named.map((s: any) => (s.imported.name ?? s.imported.value) === s.local.name ? s.local.name : `${s.imported.name ?? s.imported.value}: ${s.local.name}`).join(", ")} } = ${id};`;
      // replaces the whole declaration, so drop the source-literal edit made above for it
      const i = edits.findIndex((e) => e.start === node.source.start);
      if (i !== -1) edits.splice(i, 1);
      edits.push({ start: node.start, end: node.end, text });
    }

    if (body.includes("island")) {
      edits.push(
        ...(await islandEdits(
          program,
          async (spec) => (spec.startsWith(".") ? resolveFile(path.resolve(dir, spec)) : undefined),
          urlOf
        ))
      );
    }
    const refresh = ext === ".tsx" || ext === ".jsx" ? instrumentRefresh(body, program) : { edits: [], head: "", tail: "", components: [] as string[], isBoundary: false };
    edits.push(...refresh.edits);

    let head = "";
    let tail = "";
    const usesHot = body.includes("import.meta.hot");
    if (usesHot || refresh.components.length > 0) {
      head += `import { createHotContext as __ch } from "/_devora/hmr-client.js"; const __devoraHot = __ch(${JSON.stringify(url)}); `;
    }
    if (refresh.components.length > 0) {
      head += `import __RR from "${DEPS_PREFIX}${depKey("react-refresh/runtime")}.js"; const __pr = window.$RefreshReg$, __ps = window.$RefreshSig$; window.$RefreshReg$ = (t, i) => __RR.register(t, ${JSON.stringify(url)} + " " + i); window.$RefreshSig$ = __RR.createSignatureFunctionForTransform; `;
      head += refresh.head;
      tail += refresh.tail + `window.$RefreshReg$ = __pr; window.$RefreshSig$ = __ps;\n`;
      if (refresh.isBoundary) tail += "__devoraHot.accept();\n";
    }
    let code = applyEdits(body, edits);
    if (usesHot) code = code.replaceAll("import.meta.hot", "__devoraHot");
    code = head + code + tail + map;

    const module: ClientModule = { code, isBoundary: refresh.isBoundary, imports, bare };
    cache.set(file, { key, module });
    for (const imported of imports) {
      let set = importers.get(imported);
      if (!set) importers.set(imported, (set = new Set()));
      set.add(file);
    }
    return module;
  }

  return {
    load,
    urlOf,
    wasLoaded: (file) => served.has(file),
    markServed: (file) => void served.add(file),
    importersOf: (file) => [...(importers.get(file) ?? [])],
    isBoundary: (file) => cache.get(file)?.module.isBoundary ?? false,
    invalidate(file) {
      cache.delete(file);
    },
    bareImports,
  };
}
