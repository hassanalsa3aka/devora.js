// Plain JavaScript on purpose: the Node loader hooks (hooks.mjs) run in their own thread and import this file by
// path, and the TypeScript side imports it too, so server modules and browser modules go through one parser and
// one set of rules. Nothing here evaluates code: it reads source text, parses it (acorn) and edits ranges.
import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "acorn";

export const MODULE_PREFIX = "/_devora/m/";
export const DEPS_PREFIX = "/_devora/deps/";
export const CSS_EXT = /\.css$/;
export const ASSET_EXT = /\.(svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf|txt)$/i;
export const SCRIPT_EXT = /\.(tsx|ts|jsx|js|mjs)$/;
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"];

export const UNSUPPORTED_ISLAND_CALL_MESSAGE =
  '[devora] island() must be called as island(() => import("./Component")) — with a literal path, so the ' +
  "build knows which file to ship to the browser. Wrap a computed or shared loader in that form at the call site.";

export function parseModule(code) {
  return parse(code, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true, allowAwaitOutsideFunction: true });
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

/** The file a path means: exact, with an extension added, as a folder index, or a `.js` import of a `.ts` file. */
export async function resolveFile(abs) {
  const candidates = [abs];
  const m = /\.(m?js|jsx)$/.exec(abs);
  if (m) candidates.push(abs.slice(0, -m[0].length) + ".ts", abs.slice(0, -m[0].length) + ".tsx");
  for (const c of candidates) if (await isFile(c)) return c;
  for (const ext of EXTENSIONS) if (await isFile(abs + ext)) return abs + ext;
  for (const ext of EXTENSIONS) if (await isFile(path.join(abs, "index" + ext))) return path.join(abs, "index" + ext);
  return undefined;
}

function isFileSync(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** The same lookup as resolveFile(), synchronously (the in-thread module hooks cannot wait). */
export function resolveFileSync(abs) {
  const candidates = [abs];
  const m = /\.(m?js|jsx)$/.exec(abs);
  if (m) candidates.push(abs.slice(0, -m[0].length) + ".ts", abs.slice(0, -m[0].length) + ".tsx");
  for (const c of candidates) if (isFileSync(c)) return c;
  for (const ext of EXTENSIONS) if (isFileSync(abs + ext)) return abs + ext;
  for (const ext of EXTENSIONS) if (isFileSync(path.join(abs, "index" + ext))) return path.join(abs, "index" + ext);
  return undefined;
}

/** `roots` is [{ prefix, dir }]: the URL of a file under one of them, longest folder first; undefined outside all. */
export function urlForFile(file, roots) {
  let best;
  for (const r of roots) {
    const dir = r.dir.endsWith(path.sep) ? r.dir : r.dir + path.sep;
    if (file.startsWith(dir) && (!best || dir.length > best.dir.length)) best = { dir, prefix: r.prefix };
  }
  if (!best) return undefined;
  return best.prefix + file.slice(best.dir.length).split(path.sep).map(encodeURIComponent).join("/");
}

function isNode(v) {
  return typeof v === "object" && v !== null && typeof v.type === "string";
}

function walk(node, visit) {
  visit(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) if (isNode(item)) walk(item, visit);
    } else if (isNode(child)) {
      walk(child, visit);
    }
  }
}

const CORE_MODULES = new Set(["@devorajs/core", "@devorajs/core/client"]);

/** The same rule as packages/cli/src/build/islandCalls.ts: `island(() => import("./X"))`, `island` from the core. */
export function findIslandCalls(program) {
  const localNames = new Set();
  const namespaces = new Set();
  for (const statement of program.body ?? []) {
    if (statement.type !== "ImportDeclaration") continue;
    const source = statement.source.value;
    if (typeof source !== "string" || !CORE_MODULES.has(source)) continue;
    for (const spec of statement.specifiers) {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.imported;
        const importedName = imported.type === "Identifier" ? imported.name : imported.value;
        if (importedName === "island") localNames.add(spec.local.name);
      } else if (spec.type === "ImportNamespaceSpecifier") {
        namespaces.add(spec.local.name);
      }
    }
  }
  const supported = [];
  const unsupported = [];
  if (localNames.size === 0 && namespaces.size === 0) return { supported, unsupported };
  walk(program, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee;
    const isIsland =
      (callee.type === "Identifier" && localNames.has(callee.name)) ||
      (callee.type === "MemberExpression" && !callee.computed && callee.object.type === "Identifier" && namespaces.has(callee.object.name) && callee.property.name === "island");
    if (!isIsland) return;
    const args = node.arguments;
    const loader = args[0];
    const specifier = loader ? literalImportSpecifier(loader) : undefined;
    if (specifier === undefined) {
      unsupported.push({ start: node.start });
      return;
    }
    supported.push({ start: node.start, specifier, insertAt: loader.end, alreadyResolved: args.length > 1 });
  });
  return { supported, unsupported };
}

