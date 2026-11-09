/**
 * Server module invalidation: only the changed module and what imports it run again, and nothing stale is ever served.
 * Each case runs in a child process because the module hooks are process-wide.
 */
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const TSX = path.resolve(here, "../../../../node_modules/.bin/tsx");
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function scenario(files: Record<string, string>, steps: Record<string, unknown>[], existing?: { dir: string; cacheDir?: string }) {
  const dir = existing?.dir ?? fs.mkdtempSync(path.join(os.tmpdir(), "devora-graph-"));
  if (!existing) dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  const out = spawnSync(TSX, [path.join(here, "graphHarness.mts"), JSON.stringify({ dir, cacheDir: existing?.cacheDir, steps })], { encoding: "utf8", timeout: 60000 });
  const line = out.stdout.split("\n").find((l) => l.startsWith("RESULT "));
  if (!line) throw new Error(`harness failed:\n${out.stdout}\n${out.stderr}`);
  return JSON.parse(line.slice(7)) as any[];
}
// a module that counts how many times it has run
const counted = (name: string, body: string) => `globalThis.__runs["${name}"] = (globalThis.__runs["${name}"] ?? 0) + 1;\n${body}`;

describe("server module invalidation", () => {
  it("runs the changed module and what imports it again, and nothing else", () => {
    const files = {
      "leaf.ts": counted("leaf", 'export const value = "one";'),
      "mid.ts": counted("mid", 'import { value } from "./leaf"; export const text = `mid:${value}`;'),
      "top.ts": counted("top", 'import { text } from "./mid"; export const page = `top:${text}`;'),
      "other.ts": counted("other", 'export const x = "other";'),
      "entry.ts": counted("entry", 'import { page } from "./top"; import { x } from "./other"; export const out = `${page}|${x}`;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "leaf.ts", content: counted("leaf", 'export const value = "two";') },
      { invalidate: "leaf.ts" },
      { load: "entry.ts" },
    ]);
    expect(r[0].exports.out).toBe("top:mid:one|other");
    expect(r[0].runs).toEqual({ leaf: 1, mid: 1, top: 1, other: 1, entry: 1 });
    expect(r[1].invalidated).toEqual(["entry.ts", "leaf.ts", "mid.ts", "top.ts"]);
    expect(r[2].exports.out).toBe("top:mid:two|other"); // never the old value
    expect(r[2].runs).toEqual({ leaf: 2, mid: 2, top: 2, other: 1, entry: 2 }); // `other` did not run again
  });

  it("a second edit of the same file and an edit of an unrelated module are both correct", () => {
    const files = {
      "a.ts": counted("a", 'export const v = 1;'),
      "b.ts": counted("b", 'export const w = 1;'),
      "entry.ts": counted("entry", 'import { v } from "./a"; import { w } from "./b"; export const out = `${v}-${w}`;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "a.ts", content: counted("a", "export const v = 2;") },
      { invalidate: "a.ts" },
      { load: "entry.ts" },
      { write: "a.ts", content: counted("a", "export const v = 3;") },
      { invalidate: "a.ts" },
      { load: "entry.ts" },
      { write: "b.ts", content: counted("b", "export const w = 9;") },
      { invalidate: "b.ts" },
      { load: "entry.ts" },
    ]);
    expect(r.filter((x) => x.load).map((x) => x.exports.out)).toEqual(["1-1", "2-1", "3-1", "3-9"]);
    expect(r[6].runs).toEqual({ a: 3, b: 2, entry: 4 });
  });

  it("circular imports: both modules of the cycle run again, with consistent values", () => {
    const files = {
      "a.ts": counted("a", 'import { b } from "./b"; export const a = "a1"; export const fromB = () => b;'),
      "b.ts": counted("b", 'import { a } from "./a"; export const b = "b1"; export const fromA = () => a;'),
      "entry.ts": counted("entry", 'import { fromB } from "./a"; import { fromA } from "./b"; export const out = `${fromB()}/${fromA()}`;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "b.ts", content: counted("b", 'import { a } from "./a"; export const b = "b2"; export const fromA = () => a;') },
      { invalidate: "b.ts" },
      { load: "entry.ts" },
    ]);
    expect(r[0].exports.out).toBe("b1/a1");
    expect(r[1].invalidated).toEqual(["a.ts", "b.ts", "entry.ts"]);
    expect(r[2].exports.out).toBe("b2/a1");
    expect(r[2].runs).toEqual({ a: 2, b: 2, entry: 2 });
  });

  it("a side-effect module (imported for what it does) runs again when it changes or when an importer does, not otherwise", () => {
    const files = {
      "register.ts": counted("register", "export {};"),
      "feature.ts": counted("feature", 'import "./register"; export const f = 1;'),
      "unrelated.ts": counted("unrelated", "export const u = 1;"),
      "entry.ts": counted("entry", 'import { f } from "./feature"; import { u } from "./unrelated"; export const out = f + u;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "unrelated.ts", content: counted("unrelated", "export const u = 5;") },
      { invalidate: "unrelated.ts" },
      { load: "entry.ts" },
      { write: "feature.ts", content: counted("feature", 'import "./register"; export const f = 10;') },
      { invalidate: "feature.ts" },
      { load: "entry.ts" },
    ]);
    expect(r[2].runs.register).toBe(1); // an unrelated edit does not run it again
    expect(r[2].exports.out).toBe(6);
    expect(r[4].exports.out).toBe(15);
    expect(r[4].runs.feature).toBe(2);
    expect(r[4].runs.register).toBe(1); // it is imported BY the changed module, not an importer of it: it keeps its instance
  });

  it("a deleted file is an error for the modules that import it, and the page works again when it is back", () => {
    const files = {
      "dep.ts": counted("dep", 'export const d = "here";'),
      "entry.ts": counted("entry", 'import { d } from "./dep"; export const out = d;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { rm: "dep.ts" },
      { invalidate: "dep.ts" },
      { load: "entry.ts" },
      { write: "dep.ts", content: counted("dep", 'export const d = "back";') },
      { invalidate: "dep.ts" },
      { load: "entry.ts" },
    ]);
    expect(r[0].exports.out).toBe("here");
    expect(r[2].error).toMatch(/Cannot find module|not found|ENOENT/i);
    expect(r[4].exports.out).toBe("back");
  });

  it("a renamed file: the old name fails, the importer is fixed to the new name, and the new content is served", () => {
    const files = {
      "old.ts": counted("old", 'export const n = "old name";'),
      "entry.ts": counted("entry", 'import { n } from "./old"; export const out = n;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { rename: ["old.ts", "new.ts"] },
      { invalidate: "old.ts" },
      { invalidate: "new.ts" },
      { load: "entry.ts" },
      { write: "entry.ts", content: counted("entry", 'import { n } from "./new"; export const out = n;') },
      { invalidate: "entry.ts" },
      { load: "entry.ts" },
    ]);
    expect(r.find((x) => x.load && x.error)?.error).toMatch(/Cannot find module|not found|ENOENT/i);
    expect(r[r.length - 1].exports.out).toBe("old name");
  });

  it("a new file that an import now resolves to (x.tsx next to x.ts) is picked up", () => {
    const files = {
      "x.ts": counted("x", 'export const which = "ts";'),
      "entry.ts": counted("entry", 'import { which } from "./x"; export const out = which;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "x.tsx", content: counted("xtsx", 'export const which = "tsx";') },
      { invalidate: "x.tsx" },
      { load: "entry.ts" },
    ]);
    expect(r[0].exports.out).toBe("ts");
    expect(r[2].exports.out).toBe("tsx"); // the lookup tries .tsx before .ts: the new file now wins, and the import was re-resolved
  });

  it("a file the server never loaded runs every module of the app again (an import may now resolve differently)", () => {
    const files = {
      "a.ts": counted("a", "export const a = 1;"),
      "entry.ts": counted("entry", 'import { a } from "./a"; export const out = a;'),
    };
    const r = scenario(files, [{ load: "entry.ts" }, { write: "brand-new.ts", content: "export {};" }, { invalidate: "brand-new.ts" }]);
    expect(r[1].invalidated).toEqual(["a.ts", "brand-new.ts", "entry.ts"]);
  });

  it("a stale import graph is not kept: a module that stopped importing a file is no longer re-run for it", () => {
    const files = {
      "dep.ts": counted("dep", "export const d = 1;"),
      "user.ts": counted("user", 'import { d } from "./dep"; export const u = d;'),
      "entry.ts": counted("entry", 'import { u } from "./user"; export const out = u;'),
    };
    const r = scenario(files, [
      { load: "entry.ts" },
      { write: "user.ts", content: counted("user", "export const u = 7;") },
      { invalidate: "user.ts" },
      { load: "entry.ts" },
      { invalidate: "dep.ts" },
    ]);
    expect(r[2].exports.out).toBe(7);
    expect(r[3].invalidated).toEqual(["dep.ts"]); // user.ts no longer imports it: nothing else is invalidated
  });
});

