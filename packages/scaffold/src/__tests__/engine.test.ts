import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ENGINE_NAME, parseEngine, resolveEngineChoice } from "../resolveEngineChoice.js";
import { scaffoldProjectFiles } from "../scaffoldProjectFiles.js";
import { scaffoldAppFiles } from "../scaffoldAppFiles.js";

describe("engine choice", () => {
  it("the name is one value in core and scaffold", async () => {
    const core = await readFile(new URL("../../../core/src/config.ts", import.meta.url), "utf8");
    expect(/export const ENGINE_NAME = "([^"]+)"/.exec(core)?.[1]).toBe(ENGINE_NAME);
  });
  it("parses answers", () => {
    expect(parseEngine("1")).toBe("vite");
    expect(parseEngine("Vite")).toBe("vite");
    expect(parseEngine("2")).toBe("own");
    expect(parseEngine("own")).toBe("own");
    expect(parseEngine("rollup")).toBeUndefined();
  });
  it("is Vite without a flag when there is no terminal", async () => {
    if (!process.stdin.isTTY) expect(await resolveEngineChoice(undefined)).toBe("vite");
    expect(await resolveEngineChoice("own")).toBe("own");
  });
});

describe("scaffold for the own engine", () => {
  it("writes engine: own and no vite config or dependency; the default keeps both", async () => {
    for (const engine of ["own", "vite"] as const) {
      const root = await mkdtemp(path.join(os.tmpdir(), "devora-engine-"));
      await scaffoldProjectFiles(root, { projectName: "p", apps: [{ name: "web", domain: "web.example.com", auth: "shared" }], coreVersion: "0.4.0", cliVersion: "0.4.0", engine });
      await scaffoldAppFiles(path.join(root, "apps", "web"), "web", { authMode: "shared", coreVersion: "0.4.0", cliInvocation: "standalone", cliVersion: "0.4.0", engine });
      const config = await readFile(path.join(root, "devora.config.ts"), "utf8");
      const pkg = JSON.parse(await readFile(path.join(root, "apps", "web", "package.json"), "utf8"));
      const hasViteConfig = await stat(path.join(root, "apps", "web", "vite.config.ts")).then(() => true, () => false);
      const rootPkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
      expect(rootPkg.dependencies["@devorajs/sekhem"]).toBe(engine === "own" ? "^0.1.0" : undefined);
      if (engine === "own") {
        expect(config).toContain('engine: "own"');
        expect(hasViteConfig).toBe(false);
        expect(pkg.dependencies.vite).toBeUndefined();
        expect(pkg.dependencies["@vitejs/plugin-react"]).toBeUndefined();
      } else {
        expect(config).not.toContain("engine:");
        expect(hasViteConfig).toBe(true);
        expect(pkg.dependencies.vite).toBeDefined();
      }
    }
  });
});
