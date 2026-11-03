/**
 * What restarts `devora dev` (devRestart.ts), one test per trigger, on real
 * files and the real file watcher.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyDevChange, watchDevChanges, type DevWatcher, type DevWatchTargets } from "../devRestart.js";
import { loadProjectEnv, unloadProjectEnv } from "../../build/loadEnvFiles.js";

let root: string;
let targets: DevWatchTargets;
const watchers: DevWatcher[] = [];

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "devora-restart-")));
  const app = path.join(root, "apps", "web");
  fs.mkdirSync(path.join(app, "routes"), { recursive: true });
  fs.mkdirSync(path.join(app, "api"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "backend", "prisma"), { recursive: true });
  fs.writeFileSync(path.join(app, "routes", "index.tsx"), "export default () => null;\n");
  fs.writeFileSync(path.join(app, "app.config.ts"), "export default {};\n");
  fs.writeFileSync(path.join(root, ".env"), "A=1\n");
  fs.writeFileSync(path.join(root, "devora.config.ts"), "export default {};\n");
  targets = {
    projectRoot: root,
    appRoots: [app],
    routeDirs: [path.join(app, "routes"), path.join(app, "api")],
    prismaDirs: [path.join(root, "packages", "backend", "prisma")],
  };
});

afterEach(() => {
  for (const w of watchers.splice(0)) w.close();
  fs.rmSync(root, { recursive: true, force: true });
});

type Seen = { restart: string[]; notices: string[] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function watch(): Promise<{ seen: Seen[]; settle: () => Promise<void> }> {
  const seen: Seen[] = [];
  watchers.push(watchDevChanges(targets, (c) => seen.push(c), 60));
  // macOS reports the files written in beforeEach a moment late; let those events pass, then start counting.
  await sleep(500);
  seen.length = 0;
  return { seen, settle: async () => void (await sleep(500)) };
}

describe("classifyDevChange (the decision)", () => {
  const state = { existsNow: true, knownRoute: false };
  it("restart for env files, devora.config.ts, an app's app.config.ts; nothing for other files", () => {
    for (const name of [".env", ".env.local", ".env.development", ".env.development.local"]) {
      expect(classifyDevChange(targets, path.join(root, name), state)).toMatchObject({ kind: "restart" });
    }
    expect(classifyDevChange(targets, path.join(root, ".env.production"), state)).toBeUndefined();
    expect(classifyDevChange(targets, path.join(root, "devora.config.ts"), state)).toMatchObject({ kind: "restart" });
    expect(classifyDevChange(targets, path.join(targets.appRoots[0]!, "app.config.ts"), state)).toMatchObject({ kind: "restart" });
    expect(classifyDevChange(targets, path.join(root, "apps", "other", "app.config.ts"), state)).toBeUndefined();
    expect(classifyDevChange(targets, path.join(root, "README.md"), state)).toBeUndefined();
  });

  it("routes: add and remove restart; a rename over an existing file, editor temp files and non-route files do not", () => {
    const route = path.join(targets.routeDirs[0]!, "about.tsx");
    expect(classifyDevChange(targets, route, { existsNow: true, knownRoute: false })).toMatchObject({ kind: "restart", reason: expect.stringContaining("added") });
    expect(classifyDevChange(targets, route, { existsNow: false, knownRoute: true })).toMatchObject({ kind: "restart", reason: expect.stringContaining("removed") });
    expect(classifyDevChange(targets, route, { existsNow: true, knownRoute: true })).toBeUndefined();
    expect(classifyDevChange(targets, path.join(targets.routeDirs[0]!, ".about.tsx.swp"), state)).toBeUndefined();
    expect(classifyDevChange(targets, path.join(targets.routeDirs[0]!, "about.tsx~"), state)).toBeUndefined();
    expect(classifyDevChange(targets, path.join(targets.routeDirs[0]!, "notes.txt"), state)).toBeUndefined();
    expect(classifyDevChange(targets, path.join(targets.routeDirs[1]!, "hello.ts"), state)).toMatchObject({ kind: "restart" });
  });

  it("Prisma: a message that names `prisma generate`, never a restart", () => {
    for (const file of ["schema.prisma", path.join("migrations", "001_init", "migration.sql")]) {
      const change = classifyDevChange(targets, path.join(targets.prismaDirs[0]!, file), state);
      expect(change?.kind).toBe("notice");
      expect((change as { message: string }).message).toMatch(/prisma generate/);
    }
  });
});

describe("watchDevChanges (the real watcher)", () => {
  it(".env change", async () => {
    const { seen, settle } = await watch();
    fs.writeFileSync(path.join(root, ".env"), "A=2\n");
    await settle();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.restart[0]).toMatch(/\.env changed/);
  });

  it("app.config.ts change", async () => {
    const { seen, settle } = await watch();
    fs.writeFileSync(path.join(targets.appRoots[0]!, "app.config.ts"), "export default { sitemap: true };\n");
    await settle();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.restart[0]).toMatch(/apps\/web\/app\.config\.ts changed/);
  });

  it("devora.config.ts change", async () => {
    const { seen, settle } = await watch();
    fs.writeFileSync(path.join(root, "devora.config.ts"), "export default { apps: [] };\n");
    await settle();
    expect(seen[0]?.restart[0]).toMatch(/devora\.config\.ts changed/);
  });

  it("a route added, then removed; many events in one burst are one restart", async () => {
    const { seen, settle } = await watch();
    const added = path.join(targets.routeDirs[0]!, "about.tsx");
    fs.writeFileSync(added, "export default () => null;\n");
    fs.mkdirSync(path.join(targets.routeDirs[0]!, "blog"));
    fs.writeFileSync(path.join(targets.routeDirs[0]!, "blog", "[slug].tsx"), "export default () => null;\n");
    await settle();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.restart.length).toBe(2);
    fs.rmSync(added);
    await settle();
    expect(seen).toHaveLength(2);
    expect(seen[1]!.restart[0]).toMatch(/route removed: apps\/web\/routes\/about\.tsx/);
  });

  it("an API route added in the API folder", async () => {
    const { seen, settle } = await watch();
    fs.writeFileSync(path.join(targets.routeDirs[1]!, "ping.ts"), "export const handler = () => ({ status: 200 });\n");
    await settle();
    expect(seen[0]?.restart[0]).toMatch(/route added: apps\/web\/api\/ping\.ts/);
  });

  it("editing a route's contents, or saving it the atomic way, is not a restart", async () => {
    const { seen, settle } = await watch();
    const route = path.join(targets.routeDirs[0]!, "index.tsx");
    fs.writeFileSync(route, "export default () => 'edited';\n");
    fs.writeFileSync(`${route}.tmp`, "export default () => 'saved';\n");
    fs.renameSync(`${route}.tmp`, route);
    await settle();
    expect(seen).toEqual([]);
  });

  it("a Prisma schema change is a notice with no restart", async () => {
    const { seen, settle } = await watch();
    fs.writeFileSync(path.join(targets.prismaDirs[0]!, "schema.prisma"), "model User { id Int @id }\n");
    await settle();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.restart).toEqual([]);
    expect(seen[0]!.notices[0]).toMatch(/prisma generate/);
  });
});

describe("reloading .env", () => {
  it("unloadProjectEnv drops what was loaded, so a changed value is read again; a shell variable is never touched", () => {
    const key = "DEVORA_RESTART_TEST_VAR";
    const shell = "DEVORA_RESTART_SHELL_VAR";
    process.env[shell] = "from-shell";
    fs.writeFileSync(path.join(root, ".env"), `${key}=one\n${shell}=from-file\n`);
    loadProjectEnv(root, "development");
    expect(process.env[key]).toBe("one");
    expect(process.env[shell]).toBe("from-shell");
    unloadProjectEnv();
    expect(process.env[key]).toBeUndefined();
    fs.writeFileSync(path.join(root, ".env"), `${key}=two\n`);
    loadProjectEnv(root, "development");
    expect(process.env[key]).toBe("two");
    expect(process.env[shell]).toBe("from-shell");
    unloadProjectEnv();
    delete process.env[shell];
  });
});