describe("compile cache on disk (the next start's shortcut)", () => {
  const files = { "mod.ts": 'export const value = "one"; export const marker = () => (globalThis as any).__poisoned ?? "clean";', "entry.ts": 'import { value, marker } from "./mod"; export const out = () => `${value}:${marker()}`;' };
  const setup = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-cachetest-"));
    dirs.push(dir);
    const cacheDir = path.join(dir, ".cache");
    return { dir, cacheDir };
  };
  const cacheFiles = (cacheDir: string) => {
    const out: string[] = [];
    const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : out.push(path.join(d, e.name))));
    if (fs.existsSync(cacheDir)) walk(cacheDir);
    return out;
  };

  it("the second start reads the cache and serves the same result", () => {
    const { dir, cacheDir } = setup();
    expect(scenario(files, [{ load: "entry.ts" }], { dir, cacheDir })[0].exports.out).toBe("one:clean");
    expect(cacheFiles(cacheDir).length).toBeGreaterThan(0);
    expect(scenario({}, [{ load: "entry.ts" }], { dir, cacheDir })[0].exports.out).toBe("one:clean");
  });

  it("a source edited while the server was stopped is never served from an old cache entry", () => {
    const { dir, cacheDir } = setup();
    scenario(files, [{ load: "entry.ts" }], { dir, cacheDir });
    const r = scenario({ "mod.ts": 'export const value = "two"; export const marker = () => (globalThis as any).__poisoned ?? "clean";' }, [{ load: "entry.ts" }], { dir, cacheDir });
    expect(r[0].exports.out).toBe("two:clean");
  });

  it("a cache entry that was altered on disk is not run", () => {
    const { dir, cacheDir } = setup();
    scenario(files, [{ load: "entry.ts" }], { dir, cacheDir });
    for (const f of cacheFiles(cacheDir)) fs.appendFileSync(f, "\nglobalThis.__poisoned = 'POISONED';\n");
    const r = scenario({}, [{ load: "entry.ts" }], { dir, cacheDir });
    expect(r[0].exports.out).toBe("one:clean");
  });

  it("a cache entry replaced by a link to a self-consistent file elsewhere is not followed", () => {
    const { dir, cacheDir } = setup();
    scenario(files, [{ load: "entry.ts" }], { dir, cacheDir });
    const outside = path.join(dir, "outside");
    fs.mkdirSync(outside);
    for (const [i, f] of cacheFiles(cacheDir).entries()) {
      const text = fs.readFileSync(f, "utf8");
      const body = text.slice(text.indexOf("\n") + 1) + "\nglobalThis.__poisoned = 'LINKED';\n";
      const planted = path.join(outside, `p${i}.js`);
      fs.writeFileSync(planted, `//devora:${createHash("sha256").update(body).digest("hex")}\n${body}`); // valid header and hash
      fs.rmSync(f);
      fs.symlinkSync(planted, f);
    }
    const r = scenario({}, [{ load: "entry.ts" }], { dir, cacheDir });
    expect(r[0].exports.out).toBe("one:clean");
  });

  it("an entry with a wrong or missing header is ignored", () => {
    const { dir, cacheDir } = setup();
    scenario(files, [{ load: "entry.ts" }], { dir, cacheDir });
    const [a, b] = cacheFiles(cacheDir);
    fs.writeFileSync(a!, "globalThis.__poisoned = 'NOHEADER';");
    if (b) fs.writeFileSync(b, `//devora:${"0".repeat(64)}\nglobalThis.__poisoned = 'BADHASH';`);
    const r = scenario({}, [{ load: "entry.ts" }], { dir, cacheDir });
    expect(r[0].exports.out).toBe("one:clean");
  });
});