function literalImportSpecifier(loader) {
  if (loader.type !== "ArrowFunctionExpression" || loader.params.length !== 0) return undefined;
  const body = loader.body;
  if (body.type !== "ImportExpression") return undefined;
  const source = body.source;
  if (source.type === "Literal" && typeof source.value === "string") return source.value;
  if (source.type === "TemplateLiteral" && source.expressions.length === 0) {
    const cooked = source.quasis[0]?.value?.cooked;
    return typeof cooked === "string" ? cooked : undefined;
  }
  return undefined;
}

/** Applies [{ start, end, text }] edits (non-overlapping) from the end, so offsets stay valid. */
export function applyEdits(code, edits) {
  let out = code;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/**
 * Edits that add the browser URL as the second argument of every `island(() => import("./X"))`. `resolveSpecifier(spec)`
 * gives the absolute file (or undefined). An unsupported call shape throws, as it does in `devora dev` and `devora build`.
 */
export async function islandEdits(program, resolveSpecifier, urlOf) {
  const { supported, unsupported } = findIslandCalls(program);
  if (unsupported.length > 0) throw new Error(UNSUPPORTED_ISLAND_CALL_MESSAGE);
  const edits = [];
  for (const call of supported) {
    if (call.alreadyResolved) continue;
    const file = await resolveSpecifier(call.specifier);
    const url = file ? urlOf(file) : undefined;
    if (url) edits.push({ start: call.insertAt, end: call.insertAt, text: `, ${JSON.stringify(url)}` });
  }
  return edits;
}

/** islandEdits() with a synchronous resolver. */
export function islandEditsSync(program, resolveSpecifier, urlOf) {
  const { supported, unsupported } = findIslandCalls(program);
  if (unsupported.length > 0) throw new Error(UNSUPPORTED_ISLAND_CALL_MESSAGE);
  const edits = [];
  for (const call of supported) {
    if (call.alreadyResolved) continue;
    const file = resolveSpecifier(call.specifier);
    const url = file ? urlOf(file) : undefined;
    if (url) edits.push({ start: call.insertAt, end: call.insertAt, text: `, ${JSON.stringify(url)}` });
  }
  return edits;
}

/** Every static import, re-export and literal dynamic import: [{ start, end, specifier }] of the string literal. */
export function listImports(program) {
  const out = [];
  walk(program, (node) => {
    if ((node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration" || node.type === "ExportNamedDeclaration") && node.source) {
      out.push({ start: node.source.start, end: node.source.end, specifier: node.source.value });
    } else if (node.type === "ImportExpression" && node.source.type === "Literal" && typeof node.source.value === "string") {
      out.push({ start: node.source.start, end: node.source.end, specifier: node.source.value });
    }
  });
  return out;
}

const isComponentName = (name) => typeof name === "string" && /^[A-Z]/.test(name);

/** Hook calls made directly in a function body (not in nested functions). */
function hookCalls(fnNode, code) {
  const keys = [];
  const visit = (node) => {
    if (node !== fnNode && /Function/.test(node.type)) return;
    if (node.type === "CallExpression") {
      const c = node.callee;
      const name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" && !c.computed ? c.property.name : undefined;
      if (typeof name === "string" && /^use[A-Z0-9]/.test(name)) {
        const calleeText = code.slice(c.start, c.end);
        const withArgs = name === "useState" || name === "useReducer";
        keys.push(withArgs ? code.slice(node.start, node.end) : calleeText);
      }
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) if (isNode(item)) visit(item);
      } else if (isNode(child)) {
        visit(child);
      }
    }
  };
  visit(fnNode);
  return keys;
}

/**
 * React Fast Refresh on esbuild's output (plain JS): registers every top-level component (a capitalised function or a
 * capitalised const holding a function, `memo(...)` or `forwardRef(...)`), and gives each one that calls hooks a signature
 * so that changing its hooks resets its state instead of breaking it. Returns { edits, head, tail, components, isBoundary }; a module is
 * a refresh boundary when it has components and every export is one.
 */
