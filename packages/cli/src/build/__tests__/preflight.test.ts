import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeApiDir } from "@devorajs/core";
import { preflightNetlifyToml, preflightSessions, preflightVercelLayout } from "../preflight.js";
import { runPrebuild } from "../runPrebuild.js";

const tmp: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-preflight-"));
  tmp.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmp.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("preflightSessions", () => {
  const base = { appName: "web", sessions: { store: "./db/sessions.ts" }, adapter: "vercel" as const };

  it("auth none: nothing to check", () => {
    expect(preflightSessions({ ...base, authMode: "none", sessions: undefined, env: {} })).toEqual([]);
  });

  it("missing secret is an ERROR on the platform (VERCEL=1), a warning locally", () => {
    const onVercel = preflightSessions({ ...base, authMode: "shared", env: { VERCEL: "1" } });
    expect(onVercel).toEqual([expect.objectContaining({ level: "error", message: expect.stringMatching(/DEVORA_SESSION_SECRET/) })]);
    const local = preflightSessions({ ...base, authMode: "shared", env: {} });
    expect(local).toEqual([expect.objectContaining({ level: "warning" })]);
    const netlify = preflightSessions({ ...base, adapter: "netlify", authMode: "shared", env: { NETLIFY: "true" } });
    expect(netlify[0]?.level).toBe("error");
  });

  it("isolated: its own secret or the shared fallback both satisfy it", () => {
    expect(preflightSessions({ ...base, authMode: "isolated", env: { VERCEL: "1", DEVORA_SESSION_SECRET_WEB: "x" } })).toEqual([]);
    expect(preflightSessions({ ...base, authMode: "isolated", env: { VERCEL: "1", DEVORA_SESSION_SECRET: "x" } })).toEqual([]);
    const missing = preflightSessions({ ...base, authMode: "isolated", env: { VERCEL: "1" } });
    expect(missing[0]?.message).toContain("DEVORA_SESSION_SECRET_WEB (or DEVORA_SESSION_SECRET)");
  });

  it("isolated app with a hyphen: warns its env var name isn't settable", () => {
    const issues = preflightSessions({ ...base, appName: "api-only", authMode: "isolated", env: { DEVORA_SESSION_SECRET: "x" } });
    expect(issues).toEqual([expect.objectContaining({ level: "warning", message: expect.stringMatching(/isn't a valid environment variable name/) })]);
  });

  it("no session store: an error (the function would refuse to boot); memory: a serverless warning", () => {
    const none = preflightSessions({ ...base, authMode: "shared", sessions: undefined, env: { DEVORA_SESSION_SECRET: "x" } });
    expect(none).toEqual([expect.objectContaining({ level: "error", message: expect.stringMatching(/shared.sessions.store/) })]);
    const memory = preflightSessions({ ...base, authMode: "shared", sessions: { store: "memory" }, env: { DEVORA_SESSION_SECRET: "x" } });
    expect(memory).toEqual([expect.objectContaining({ level: "warning", message: expect.stringMatching(/logins won't stick/) })]);
  });
});

describe("preflightVercelLayout", () => {
  it("default layout, apiDir 'api': warns about Vercel's reserved api/ and names the fix", () => {
    const appRoot = tempDir();
    fs.mkdirSync(path.join(appRoot, "api"));
    const issues = preflightVercelLayout({ appRoot, outputDir: path.join(appRoot, ".vercel", "output"), apiDir: "api" });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "warning" });
    expect(issues[0]!.message).toMatch(/apiDir: "endpoints"/);
  });

  it("apiDir 'endpoints': no api/ folder, nothing to warn about", () => {
    const appRoot = tempDir();
    fs.mkdirSync(path.join(appRoot, "endpoints"));
    expect(preflightVercelLayout({ appRoot, outputDir: path.join(appRoot, ".vercel", "output"), apiDir: "endpoints" })).toEqual([]);
  });

  it("--out at the repo root: checks the REPO root's api/, not the app's", () => {
    const repo = tempDir();
    const appRoot = path.join(repo, "apps", "web");
    fs.mkdirSync(path.join(appRoot, "api"), { recursive: true });
    expect(preflightVercelLayout({ appRoot, outputDir: path.join(repo, ".vercel", "output"), apiDir: "api" })).toEqual([]);
    fs.mkdirSync(path.join(repo, "api"));
    const issues = preflightVercelLayout({ appRoot, outputDir: path.join(repo, ".vercel", "output"), apiDir: "api" });
    expect(issues[0]!.message).toContain(path.join(repo, "api"));
    expect(issues[0]!.message).toMatch(/move or rename that folder/);
  });

  it("an --out that isn't a .vercel/output directory: warns Vercel won't read it", () => {
    const repo = tempDir();
    const issues = preflightVercelLayout({ appRoot: repo, outputDir: path.join(repo, "build-out"), apiDir: "api" });
    expect(issues[0]!.message).toMatch(/Vercel only reads <project root>\/.vercel\/output/);
  });
});

describe("preflightNetlifyToml", () => {
  it("a non-default apiDir must be listed in included_files", () => {
    const appRoot = tempDir();
    fs.writeFileSync(path.join(appRoot, "netlify.toml"), `included_files = ["netlify/functions/ssr/api/**"]`);
    expect(preflightNetlifyToml({ appRoot, apiDir: "endpoints" })[0]!.message).toMatch(/netlify\/functions\/ssr\/endpoints\/\*\*/);
    fs.writeFileSync(path.join(appRoot, "netlify.toml"), `included_files = ["netlify/functions/ssr/endpoints/**"]`);
    expect(preflightNetlifyToml({ appRoot, apiDir: "endpoints" })).toEqual([]);
  });
});

describe("normalizeApiDir", () => {
  it("defaults to api and normalizes", () => {
    expect(normalizeApiDir(undefined)).toBe("api");
    expect(normalizeApiDir("./endpoints/")).toBe("endpoints");
    expect(normalizeApiDir("server/api")).toBe("server/api");
  });
  it.each(["", "/abs", "../outside", "routes", "routes/api", "dist/api", "node_modules"])("rejects %j", (bad) => {
    expect(() => normalizeApiDir(bad)).toThrow(/apiDir/);
  });
});

describe("runPrebuild", () => {
  it("runs each command in order, in the app directory", () => {
    const appRoot = tempDir();
    runPrebuild("web", appRoot, ["echo one > order.txt", "echo two >> order.txt"]);
    expect(fs.readFileSync(path.join(appRoot, "order.txt"), "utf-8").split(/\r?\n/).filter(Boolean)).toEqual(["one", "two"]);
  });

  it("a failing command stops the build, and later commands never run", () => {
    const appRoot = tempDir();
    expect(() => runPrebuild("web", appRoot, ["exit 3", "echo ran > after.txt"])).toThrow(/exited with code 3/);
    expect(fs.existsSync(path.join(appRoot, "after.txt"))).toBe(false);
  });

  it("finds bins in node_modules/.bin like an npm script would", () => {
    const appRoot = tempDir();
    const bin = path.join(appRoot, "node_modules", ".bin", "devora-test-codegen");
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    fs.writeFileSync(bin, "#!/bin/sh\necho generated > generated.txt\n", { mode: 0o755 });
    runPrebuild("web", appRoot, "devora-test-codegen");
    expect(fs.readFileSync(path.join(appRoot, "generated.txt"), "utf-8").trim()).toBe("generated");
  });

  it("no prebuild: a no-op", () => {
    expect(() => runPrebuild("web", tempDir(), undefined)).not.toThrow();
  });
});
