/**
 * The HTTP server `devora start` runs: explicit timeouts and a header size
 * limit, with defaults and an app.config.ts override, checked on a real
 * socket (a client that trickles its headers is cut off).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { createNodeServer, DEFAULT_SERVER_LIMITS, resolveServerLimits, type ServerLimits } from "../index.js";

const servers: http.Server[] = [];
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => (s.closeAllConnections(), s.close(r)))));
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

async function start(serverLimits?: ServerLimits): Promise<{ server: http.Server; port: number }> {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), "devora-limits-"));
  dirs.push(appRoot);
  const server = createNodeServer({
    appRoot,
    appName: "limits",
    authMode: "none",
    domain: "limits.example.com",
    security: undefined,
    sitemapEnabled: false,
    serverLimits,
    port: 0,
    host: "127.0.0.1",
  });
  servers.push(server);
  await new Promise<void>((r) => (server.listening ? r() : server.once("listening", () => r())));
  return { server, port: (server.address() as AddressInfo).port };
}

/** Opens a raw connection, writes `first`, then one header byte every `everyMs`; resolves with what the server sent and when it closed. */
function trickle(port: number, first: string, everyMs: number, maxMs: number): Promise<{ response: string; closedAfterMs: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let response = "";
    const socket = net.connect(port, "127.0.0.1", () => socket.write(first));
    const timer = setInterval(() => {
      if (!socket.destroyed) socket.write("x");
    }, everyMs);
    const giveUp = setTimeout(() => socket.destroy(), maxMs);
    socket.on("data", (chunk) => (response += chunk.toString("latin1")));
    socket.on("error", () => {});
    socket.on("close", () => {
      clearInterval(timer);
      clearTimeout(giveUp);
      resolve({ response, closedAfterMs: Date.now() - started });
    });
  });
}

describe("server limits", () => {
  it("are explicit by default", async () => {
    const { server } = await start();
    expect(server.headersTimeout).toBe(DEFAULT_SERVER_LIMITS.headersTimeoutMs);
    expect(server.requestTimeout).toBe(DEFAULT_SERVER_LIMITS.requestTimeoutMs);
    expect(server.keepAliveTimeout).toBe(DEFAULT_SERVER_LIMITS.keepAliveTimeoutMs);
    expect(server.maxHeaderSize ?? DEFAULT_SERVER_LIMITS.maxHeaderBytes).toBe(DEFAULT_SERVER_LIMITS.maxHeaderBytes);
    expect(DEFAULT_SERVER_LIMITS).toEqual({ headersTimeoutMs: 15_000, requestTimeoutMs: 60_000, keepAliveTimeoutMs: 5_000, maxHeaderBytes: 16_384 });
  });

  it("app.config.ts overrides each one; a bad value is a clear error", async () => {
    const { server } = await start({ headersTimeoutMs: 2_000, requestTimeoutMs: 4_000, keepAliveTimeoutMs: 1_000, maxHeaderBytes: 4_096 });
    expect([server.headersTimeout, server.requestTimeout, server.keepAliveTimeout]).toEqual([2_000, 4_000, 1_000]);
    expect(() => resolveServerLimits({ requestTimeoutMs: 0 })).toThrow(/server\.requestTimeoutMs must be a whole number above zero/);
    expect(() => resolveServerLimits({ maxHeaderBytes: 1.5 })).toThrow(/maxHeaderBytes/);
    expect(() => resolveServerLimits({ headersTimeoutMs: 10_000, requestTimeoutMs: 5_000 })).toThrow(/can't be longer than requestTimeoutMs/);
  });

  it("a connection that trickles its headers is answered 408 and closed once headersTimeoutMs passes", async () => {
    const { port } = await start({ headersTimeoutMs: 500, requestTimeoutMs: 5_000 });
    const { response, closedAfterMs } = await trickle(port, "GET / HTTP/1.1\r\nHost: limits.example.com\r\nX-Slow: ", 100, 5_000);
    expect(response).toMatch(/^HTTP\/1\.1 408/);
    expect(closedAfterMs).toBeGreaterThanOrEqual(450);
    expect(closedAfterMs).toBeLessThan(3_000);
  });

  it("headers larger than maxHeaderBytes get a 431", async () => {
    const { port } = await start({ maxHeaderBytes: 2_048 });
    const { response } = await trickle(port, `GET / HTTP/1.1\r\nHost: limits.example.com\r\nX-Big: ${"a".repeat(4_000)}\r\n\r\n`, 10_000, 3_000);
    expect(response).toMatch(/^HTTP\/1\.1 431/);
  });

  it("a normal request still works", async () => {
    const { port } = await start({ headersTimeoutMs: 500 });
    const res = await fetch(`http://127.0.0.1:${port}/nothing-here`);
    expect(res.status).toBe(404);
  });
});
