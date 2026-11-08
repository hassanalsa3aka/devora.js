/**
 * Finding H28 (red team 2026-11-05): a cross-site request to Vite's /__open-in-editor is refused by the real dev
 * server; the overlay's own same-origin request still reaches Vite.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { DevServerHandle } from "../../commands/devExperimental.js";
import { findFreePort } from "../devNetwork.js";
import { isCrossSiteDevRequest } from "../apiMiddleware.js";
import { createFixtureProject, type FixtureProject, bootDevServer } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
let fixture: FixtureProject;
let dev: DevServerHandle | undefined;
let port = 0;

beforeAll(async () => {
  process.env.NODE_ENV = "development";
  fixture = createFixtureProject();
  dev = await bootDevServer({
    projectRoot: fixture.projectRoot,
    app: { name: "fixture", dir: "app", domain: "app.example.com" },
    appRoot: fixture.appRoot,
    authMode: "none",
    appConfig: {},
    sessions: undefined,
    port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
  });
  port = (dev.httpServer!.address() as AddressInfo).port;
}, 30_000);

afterAll(async () => {
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

function get(path: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "localhost", port, path, headers: { Host: `localhost:${port}`, ...headers } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", reject);
    req.end();
  });
}

// The experimental dev server has no editor endpoint at all (design rule 9): every request below is a plain 404.
const EXPERIMENTAL = process.env.DEVORA_TEST_DEV_SERVER === "experimental";

describe("dev server /__open-in-editor guard", () => {
  it("refuses a request the browser marks cross-site or same-site, or with a foreign Origin", async () => {
    const refused = EXPERIMENTAL ? 404 : 403;
    expect(await get("/__open-in-editor?file=/etc/hostname", { "Sec-Fetch-Site": "cross-site" })).toBe(refused);
    expect(await get("/__open-in-editor?file=/etc/hostname", { "Sec-Fetch-Site": "same-site" })).toBe(refused);
    expect(await get("/__open-in-editor?file=/etc/hostname", { Origin: "http://evil.example" })).toBe(refused);
    expect(await get("/__open-in-editor?file=/etc/hostname", { Origin: "null" })).toBe(refused);
  }, 30_000);

  it("lets a same-origin request through to Vite", async () => {
    // No `file` parameter: Vite answers 500 "missing file parameter" without starting an editor.
    const status = await get("/__open-in-editor", { "Sec-Fetch-Site": "same-origin", Origin: `http://localhost:${port}` });
    if (EXPERIMENTAL) expect(status).toBe(404);
    else expect(status).not.toBe(403);
  }, 30_000);

  it("isCrossSiteDevRequest", () => {
    expect(isCrossSiteDevRequest({ host: "localhost:1", "sec-fetch-site": "none" })).toBe(false);
    expect(isCrossSiteDevRequest({ host: "localhost:1" })).toBe(false);
    expect(isCrossSiteDevRequest({ host: "localhost:1", origin: "http://localhost:1" })).toBe(false);
    expect(isCrossSiteDevRequest({ host: "localhost:1", origin: "http://localhost:2" })).toBe(true);
    expect(isCrossSiteDevRequest({ host: "localhost:1", origin: "not a url" })).toBe(true);
  });
});
