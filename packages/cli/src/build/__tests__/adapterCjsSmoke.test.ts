/**
 * Round 3 V8 smoke test: a deployed function that inlines a CommonJS module
 * calling `require("events")` (the shape `pg` has) must answer requests, not
 * 500 with `Dynamic require of "events" is not supported`.
 *
 * Runs the real adapters (writeVercelOutput / writeNetlifyConfig) over a
 * hand-written `dist/server` (same approach as prodServer.integration.test.ts
 * — the adapters only ever bundle and import those files), copies the
 * generated function to a temp dir with no ancestor node_modules, and
 * requests it from a separate Node process — the same isolation check the
 * adapters were verified with before, now automated.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as esbuild from "esbuild";
import { writeVercelOutput } from "@devorajs/adapter-vercel";
import { writeNetlifyConfig } from "@devorajs/adapter-netlify";
import { createFixtureProject, write, type FixtureProject } from "../../server/__tests__/fixtureApp.js";

const APP = { name: "cjs-smoke", dir: "app", domain: "cjs.example.com" };

// A CommonJS module in the same shape as pg/lib/client.js: requires a Node
// built-in at load time.
const LEGACY_CJS = `
const { EventEmitter } = require("events");
class Client extends EventEmitter { ping() { return "pong from a CommonJS module"; } }
module.exports = { Client };
`;

// What Vite's SSR build emits for endpoints/legacy.ts: npm packages stay
// bare imports (Vite externalizes them), and bundleForDeploy inlines them.
const BUILT_ROUTE = `
import legacy from "legacy-cjs";
export const handler = () => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: new legacy.Client().ping() }),
});
`;

let fixture: FixtureProject;
const outside: string[] = [];

function copyOutsideRepo(funcDir: string): string {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "devora-func-"));
  outside.push(dest);
  fs.cpSync(funcDir, dest, { recursive: true, dereference: true });
  // Nothing above the copy may supply a node_modules — that's the point.
  expect(fs.existsSync(path.join(path.dirname(dest), "node_modules"))).toBe(false);
  return dest;
}

/** Runs `script` with plain Node in `cwd` and returns its stdout. */
function runNode(cwd: string, script: string): string {
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf-8",
    timeout: 30_000,
  });
}

beforeAll(() => {
  fixture = createFixtureProject();
  // Pages aren't the subject here; an API-only app keeps react-dom out of it.
  fs.rmSync(path.join(fixture.appRoot, "routes"), { recursive: true, force: true });
  fs.rmSync(path.join(fixture.appRoot, "api"), { recursive: true, force: true });
  fs.rmSync(path.join(fixture.appRoot, "entry-server.tsx"));
  // A real node_modules (not the fixture's symlink to apps/dashboard's) so
  // the fake CommonJS package can sit next to the real react/@devorajs/core.
  const nodeModules = path.join(fixture.appRoot, "node_modules");
  const linked = fs.realpathSync(nodeModules);
  fs.unlinkSync(nodeModules);
  fs.mkdirSync(nodeModules);
  for (const entry of fs.readdirSync(linked)) {
    fs.symlinkSync(path.join(linked, entry), path.join(nodeModules, entry));
  }
  write(path.join(nodeModules, "legacy-cjs", "package.json"), JSON.stringify({ name: "legacy-cjs", main: "index.js" }));
  write(path.join(nodeModules, "legacy-cjs", "index.js"), LEGACY_CJS);
  // Source file (the router matches against it) + "built" output, in a
  // non-default apiDir — exercising round 3 V2 on the same path.
  write(path.join(fixture.appRoot, "endpoints", "legacy.ts"), "export const handler = () => ({ status: 500 });\n");
  write(path.join(fixture.appRoot, "dist", "server", "endpoints", "legacy.js"), BUILT_ROUTE);
});

afterAll(() => {
  fixture?.cleanup();
  for (const dir of outside) fs.rmSync(dir, { recursive: true, force: true });
});

describe("adapter bundles + CommonJS dependencies (round 3 V8)", () => {
  it("negative control: the fixture really does hit the bug when bundled without the banner", async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-nobanner-"));
    outside.push(outDir);
    await esbuild.build({
      entryPoints: [path.join(fixture.appRoot, "dist", "server", "endpoints", "legacy.js")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: path.join(outDir, "legacy.mjs"),
      logLevel: "silent",
    });
    expect(() => runNode(outDir, `await import("./legacy.mjs");`)).toThrow(/Dynamic require of "events" is not supported/);
  });

  it("Vercel: the generated function, run outside the monorepo, serves the route", async () => {
    const outputDir = path.join(fixture.appRoot, ".vercel", "output");
    await writeVercelOutput(APP, fixture.appRoot, "none", undefined, false, undefined, {
      apiDir: "endpoints",
      runtime: "nodejs22.x",
    });
    const funcDir = path.join(outputDir, "functions", "index.func");
    expect(JSON.parse(fs.readFileSync(path.join(funcDir, ".vc-config.json"), "utf-8")).runtime).toBe("nodejs22.x");
    expect(fs.readFileSync(path.join(funcDir, "dist", "server", "endpoints", "legacy.js"), "utf-8")).toContain(
      "globalThis.require ??="
    );

    const isolated = copyOutsideRepo(funcDir);
    const out = runNode(
      isolated,
      `
import http from "node:http";
const { default: handler } = await import("./index.mjs");
const server = http.createServer((req, res) => handler(req, res));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const res = await fetch("http://127.0.0.1:" + server.address().port + "/api/legacy");
console.log(JSON.stringify({ status: res.status, body: await res.text() }));
server.close();
`
    );
    const result = JSON.parse(out.trim().split("\n").pop()!);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: "pong from a CommonJS module" });
  }, 60_000);

  it("Netlify: the generated function, run outside the monorepo, serves the route", async () => {
    await writeNetlifyConfig(APP, fixture.appRoot, "none", undefined, false, undefined, { apiDir: "endpoints" });
    const isolated = copyOutsideRepo(path.join(fixture.appRoot, "netlify", "functions", "ssr"));
    const out = runNode(
      isolated,
      `
const { default: handler } = await import("./ssr.mjs");
const res = await handler(new Request("https://site.example/api/legacy"));
console.log(JSON.stringify({ status: res.status, body: await res.text() }));
`
    );
    const result = JSON.parse(out.trim().split("\n").pop()!);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: "pong from a CommonJS module" });
  }, 60_000);
});

