/**
 * app.config.ts `allowedHosts` through the real production handler and the
 * real dev server: an unknown Host (or trusted X-Forwarded-Host) is a 400
 * before any route runs; unset, nothing changes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler, type ProdRequestHandlerOptions } from "@devorajs/core";
import type { DevServerHandle } from "../../commands/devExperimental.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, PAGE_ROUTES, write, type FixtureProject, bootDevServer } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;
const HOSTS = ["app.example.com", ".example.org"];

let fixture: FixtureProject;
const servers: http.Server[] = [];
let dev: DevServerHandle | undefined;

beforeAll(() => {
  process.env.NODE_ENV = "production";
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(serverOut, "routes", "index.js"), PAGE_ROUTES["index.ts"]!);
});

afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

async function serve(options: ProdRequestHandlerOptions): Promise<number> {
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "none", "app.example.com", undefined, false, undefined, options);
  const server = http.createServer((req, res) => {
    handle(req, res).then((done) => {
      if (!done) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return (server.address() as AddressInfo).port;
}

/** node:http, so a custom Host header is sent as written. */
function get(port: number, headers: Record<string, string>, pathname = "/", connectTo = "127.0.0.1"): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: connectTo, port, path: pathname, headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

/** HTTP/1.0 with no Host header at all. */
function getWithoutHost(port: number): Promise<string> {
  return new Promise((resolve) => {
    let out = "";
    const socket = net.connect(port, "127.0.0.1", () => socket.write("GET / HTTP/1.0\r\n\r\n"));
    socket.on("data", (c) => (out += c.toString()));
    socket.on("close", () => resolve(out));
  });
}

describe("production handler", () => {
  it("unset: any host is served, as before", async () => {
    const port = await serve({});
    expect((await get(port, { Host: "evil.com" })).status).toBe(200);
  });

  it("set: a listed host is served; any other host, a look-alike or no host is a 400 before any route runs", async () => {
    const port = await serve({ allowedHosts: HOSTS });
    expect((await get(port, { Host: "app.example.com" })).status).toBe(200);
    expect((await get(port, { Host: "shop.example.org:8443" })).status).toBe(200);
    for (const host of ["evil.com", "app.example.com.evil.com", "example.com"]) {
      const res = await get(port, { Host: host });
      expect(res.status, host).toBe(400);
      expect(res.body, host).toBe("Bad Request: unknown host");
    }
    expect((await get(port, { Host: "evil.com" }, "/api/anything")).status).toBe(400);
    expect(await getWithoutHost(port)).toMatch(/^HTTP\/1\.1 400/);
  });

  it("X-Forwarded-Host is checked only when trustProxy is on", async () => {
    const trusting = await serve({ allowedHosts: HOSTS, trustProxy: true });
    expect((await get(trusting, { Host: "127.0.0.1", "X-Forwarded-Host": "app.example.com" })).status).toBe(200);
    expect((await get(trusting, { Host: "app.example.com", "X-Forwarded-Host": "evil.com" })).status).toBe(400);
    const notTrusting = await serve({ allowedHosts: HOSTS });
    expect((await get(notTrusting, { Host: "app.example.com", "X-Forwarded-Host": "evil.com" })).status).toBe(200);
    expect((await get(notTrusting, { Host: "evil.com", "X-Forwarded-Host": "app.example.com" })).status).toBe(400);
  });
});

describe("dev server", () => {
  it("the same 400 for an unknown host, API routes included; localhost still works", async () => {
    process.env.NODE_ENV = "development";
    dev = await bootDevServer({
      projectRoot: fixture.projectRoot,
      app: { name: "fixture", dir: "app", domain: "app.example.com" },
      appRoot: fixture.appRoot,
      authMode: "none",
      appConfig: { allowedHosts: HOSTS },
      sessions: undefined,
      port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
    });
    const port = (dev.httpServer!.address() as AddressInfo).port;
    expect((await get(port, { Host: `localhost:${port}` }, "/", "localhost")).status).toBe(200);
    // An unlisted host is refused either by Devora's check (400) or, on Vite 7 and 8, by Vite's own host check, which gets the same list and answers 403 first.
    const refused = (status: number) => expect([400, 403]).toContain(status);
    refused((await get(port, { Host: "evil.com" }, "/", "localhost")).status);
    refused((await get(port, { Host: "evil.com" }, "/api/whatever", "localhost")).status);
    // Finding H22: a listed host that is not localhost reaches the app; Vite's own check does not answer 403 for it.
    expect((await get(port, { Host: "app.example.com" }, "/", "localhost")).status).toBe(200);
    expect((await get(port, { Host: "dev.example.org" }, "/", "localhost")).status).toBe(200);
    refused((await get(port, { Host: "app.example.com.evil.com" }, "/", "localhost")).status);
  }, 30_000);
});
