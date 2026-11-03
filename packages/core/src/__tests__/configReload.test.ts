/**
 * `devora dev` restarts in the same process, so the config loaders must read
 * the file again each time: a cached module would hand back the old config
 * (and hide a new syntax or runtime error).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadAppConfig } from "../loadAppConfig.js";
import { loadProjectConfig } from "../loadProjectConfig.js";

let dir: string;
beforeEach(() => void (dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-reload-"))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("config reload in one process", () => {
  it("app.config.ts: a changed value is read again, and a new error is reported", async () => {
    const file = path.join(dir, "app.config.ts");
    fs.writeFileSync(file, "export default { maxBodyBytes: 1 };\n");
    expect(await loadAppConfig(dir)).toEqual({ maxBodyBytes: 1 });
    fs.writeFileSync(file, "export default { maxBodyBytes: 2 };\n");
    expect(await loadAppConfig(dir)).toEqual({ maxBodyBytes: 2 });
    fs.writeFileSync(file, 'throw new Error("[devora] broken config");\n');
    await expect(loadAppConfig(dir)).rejects.toThrow(/broken config/);
  });

  it("an import of the config is read again too", async () => {
    fs.writeFileSync(path.join(dir, "shared.ts"), "export const limit = 10;\n");
    fs.writeFileSync(path.join(dir, "app.config.ts"), 'import { limit } from "./shared"; export default { maxBodyBytes: limit };\n');
    expect(await loadAppConfig(dir)).toEqual({ maxBodyBytes: 10 });
    fs.writeFileSync(path.join(dir, "shared.ts"), "export const limit = 20;\n");
    expect(await loadAppConfig(dir)).toEqual({ maxBodyBytes: 20 });
  });

  it("devora.config.ts: read again", async () => {
    const project = (name: string) =>
      `export default { apps: [{ name: "${name}", dir: "apps/${name}", domain: "${name}.example.com" }], shared: { core: "c", backend: "b", auth: "none" } };\n`;
    fs.writeFileSync(path.join(dir, "devora.config.ts"), project("one"));
    expect((await loadProjectConfig(dir)).apps[0]!.name).toBe("one");
    fs.writeFileSync(path.join(dir, "devora.config.ts"), project("two"));
    expect((await loadProjectConfig(dir)).apps[0]!.name).toBe("two");
  });
});
