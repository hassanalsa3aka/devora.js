/**
 * Finding H34 (red team 2026-11-05): Vite's HMR WebSocket accepted a client that sent no Origin header. `devora dev` now closes an
 * HMR upgrade that carries no Origin; the predicate is tested alone and the refusal is tested against the real dev server.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import net from "node:net";
import type { AddressInfo } from "node:net";
import type { DevServerHandle } from "../../commands/devExperimental.js";
import { findFreePort } from "../devNetwork.js";
import { isHmrUpgradeWithoutOrigin } from "../apiMiddleware.js";
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
}, 60_000);

afterAll(async () => {
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

/** Sends a raw WebSocket upgrade and returns the first line of the answer. */
function upgrade(headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "localhost", () => {
      const lines = ["GET /?token=none HTTP/1.1", `Host: localhost:${port}`, "Upgrade: websocket", "Connection: Upgrade", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==", "Sec-WebSocket-Version: 13", ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), "", ""];
      socket.write(lines.join("\r\n"));
    });
    let data = "";
    socket.on("data", (c) => (data += c.toString()));
    socket.on("close", () => resolve(data.split("\r\n")[0] ?? ""));
    socket.on("error", reject);
    setTimeout(() => {
      socket.destroy();
    }, 2000);
  });
}

describe("H34: HMR WebSocket without an Origin", () => {
  it("the predicate: only an HMR upgrade with no Origin is refused", () => {
    expect(isHmrUpgradeWithoutOrigin({ "sec-websocket-protocol": "vite-hmr" })).toBe(true);
    expect(isHmrUpgradeWithoutOrigin({ "sec-websocket-protocol": "vite-hmr", origin: "" })).toBe(true);
    expect(isHmrUpgradeWithoutOrigin({ "sec-websocket-protocol": "vite-hmr", origin: "http://localhost:1" })).toBe(false);
    expect(isHmrUpgradeWithoutOrigin({ origin: undefined })).toBe(false); // another protocol is not this guard's business
  });

  it("the real dev server answers 403 and closes for an HMR upgrade without Origin", async () => {
    expect(await upgrade({ "Sec-WebSocket-Protocol": "vite-hmr" })).toBe("HTTP/1.1 403 Forbidden");
  });

  it("an HMR upgrade with an Origin is not refused by the guard", async () => {
    const line = await upgrade({ "Sec-WebSocket-Protocol": "vite-hmr", Origin: `http://localhost:${port}` });
    expect(line).not.toBe("HTTP/1.1 403 Forbidden");
  });
});