describe("generated functions — sessions and headers (round 3 phase 2)", () => {
  let sessionFixture: FixtureProject;

  beforeAll(() => {
    sessionFixture = createFixtureProject();
    fs.rmSync(path.join(sessionFixture.appRoot, "routes"), { recursive: true, force: true });
    fs.rmSync(path.join(sessionFixture.appRoot, "entry-server.tsx"));
    // Built output for the fixture's api/me.ts (any session lookup will do).
    write(
      path.join(sessionFixture.appRoot, "dist", "server", "api", "me.js"),
      `export const handler = (_req, ctx) => ({ status: 200, body: JSON.stringify({ session: ctx.session ?? null }) });\n`
    );
    write(path.join(sessionFixture.appRoot, "dist", "server", "session-manifest.json"), JSON.stringify({ store: "memory" }));
  });

  afterAll(() => sessionFixture?.cleanup());

  it("Netlify: two cookies in one response stay two Set-Cookie headers (they used to be comma-joined into one)", async () => {
    await writeNetlifyConfig(APP, sessionFixture.appRoot, "shared", { noindex: true }, false, undefined, { apiDir: "api" });
    const funcDir = path.join(sessionFixture.appRoot, "netlify", "functions", "ssr");
    expect(fs.readFileSync(path.join(funcDir, "ssr.mjs"), "utf-8")).toMatch(/trustProxy"?:\s*true/);
    // noindex reaches statically served files through Netlify's _headers.
    expect(fs.readFileSync(path.join(sessionFixture.appRoot, "dist", "client", "_headers"), "utf-8")).toContain(
      "X-Robots-Tag: noindex"
    );

    const isolated = copyOutsideRepo(funcDir);
    const out = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
const { default: handler } = await import("./ssr.mjs");
// A dead session cookie (cleared) and no CSRF cookie yet (issued): two cookies.
const res = await handler(new Request("https://site.example/api/me", { headers: { cookie: "devora_session=not-a-session" } }));
console.log(JSON.stringify({ status: res.status, cookies: res.headers.getSetCookie(), robots: res.headers.get("x-robots-tag") }));
`,
      ],
      { cwd: isolated, env: { ...process.env, NODE_ENV: "production", DEVORA_SESSION_SECRET: "smoke" }, encoding: "utf-8" }
    );
    const result = JSON.parse(out.trim().split("\n").pop()!);
    expect(result.status).toBe(200);
    expect(result.cookies).toHaveLength(2);
    expect(result.cookies[0]).toMatch(/^devora_session=; .*Max-Age=0; Secure$/);
    expect(result.cookies[1]).toMatch(/^devora_csrf=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    expect(result.robots).toBe("noindex");
  }, 60_000);

  it("Vercel: trustProxy defaults to true in the function, an explicit false is kept; noindex adds a header route", async () => {
    await writeVercelOutput(APP, sessionFixture.appRoot, "shared", { noindex: true }, false, undefined, { runtime: "nodejs22.x" });
    const outputDir = path.join(sessionFixture.appRoot, ".vercel", "output");
    const wrapper = fs.readFileSync(path.join(outputDir, "functions", "index.func", "index.mjs"), "utf-8");
    expect(wrapper).toMatch(/trustProxy"?:\s*true/);
    const config = JSON.parse(fs.readFileSync(path.join(outputDir, "config.json"), "utf-8"));
    expect(config.routes[0]).toEqual({ src: "/(.*)", headers: { "X-Robots-Tag": "noindex" }, continue: true });
    expect(config.routes[1]).toEqual({ handle: "filesystem" });

    await writeVercelOutput(APP, sessionFixture.appRoot, "shared", undefined, false, undefined, {
      runtime: "nodejs22.x",
      trustProxy: false,
    });
    expect(fs.readFileSync(path.join(outputDir, "functions", "index.func", "index.mjs"), "utf-8")).toMatch(/trustProxy"?:\s*false/);
    const plainConfig = JSON.parse(fs.readFileSync(path.join(outputDir, "config.json"), "utf-8"));
    expect(plainConfig.routes[0]).toEqual({ handle: "filesystem" });
  }, 60_000);
});