export function instrumentRefresh(code, program) {
  const components = [];
  const edits = [];
  let sigCount = 0;
  const sigDecls = [];
  const exportsAll = [];
  const consider = (name, fn, declEnd) => {
    components.push(name);
    if (!fn || !/Function/.test(fn.type)) return;
    const keys = hookCalls(fn, code);
    if (keys.length === 0 || fn.body.type !== "BlockStatement") return;
    const id = `_s${++sigCount}`;
    sigDecls.push(`var ${id} = $RefreshSig$();`);
    edits.push({ start: fn.body.start + 1, end: fn.body.start + 1, text: `${id}();` });
    edits.push({ start: declEnd, end: declEnd, text: `\n${id}(${name}, ${JSON.stringify(keys.join("\n"))}, false);` });
  };
  const handleDecl = (decl, exported) => {
    if (decl.type === "FunctionDeclaration" && decl.id) {
      if (exported) exportsAll.push(decl.id.name);
      if (isComponentName(decl.id.name)) consider(decl.id.name, decl, decl.end);
    } else if (decl.type === "VariableDeclaration") {
      for (const d of decl.declarations) {
        if (d.id.type !== "Identifier") {
          if (exported) exportsAll.push("?");
          continue;
        }
        if (exported) exportsAll.push(d.id.name);
        if (!isComponentName(d.id.name) || !d.init) continue;
        let fn;
        let wrapped = false;
        if (/Function/.test(d.init.type)) fn = d.init;
        else if (d.init.type === "CallExpression") {
          const callee = d.init.callee;
          const cn = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" ? callee.property.name : "";
          if (cn === "memo" || cn === "forwardRef") {
            wrapped = true;
            fn = d.init.arguments[0];
          } else continue;
        } else continue;
        if (wrapped) components.push(d.id.name);
        else consider(d.id.name, fn, decl.end);
        if (wrapped && fn && /Function/.test(fn.type) && fn.body.type === "BlockStatement") {
          const keys = hookCalls(fn, code);
          if (keys.length > 0) {
            const id = `_s${++sigCount}`;
            sigDecls.push(`var ${id} = $RefreshSig$();`);
            edits.push({ start: fn.body.start + 1, end: fn.body.start + 1, text: `${id}();` });
            edits.push({ start: decl.end, end: decl.end, text: `\n${id}(${d.id.name}, ${JSON.stringify(keys.join("\n"))}, false);` });
          }
        }
      }
    } else if (decl.type === "ClassDeclaration" && decl.id && exported) {
      exportsAll.push(decl.id.name);
    }
  };
  for (const statement of program.body) {
    if (statement.type === "ExportNamedDeclaration") {
      if (statement.declaration) handleDecl(statement.declaration, true);
      else for (const s of statement.specifiers) exportsAll.push(statement.source ? "?" : s.local.name);
    } else if (statement.type === "ExportDefaultDeclaration") {
      const d = statement.declaration;
      if (d.type === "FunctionDeclaration" && d.id) {
        exportsAll.push(d.id.name);
        if (isComponentName(d.id.name)) consider(d.id.name, d, d.end);
      } else if (d.type === "Identifier") exportsAll.push(d.name);
      else exportsAll.push("default?");
    } else handleDecl(statement, false);
  }
  const names = [...new Set(components)];
  if (names.length === 0) return { edits: [], head: "", tail: "", components: [], isBoundary: false };
  const reg = names.map((n) => `$RefreshReg$(${n}, ${JSON.stringify(n)});`).join("\n");
  const isBoundary = exportsAll.length > 0 && exportsAll.every((n) => names.includes(n));
  // The caller applies `edits` together with its own, puts `head` on the first line (line numbers stay put) and `tail` last.
  return { edits, head: sigDecls.join(" "), tail: `\n${reg}\n`, components: names, isBoundary };
}

/** esbuild's inline source map is the last line; code added after it would hide it. */
export function splitSourceMap(code) {
  const i = code.lastIndexOf("\n//# sourceMappingURL=");
  return i === -1 ? { code, map: "" } : { code: code.slice(0, i), map: code.slice(i) };
}

/** A cheap scan of import specifiers in TS/TSX/JS source (no parsing): used only to find what the browser will need. */
export function scanImports(source) {
  const out = [];
  const re = /(?:^|[;\s}])(?:import|export)\s*(?:type\s+)?(?:[^'"`;()]*?\s+from\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1] ?? m[2]);
  return out;
}
