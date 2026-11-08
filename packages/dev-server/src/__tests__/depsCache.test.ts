/** The on-disk dependency cache: what it reuses, and the ways it refuses to. */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDepsManager } from "../deps.js";
import { CACHE_FORMAT, computeCacheKey, readCache, resolveCacheRoot, writeCache } from "../depsCache.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** An app folder with a real node_modules holding links to react, plus an optional linked source package. */
function makeApp(options: { linkedLib?: boolean } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "devora-depscache-")));
  dirs.push(dir);
  const modules = path.join(dir, "node_modules");
  fs.mkdirSync(modules);
  const dash = path.join(REPO, "apps", "dashboard", "node_modules");
  for (const name of ["react", "react-dom"]) fs.symlinkSync(fs.realpathSync(path.join(dash, name)), path.join(modules, name));
  fs.writeFileSync(path.join(dir, "package.json"), '{ "name": "app", "private": true }\n');
  fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  if (options.linkedLib) {
    fs.mkdirSync(path.join(dir, "lib"));
    fs.writeFileSync(path.join(dir, "lib", "package.json"), '{ "name": "mylib", "version": "1.0.0", "main": "index.js" }\n');
    fs.writeFileSync(path.join(dir, "lib", "index.js"), "export const value = 1;\n");
    fs.symlinkSync(path.join(dir, "lib"), path.join(modules, "mylib"));
  }
  return dir;
}
const SPECS = ["react", "react-dom", "react/jsx-runtime"];
const cacheVersionDir = (app: string) => path.join(app, "node_modules", ".devora", "dev-server", `v${CACHE_FORMAT}`);
const entries = (app: string) => fs.readdirSync(cacheVersionDir(app)).filter((n) => /^[0-9a-f]{64}$/.test(n));

