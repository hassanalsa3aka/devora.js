/**
 * Round 3 phase 2, item 5 — through the real CLI entry (src/index.ts via
 * tsx), as a separate process: `devora start` reads PORT/HOST and says when
 * it sets NODE_ENV; `devora build --adapter=<unknown>` fails instead of
 * silently building without the requested output.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createFixtureProject, write, type FixtureProject } from "../../server/__tests__/fixtureApp.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const TSX = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
const CLI = path.join(REPO_ROOT, "packages", "cli", "src", "index.ts");

let fixture: FixtureProject;
const children: ChildProcess[] = [];

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

/** Starts the CLI; resolves with its output once `ready` matches it (or it exits). */
function runCli(args: string[], env: NodeJS.ProcessEnv, ready: RegExp): Promise<{ output: string; child: ChildProcess }> {
  const child = spawn(TSX, [CLI, ...args], { cwd: fixture.projectRoot, env });
  children.push(child);
  let output = "";
  return new Promise((resolve) => {
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (ready.test(output)) resolve({ output, child });
    };
    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);
    child.on("exit", () => resolve({ output, child }));
  });
}

beforeAll(() => {
  fixture = createFixtureProject();
  // Plain objects — no imports, so jiti needs nothing resolvable from the temp project root.
  write(
    path.join(fixture.projectRoot, "devora.config.ts"),
    `export default { apps: [{ name: "fixture", dir: "app", domain: "fixture.example.com", auth: "none" }], shared: { core: "x", auth: "none" } };\n`
  );
  write(path.join(fixture.appRoot, "app.config.ts"), `export default { backendOnly: true };\n`);
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(
    path.join(fixture.appRoot, "dist", "server", "api", "health.js"),
    `export const handler = () => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ env: process.env.NODE_ENV }) });\n`
  );
  // The fixture's api/ has other routes; only health is "built", which is all this test requests.
  fs.mkdirSync(path.join(fixture.appRoot, "api"), { recursive: true });
  write(path.join(fixture.appRoot, "api", "health.ts"), "export const handler = () => ({ status: 200 });\n");
});

afterAll(() => {
  for (const child of children) child.kill();
  fixture?.cleanup();
});

const baseEnv = () => {
  const env = { ...process.env };
  delete env.NODE_ENV;
  delete env.PORT;
  delete env.HOST;
  return env;
};

describe("devora start", () => {
  it("binds PORT/HOST from the environment and logs both, plus the NODE_ENV it set", async () => {
    const port = await freePort();
    const { output } = await runCli(["start", "--app=fixture"], { ...baseEnv(), PORT: String(port), HOST: "127.0.0.1" }, /adapter-node/);
    expect(output).toContain("NODE_ENV=production (was unset)");
    expect(output).toContain(`port ${port} (from PORT)`);
    expect(output).toContain("binding 127.0.0.1 (from HOST)");
    expect(output).toContain(`http://127.0.0.1:${port}`);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(await res.json()).toEqual({ env: "production" });
  }, 60_000);

  it("--port wins over PORT; overriding an explicit NODE_ENV is reported", async () => {
    const port = await freePort();
    const { output } = await runCli(
      ["start", "--app=fixture", `--port=${port}`, "--host=127.0.0.1"],
      { ...baseEnv(), PORT: "1", NODE_ENV: "development" },
      /adapter-node/
    );
    expect(output).toContain('NODE_ENV=production (overriding "development")');
    expect(output).not.toContain("(from PORT)");
    expect((await fetch(`http://127.0.0.1:${port}/api/health`)).status).toBe(200);
  }, 60_000);

  it("an invalid PORT is an error, not NaN", async () => {
    const { output, child } = await runCli(["start", "--app=fixture"], { ...baseEnv(), PORT: "http" }, /never/);
    expect(output).toContain('PORT must be a port number from 1 to 65535 (got "http")');
    expect(child.exitCode).toBe(1);
  }, 60_000);
});

describe("devora build --adapter", () => {
  it("rejects an unknown adapter before building anything", () => {
    const result = spawnSync(TSX, [CLI, "build", "--adapter=node"], { cwd: fixture.projectRoot, env: baseEnv(), encoding: "utf-8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown --adapter "node" — use vercel or netlify');
    expect(result.stderr).toContain("leave --adapter off");
    expect(fs.existsSync(path.join(fixture.appRoot, "dist", "server", "session-manifest.json"))).toBe(false);
  }, 60_000);
});

describe("devora add --kind (round 3 phase 4)", () => {
  function addApp(projectRoot: string, args: string[]) {
    return spawnSync(TSX, [CLI, "add", ...args, "--auth=none"], { cwd: projectRoot, env: baseEnv(), encoding: "utf-8" });
  }
  function backendOnlyProject(): string {
    const root = fs.mkdtempSync(path.join(fixture.projectRoot, "backend-project-"));
    fs.mkdirSync(path.join(root, "apps", "api"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "api", "app.config.ts"), "export default { backendOnly: true };\n");
    fs.writeFileSync(
      path.join(root, "devora.config.ts"),
      `export default {\n  apps: [\n    { name: "api", dir: "apps/api", domain: "api.example.com", auth: "none" },\n  ],\n  shared: { core: "x", auth: "none" },\n};\n`
    );
    return root;
  }

  it("in a backend-only project, a new app is an API app (it used to get a full pages app)", () => {
    const root = backendOnlyProject();
    const result = addApp(root, ["worker"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("backend-only API app");
    expect(fs.existsSync(path.join(root, "apps", "worker", "endpoints", "health.ts"))).toBe(true);
    for (const pageFile of ["routes", "entry-server.tsx", "island-client.tsx", "error.tsx"]) {
      expect(fs.existsSync(path.join(root, "apps", "worker", pageFile)), pageFile).toBe(false);
    }
  }, 60_000);

  it("--kind=pages overrides; an invalid --kind is rejected", () => {
    const root = backendOnlyProject();
    expect(addApp(root, ["site", "--kind=pages"]).status).toBe(0);
    expect(fs.existsSync(path.join(root, "apps", "site", "routes", "index.tsx"))).toBe(true);
    const bad = addApp(root, ["x", "--kind=spa"]);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('--kind must be "pages" or "api"');
  }, 60_000);
});
