/** tsconfig path aliases, import.meta.glob and CSS modules: the parts that need no server. */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compileCssModule, expandGlobs, globToRegExp, loadPathAliases, matchGlob, parseJsonc, resolveAlias } from "../core.mjs";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
function tmp(files: Record<string, string>) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "devora-features-")));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe("tsconfig path aliases", () => {
  it("reads JSON with comments and trailing commas", () => {
    expect(parseJsonc('{ // note\n "a": "x//y", /* c */ "b": [1, 2,], }')).toEqual({ a: "x//y", b: [1, 2] });
  });

  it("maps paths (wildcard and exact), follows extends, and lets the nearest config win", () => {
    const dir = tmp({
      "base.json": '{ "compilerOptions": { "baseUrl": ".", "paths": { "@old/*": ["nope/*"] } } }',
      "tsconfig.json": '{ "extends": "./base.json", "compilerOptions": { "paths": { "@/*": ["src/*"], "~lib": ["lib/index.ts"], "@ui/*": ["ui/*", "ui-fallback/*"] } } }',
      "src/util.ts": "export {}",
      "src/deep/thing.tsx": "export {}",
      "lib/index.ts": "export {}",
      "ui-fallback/Button.tsx": "export {}",
    });
    const aliases = loadPathAliases(dir);
    expect(resolveAlias("@/util", aliases)).toBe(path.join(dir, "src/util.ts"));
    expect(resolveAlias("@/deep/thing", aliases)).toBe(path.join(dir, "src/deep/thing.tsx"));
    expect(resolveAlias("~lib", aliases)).toBe(path.join(dir, "lib/index.ts"));
    expect(resolveAlias("@ui/Button", aliases)).toBe(path.join(dir, "ui-fallback/Button.tsx")); // the second target
    expect(resolveAlias("@old/x", aliases)).toBeUndefined(); // the extended config's paths were replaced
    expect(resolveAlias("react", aliases)).toBeUndefined();
    expect(resolveAlias("./util", aliases)).toBeUndefined();
  });

  it("baseUrl resolves a bare specifier to a file of the app, never to node_modules", () => {
    const dir = tmp({ "tsconfig.json": '{ "compilerOptions": { "baseUrl": "src" } }', "src/components/Card.tsx": "export {}", "node_modules/react/index.js": "" });
    const aliases = loadPathAliases(dir);
    expect(resolveAlias("components/Card", aliases)).toBe(path.join(dir, "src/components/Card.tsx"));
    expect(resolveAlias("react", aliases)).toBeUndefined();
  });

  it("no tsconfig, no aliases", () => {
    expect(loadPathAliases(tmp({ "a.ts": "" }))).toBeUndefined();
  });
});

describe("import.meta.glob", () => {
  it("matches *, **, ?, {a,b} and negations", () => {
    expect(globToRegExp("a/*.ts").test("a/x.ts")).toBe(true);
    expect(globToRegExp("a/*.ts").test("a/b/x.ts")).toBe(false);
    expect(globToRegExp("a/**/*.ts").test("a/b/c/x.ts")).toBe(true);
    expect(globToRegExp("a/**/*.ts").test("a/x.ts")).toBe(true);
    expect(globToRegExp("x/?.ts").test("x/a.ts")).toBe(true);
    expect(globToRegExp("x/{a,b}.ts").test("x/b.ts")).toBe(true);
    expect(globToRegExp("x/{a,b}.ts").test("x/c.ts")).toBe(false);
    expect(globToRegExp("a.b").test("aXb")).toBe(false); // a dot is a dot
  });

  it("lists files relative to the importing file, sorted, skipping dot folders and node_modules", () => {
    const dir = tmp({ "pages/a.tsx": "", "pages/b.tsx": "", "pages/sub/c.tsx": "", "pages/_skip.tsx": "", "pages/.hidden/d.tsx": "", "pages/node_modules/e.tsx": "" });
    expect(matchGlob(["./pages/*.tsx"], dir)).toEqual(["./pages/_skip.tsx", "./pages/a.tsx", "./pages/b.tsx"]);
    expect(matchGlob(["./pages/**/*.tsx", "!./pages/_*"], dir)).toEqual(["./pages/a.tsx", "./pages/b.tsx", "./pages/sub/c.tsx"]);
  });

  it("rewrites a lazy glob into dynamic imports and an eager one into static imports", () => {
    const dir = tmp({ "pages/a.ts": "", "pages/b.ts": "", "entry.ts": "" });
    const file = path.join(dir, "entry.ts");
    const lazy = expandGlobs('const m = import.meta.glob("./pages/*.ts");', file);
    expect(lazy).toContain('"./pages/a.ts": () => import("./pages/a.ts")');
    expect(lazy).toContain('"./pages/b.ts": () => import("./pages/b.ts")');
    const eager = expandGlobs('const m = import.meta.glob(["./pages/*.ts"], { eager: true, import: "default" });', file);
    expect(eager).toMatch(/^import \{ default as __glob0 \} from "\.\/pages\/a\.ts";import \{ default as __glob1 \}/);
    expect(eager).toContain('"./pages/a.ts": __glob0');
    expect(expandGlobs("const x = 1;", file)).toBe("const x = 1;");
  });

  it("refuses a call it cannot read (a computed pattern)", () => {
    const dir = tmp({ "entry.ts": "" });
    expect(() => expandGlobs("const p = './x'; const m = import.meta.glob(p);", path.join(dir, "entry.ts"))).toThrow(/literal patterns/);
  });
});

describe("CSS modules", () => {
  it("gives class names unique names and returns the map; the same class in two files does not clash", async () => {
    const dir = tmp({ "a.module.css": ".title { color: red; }\n.box .title { margin: 0; }\n", "b.module.css": ".title { color: blue; }\n" });
    const a = await compileCssModule(path.join(dir, "a.module.css"));
    const b = await compileCssModule(path.join(dir, "b.module.css"));
    expect(Object.keys(a.mapping).sort()).toEqual(["box", "title"]);
    expect(a.mapping.title).not.toBe("title");
    expect(a.mapping.title).not.toBe(b.mapping.title);
    expect(a.css).toContain(`.${a.mapping.title}`);
    expect(a.css).not.toMatch(/\.title\b/);
  });
});