describe("dependency cache", () => {
  it("the second start reads what the first one built, and serves the same files", async () => {
    const app = makeApp();
    const first = await createDepsManager(app, SPECS);
    expect(first.fromCache).toBe(false);
    expect(entries(app)).toHaveLength(1);
    const second = await createDepsManager(app, SPECS);
    expect(second.fromCache).toBe(true);
    expect(second.isCjs("react")).toBe(true);
    expect(second.file("react.js")).toBe(first.file("react.js"));
  }, 30000);

  it("another set of dependencies or a changed lockfile is a miss, and the key is stable for an unchanged tree", async () => {
    const app = makeApp();
    await createDepsManager(app, SPECS);
    expect((await createDepsManager(app, ["react", "react-dom"])).fromCache).toBe(false);
    fs.writeFileSync(path.join(app, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n# changed\n");
    expect((await createDepsManager(app, SPECS)).fromCache).toBe(false);
    const before = await computeCacheKey(app, SPECS);
    expect(await computeCacheKey(app, SPECS)).toBe(before);
  }, 60000);

  it("a dependency that is linked source is fingerprinted: editing it invalidates the cache", async () => {
    const app = makeApp({ linkedLib: true });
    const specs = [...SPECS, "mylib"];
    await createDepsManager(app, specs);
    expect((await createDepsManager(app, specs)).fromCache).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    fs.writeFileSync(path.join(app, "lib", "index.js"), "export const value = 2;\n");
    const after = await createDepsManager(app, specs);
    expect(after.fromCache).toBe(false);
    expect([...(after.file("mylib.js") ?? "")].length).toBeGreaterThan(0);
    expect(after.file("mylib.js")).toContain("2");
  }, 60000);

  it("a cached file that was changed on disk is not used, and the entry is rebuilt", async () => {
    const app = makeApp();
    await createDepsManager(app, SPECS);
    const dir = path.join(cacheVersionDir(app), entries(app)[0]!);
    fs.appendFileSync(path.join(dir, "react.js"), "\nglobalThis.poisoned = true;\n");
    const again = await createDepsManager(app, SPECS);
    expect(again.fromCache).toBe(false);
    expect(again.file("react.js")).not.toContain("poisoned");
    expect((await createDepsManager(app, SPECS)).fromCache).toBe(true); // rebuilt and valid again
  }, 60000);

  it("a manifest that names a file outside the folder, a link instead of a file, or another key is a miss", async () => {
    const app = makeApp();
    await createDepsManager(app, SPECS);
    const root = (await resolveCacheRoot(app))!;
    const key = entries(app)[0]!;
    const dir = path.join(cacheVersionDir(app), key);
    const manifestFile = path.join(dir, "manifest.json");
    const original = fs.readFileSync(manifestFile, "utf8");
    const manifest = JSON.parse(original);

    fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, files: { ...manifest.files, "../../../escape.js": "0".repeat(64) } }));
    expect(await readCache(root, key, SPECS)).toBeUndefined();
    fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, key: "f".repeat(64) }));
    expect(await readCache(root, key, SPECS)).toBeUndefined();
    fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, cjs: ["not-a-requested-dependency"] }));
    expect(await readCache(root, key, SPECS)).toBeUndefined();
    fs.writeFileSync(manifestFile, "{ not json");
    expect(await readCache(root, key, SPECS)).toBeUndefined();

    fs.writeFileSync(manifestFile, original);
    expect(await readCache(root, key, SPECS)).toBeDefined();
    const victim = path.join(dir, "react.js");
    const text = fs.readFileSync(victim, "utf8");
    fs.rmSync(victim);
    fs.writeFileSync(path.join(app, "elsewhere.js"), text); // same bytes, so the hash matches: only the link makes it invalid
    fs.symlinkSync(path.join(app, "elsewhere.js"), victim);
    expect(await readCache(root, key, SPECS)).toBeUndefined();
    expect(await readCache(root, "../../etc", SPECS)).toBeUndefined();
    expect(await readCache(root, "A".repeat(64), SPECS)).toBeUndefined();
  }, 60000);

  it("writes only inside the app's own node_modules: a node_modules that is a link elsewhere disables the cache", async () => {
    const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "devora-depscache-outside-")));
    dirs.push(outside);
    const app = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "devora-depscache-linked-")));
    dirs.push(app);
    const dash = path.join(REPO, "apps", "dashboard", "node_modules");
    for (const name of ["react", "react-dom"]) fs.symlinkSync(fs.realpathSync(path.join(dash, name)), path.join(outside, name));
    fs.symlinkSync(outside, path.join(app, "node_modules"));
    fs.writeFileSync(path.join(app, "package.json"), "{}\n");
    expect(await resolveCacheRoot(app)).toBeUndefined();
    const manager = await createDepsManager(app, ["react", "react-dom"]);
    expect(manager.fromCache).toBe(false);
    expect(fs.existsSync(path.join(outside, ".devora"))).toBe(false);
  }, 60000);

  it("never writes a file name that could leave the folder, keeps three entries, removes another format version", async () => {
    const app = makeApp();
    const root = (await resolveCacheRoot(app))!;
    fs.mkdirSync(path.join(root, "v0"), { recursive: true });
    fs.writeFileSync(path.join(root, "v0", "old.js"), "old");
    fs.mkdirSync(path.join(root, "v-keep-me-not-a-version"), { recursive: true });
    await writeCache(root, "a".repeat(64), ["x"], { files: new Map([["../evil.js", "x"]]), cjs: new Set() });
    expect(fs.existsSync(path.join(root, "evil.js"))).toBe(false);
    expect(fs.existsSync(path.join(root, `v${CACHE_FORMAT}`, "a".repeat(64)))).toBe(false);
    for (const ch of ["1", "2", "3", "4", "5"]) {
      await writeCache(root, ch.repeat(64).replace(/[^0-9a-f]/g, "0"), ["x"], { files: new Map([["x.js", `// ${ch}`]]), cjs: new Set() });
      await new Promise((r) => setTimeout(r, 15));
    }
    expect(fs.existsSync(path.join(root, "v0"))).toBe(false);
    expect(fs.existsSync(path.join(root, "v-keep-me-not-a-version"))).toBe(true); // not a name the cache made
    expect(fs.readdirSync(path.join(root, `v${CACHE_FORMAT}`)).filter((n) => /^[0-9a-f]{64}$/.test(n))).toHaveLength(3);
  }, 30000);
});
