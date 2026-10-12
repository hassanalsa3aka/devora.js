/**
 * Round 3 V2: `apiDir` in app.config.ts moves the API route *folder* only —
 * URLs stay under /api — in both the real dev server and the production
 * handler, and the default `api/` folder stops being served once apiDir
 * points elsewhere.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { ViteDevServer } from "vite";
import { createProdRequestHandler } from "@devorajs/core";
import { createAppDevServer } from "../../commands/dev.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const HELLO = (from: string) => `
export const handler = () => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "${from}" }) });
`;

let fixture: FixtureProject;
let dev: ViteDevServer;
let devBase: string;
let prod: http.Server;
let prodBase: string;

beforeAll(async () => {
  fixture = createFixtureProject();
  write(path.join(fixture.appRoot, "endpoints", "hello.ts"), HELLO("endpoints"));
  write(path.join(fixture.appRoot, "endpoints", "users", "[id].ts"), HELLO("endpoints-dynamic"));
  // The default folder still exists in the fixture — it must NOT be served.
  write(path.join(fixture.appRoot, "api", "hello.ts"), HELLO("api"));

  dev = await createAppDevServer({
    projectRoot: fixture.projectRoot,
    app: { name: "fixture", dir: "app", domain: "fixture.example.com" },
    appRoot: fixture.appRoot,
    authMode: "none",
    appConfig: { apiDir: "endpoints" },
    sessions: undefined,
    port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
  });
  devBase = `http://localhost:${(dev.httpServer!.address() as AddressInfo).port}`;

  // Production: hand-written "built" output at the path buildAppServer
  // produces for an endpoints/ source file (build key = endpoints/hello).
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "endpoints", "hello.js"), HELLO("built-endpoints"));
  write(path.join(serverOut, "endpoints", "users", "_id_.js"), HELLO("built-endpoints-dynamic"));
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, false, undefined, {
    apiDir: "endpoints",
  });
  prod = http.createServer((req, res) => {
    handle(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((r) => prod.listen(0, "127.0.0.1", r));
  prodBase = `http://127.0.0.1:${(prod.address() as AddressInfo).port}`;
}, 30_000);

afterAll(async () => {
  await dev?.close();
  await new Promise((r) => prod?.close(r));
  fixture?.cleanup();
});

describe("apiDir: endpoints/ serves /api/**", () => {
  it("dev: /api/hello comes from endpoints/hello.ts, dynamic segments too", async () => {
    expect(await (await fetch(`${devBase}/api/hello`)).json()).toEqual({ from: "endpoints" });
    expect(await (await fetch(`${devBase}/api/users/7`)).json()).toEqual({ from: "endpoints-dynamic" });
  });

  it("dev: the old api/ folder is no longer routed, and /endpoints/* isn't an API URL", async () => {
    // fixture's api/ has e.g. boom.ts — not reachable any more.
    expect((await fetch(`${devBase}/api/boom`)).status).toBe(404);
    expect((await fetch(`${devBase}/endpoints/hello`)).headers.get("content-type") ?? "").not.toMatch(/application\/json/);
  });

  it("production handler: same mapping, from the built endpoints/ output", async () => {
    expect(await (await fetch(`${prodBase}/api/hello`)).json()).toEqual({ from: "built-endpoints" });
    expect(await (await fetch(`${prodBase}/api/users/7`)).json()).toEqual({ from: "built-endpoints-dynamic" });
    const unmatched = await fetch(`${prodBase}/api/boom`);
    expect(unmatched.status).toBe(404);
    expect(await unmatched.json()).toEqual({ message: expect.any(String) });
  });

  it("the dev fixture really has both folders (guards the test itself)", () => {
    expect(fs.existsSync(path.join(fixture.appRoot, "api", "boom.ts"))).toBe(true);
  });
});
