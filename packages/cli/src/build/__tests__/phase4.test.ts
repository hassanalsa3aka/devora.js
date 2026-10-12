/** Round 3 phase 4: .env loading, `devora add --kind`, and the watcher ignore list. */
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadProjectEnv } from "../loadEnvFiles.js";
import { DEV_WATCH_IGNORED } from "../../commands/dev.js";

const ORIGINAL_ENV = { ...process.env };
const tmp: string[] = [];
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  for (const dir of tmp.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});
function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-env-"));
  tmp.push(dir);
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

describe("loadProjectEnv", () => {
  it("Vite's precedence (.env.<mode>.local > .env.<mode> > .env.local > .env); the real environment wins over every file", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const dir = project({
      ".env": "A=env\nB=env\nC=env\nD=env\nE=env\n",
      ".env.local": "B=local\nC=local\nD=local\n",
      ".env.production": "C=production\nD=production\n",
      ".env.production.local": "D=production-local\n",
      ".env.development": "A=development\n",
    });
    process.env.E = "from-shell";
    expect(loadProjectEnv(dir, "production")).toEqual([".env", ".env.local", ".env.production", ".env.production.local"]);
    expect([process.env.A, process.env.B, process.env.C, process.env.D, process.env.E]).toEqual([
      "env",
      "local",
      "production",
      "production-local",
      "from-shell",
    ]);
  });

  it("logs file names only, never values; no files → nothing", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    loadProjectEnv(project({ ".env": "SECRET=hunter2\n" }), "development");
    expect(log.mock.calls.flat().join(" ")).toBe("[devora] loaded .env");
    expect(loadProjectEnv(project({}), "development")).toEqual([]);
  });
});

describe("dev watcher", () => {
  it("ignores build and adapter output inside the app", () => {
    expect(DEV_WATCH_IGNORED).toEqual(expect.arrayContaining(["**/dist/**", "**/.vercel/**", "**/.netlify/**", "**/netlify/functions/**"]));
  });
});
