/**
 * Finds `island(...)` calls with a real AST (the Rollup/Vite parser a
 * plugin's `this.parse()` returns), replacing the old regex over route
 * files only. Used by both the dev plugin (islandsPlugin.ts) and the build
 * plugin (islandsBuildPlugin.ts), so every module the app loads is checked —
 * a shared component declaring its own island included — and a call the
 * framework can't wire up fails with its location instead of silently never
 * hydrating.
 *
 * Supported shape: `island(() => import("./Component"))` — a literal import
 * specifier is what lets the build know which file to ship to the browser.
 * `island` must come from `@devorajs/core` (or `/client`), imported by name
 * (renaming is fine) or through a namespace import.
 */

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

export interface IslandCallSite {
  /** Offset of the call expression. */
  start: number;
  /** The import specifier, for a supported call. */
  specifier?: string;
  /** Where to insert `, "<url>"` (right after the loader argument). */
  insertAt?: number;
  /** Already has a second (URL) argument — leave it alone. */
  alreadyResolved: boolean;
}

const CORE_MODULES = new Set(["@devorajs/core", "@devorajs/core/client"]);

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && typeof (value as Node).type === "string";
}

function walk(node: Node, visit: (node: Node) => void): void {
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

/** Every call to framework `island()` in `program`, with whether it's a supported shape. */
export function findIslandCalls(program: Node): { supported: IslandCallSite[]; unsupported: IslandCallSite[] } {
  const localNames = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of (program.body as Node[]) ?? []) {
    if (statement.type !== "ImportDeclaration") continue;
    const source = (statement.source as Node).value;
    if (typeof source !== "string" || !CORE_MODULES.has(source)) continue;
    for (const spec of statement.specifiers as Node[]) {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.imported as Node;
        const importedName = imported.type === "Identifier" ? imported.name : imported.value;
        if (importedName === "island") localNames.add((spec.local as Node).name as string);
      } else if (spec.type === "ImportNamespaceSpecifier") {
        namespaces.add((spec.local as Node).name as string);
      }
    }
  }

  const supported: IslandCallSite[] = [];
  const unsupported: IslandCallSite[] = [];
  if (localNames.size === 0 && namespaces.size === 0) return { supported, unsupported };

  walk(program, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee as Node;
    const isIsland =
      (callee.type === "Identifier" && localNames.has(callee.name as string)) ||
      (callee.type === "MemberExpression" &&
        !callee.computed &&
        (callee.object as Node).type === "Identifier" &&
        namespaces.has((callee.object as Node).name as string) &&
        (callee.property as Node).name === "island");
    if (!isIsland) return;

    const args = node.arguments as Node[];
    const loader = args[0];
    const specifier = loader ? literalImportSpecifier(loader) : undefined;
    if (specifier === undefined) {
      unsupported.push({ start: node.start, alreadyResolved: false });
      return;
    }
    supported.push({ start: node.start, specifier, insertAt: loader!.end, alreadyResolved: args.length > 1 });
  });
  return { supported, unsupported };
}

/** `() => import("./X")` → "./X"; anything else → undefined. */
function literalImportSpecifier(loader: Node): string | undefined {
  if (loader.type !== "ArrowFunctionExpression" || (loader.params as Node[]).length !== 0) return undefined;
  const body = loader.body as Node;
  if (body.type !== "ImportExpression") return undefined;
  const source = body.source as Node;
  if (source.type === "Literal" && typeof source.value === "string") return source.value;
  if (source.type === "TemplateLiteral" && (source.expressions as Node[]).length === 0) {
    const quasi = (source.quasis as Node[])[0];
    const cooked = (quasi?.value as { cooked?: string } | undefined)?.cooked;
    return typeof cooked === "string" ? cooked : undefined;
  }
  return undefined;
}

export const UNSUPPORTED_ISLAND_CALL_MESSAGE =
  '[devora] island() must be called as island(() => import("./Component")) — with a literal path, so the ' +
  "build knows which file to ship to the browser. Wrap a computed or shared loader in that form at the call site.";

/** Inserts `, "<url>"` after each call's loader argument (edits from the end, so offsets stay valid). */
export function insertIslandUrls(code: string, edits: { insertAt: number; url: string }[]): string {
  let result = code;
  for (const edit of [...edits].sort((a, b) => b.insertAt - a.insertAt)) {
    result = result.slice(0, edit.insertAt) + `, ${JSON.stringify(edit.url)}` + result.slice(edit.insertAt);
  }
  return result;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes one source-map "mappings" line into [generatedColumn, source, originalLine, originalColumn] segments. */
function decodeMappingLine(line: string, state: number[]): number[][] {
  const segments: number[][] = [];
  let generatedColumn = 0;
  for (const segment of line.split(",")) {
    if (!segment) continue;
    const values: number[] = [];
    let value = 0;
    let shift = 0;
    for (const char of segment) {
      const digit = BASE64.indexOf(char);
      value += (digit & 31) << shift;
      if (digit & 32) {
        shift += 5;
      } else {
        values.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
    }
    generatedColumn += values[0] ?? 0;
    if (values.length >= 4) {
      state[0]! += values[1]!;
      state[1]! += values[2]!;
      state[2]! += values[3]!;
      segments.push([generatedColumn, state[0]!, state[1]!, state[2]!]);
    }
  }
  return segments;
}

/**
 * Maps an offset in transformed code back to the original file's 1-based
 * line/column through the combined source map, so an error points at what
 * the developer wrote (esbuild's JSX/TS output shifts lines). Undefined if
 * the map has nothing for that position.
 */
export function originalLocation(
  code: string,
  offset: number,
  map: { mappings: string } | null | undefined
): { line: number; column: number } | undefined {
  if (!map?.mappings) return undefined;
  const before = code.slice(0, offset);
  const generatedLine = before.split("\n").length - 1;
  const generatedColumn = offset - (before.lastIndexOf("\n") + 1);
  const state = [0, 0, 0];
  const lines = map.mappings.split(";");
  let best: number[] | undefined;
  for (let i = 0; i <= generatedLine && i < lines.length; i++) {
    const segments = decodeMappingLine(lines[i]!, state);
    if (i !== generatedLine) continue;
    for (const segment of segments) if (segment[0]! <= generatedColumn) best = segment;
  }
  return best ? { line: best[2]! + 1, column: best[3]! } : undefined;
}
