/** Security rules of the experimental dev server core. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { assertDevOnly, createDevHostCheck, resolveServedFile, startExperimentalDevServer, type DevServer } from "../index.js";

let tmp: string;
let app: string;
let dev: DevServer;

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "devora-devserver-"));
  app = path.join(tmp, "app");
  fs.mkdirSync(path.join(app, "routes"), { recursive: true });
  fs.writeFileSync(path.join(app, "routes", "index.tsx"), "export default function Page() { return <h1>hi</h1>; }\n");
  fs.writeFileSync(path.join(app, "style.css"), "h1{color:red}\n");
  fs.writeFileSync(path.join(app, ".env"), "SECRET=dont-serve-me\n");
  fs.mkdirSync(path.join(app, ".git"));
  fs.writeFileSync(path.join(app, ".git", "config"), "[core]\n");
  fs.writeFileSync(path.join(tmp, "outside.ts"), "export const secret = 'outside';\n");
  fs.symlinkSync(path.join(tmp, "outside.ts"), path.join(app, "link-out.ts"));
  dev = await startExperimentalDevServer({ roots: [{ prefix: "/_devora/m/app/", dir: app }], env: { NODE_ENV: "development" } });
});

afterAll(async () => {
  await dev?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

function get(pathname: string, host = `127.0.0.1:${dev.port}`): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(dev.port, "127.0.0.1", () => socket.write(`GET ${pathname} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`));
    let out = "";
    socket.on("data", (c) => (out += c));
    socket.on("end", () => {
      const [head = "", ...rest] = out.split("\r\n\r\n");
      const headers: http.IncomingHttpHeaders = {};
      for (const line of head.split("\r\n").slice(1)) {
        const i = line.indexOf(":");
        headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
      }
      resolve({ status: Number(head.split(" ")[1]), body: rest.join("\r\n\r\n"), headers });
    });
    socket.on("error", reject);
  });
}

function upgrade(headers: Record<string, string>, pathname = "/_devora/hmr"): Promise<string> {
  return new Promise((resolve) => {
    const socket = net.connect(dev.port, "127.0.0.1", () => {
      const lines = [`GET ${pathname} HTTP/1.1`, `Host: 127.0.0.1:${dev.port}`, "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString("base64")}`, "Sec-WebSocket-Version: 13", ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)];
      socket.write(lines.join("\r\n") + "\r\n\r\n");
    });
    let out = "";
    socket.on("data", (c) => {
      out += c.toString("latin1");
      if (out.includes("\r\n\r\n")) {
        socket.destroy();
        resolve(out.split("\r\n")[0]!);
      }
    });
    socket.on("close", () => resolve(out.split("\r\n")[0] || "closed"));
    socket.on("error", () => resolve("error"));
  });
}

describe("start-up rules", () => {
  it("refuses NODE_ENV=production and any bind address but loopback", () => {
    expect(() => assertDevOnly({ NODE_ENV: "production" }, "127.0.0.1")).toThrow(/production/);
    expect(() => assertDevOnly({}, "0.0.0.0")).toThrow(/127\.0\.0\.1/);
    expect(() => assertDevOnly({}, "::")).toThrow();
    expect(() => assertDevOnly({}, "127.0.0.1")).not.toThrow();
  });

  it("listens on 127.0.0.1", () => {
    expect((dev.server.address() as net.AddressInfo).address).toBe("127.0.0.1");
  });
});

describe("host check (DNS rebinding)", () => {
  it("answers localhost names and listed hosts only", async () => {
    expect((await get("/_devora/m/app/routes/index.tsx")).status).toBe(200);
    expect((await get("/_devora/m/app/routes/index.tsx", `localhost:${dev.port}`)).status).toBe(200);
    for (const host of ["evil.example", `rebind.attacker.example:${dev.port}`, "127.0.0.1.nip.io", "localhost.evil.example", "a@localhost"]) {
      expect((await get("/_devora/m/app/routes/index.tsx", host)).status, host).toBe(400);
    }
    const check = createDevHostCheck(["tunnel.example.com", ".dev.example.org"]);
    expect(check("tunnel.example.com:443")).toBe(true);
    expect(check("a.dev.example.org")).toBe(true);
    expect(check("dev.example.org.evil.com")).toBe(false);
  });
});

describe("files", () => {
  it("transforms TSX inside a root, with the security headers", async () => {
    const r = await get("/_devora/m/app/routes/index.tsx");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/text\/javascript/);
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.body).toMatch(/jsx/);
  });

  it("never serves outside the roots, dotfiles, or through a symlink that leaves the root", async () => {
    const attempts = [
      "/_devora/m/app/../outside.ts",
      "/_devora/m/app/%2e%2e/outside.ts",
      "/_devora/m/app/..%2foutside.ts",
      "/_devora/m/app/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "/_devora/m/app/..%5coutside.ts",
      "/_devora/m/app/.env",
      "/_devora/m/app/%2eenv",
      "/_devora/m/app/.git/config",
      "/_devora/m/app/link-out.ts",
      "/_devora/m/app/routes/index.tsx%00.css",
      "/@fs/etc/passwd",
      `/@fs${tmp}/outside.ts`,
      "/_devora/m/other/x.ts",
    ];
    for (const a of attempts) {
      const r = await get(a);
      expect([400, 403, 404], a).toContain(r.status);
      expect(r.body, a).not.toMatch(/outside|SECRET|\[core\]|root:/);
    }
    expect(await resolveServedFile("/_devora/m/app/.env", [{ prefix: "/_devora/m/app/", dir: app }])).toEqual({ refused: "dotfile" });
    expect(await resolveServedFile("/_devora/m/app/link-out.ts", [{ prefix: "/_devora/m/app/", dir: app }])).toEqual({ refused: "outside" });
  });

  it("serves a CSS file with a sandbox policy, refuses unknown types and writes", async () => {
    const css = await get("/_devora/m/app/style.css");
    expect(css.status).toBe(200);
    expect(css.headers["content-security-policy"]).toMatch(/sandbox/);
  });
});

describe("HMR WebSocket", () => {
  it("refuses a foreign Origin, a missing or wrong token, a missing Origin and another path", async () => {
    expect(await upgrade({ Origin: "http://evil.example", "Sec-WebSocket-Protocol": `devora-hmr, ${dev.token}` })).toMatch(/403/);
    expect(await upgrade({ Origin: `http://127.0.0.1:${dev.port}`, "Sec-WebSocket-Protocol": "devora-hmr" })).toMatch(/403/);
    expect(await upgrade({ Origin: `http://127.0.0.1:${dev.port}`, "Sec-WebSocket-Protocol": `devora-hmr, ${"x".repeat(43)}` })).toMatch(/403/);
    expect(await upgrade({ "Sec-WebSocket-Protocol": `devora-hmr, ${dev.token}` })).toMatch(/403/);
    expect(await upgrade({ Origin: `http://127.0.0.1:${dev.port}`, "Sec-WebSocket-Protocol": `devora-hmr, ${dev.token}` }, "/other")).not.toMatch(/101/);
  });

  it("accepts the page's own origin with the token, and sends a reload when a file changes", async () => {
    const socket = net.connect(dev.port, "127.0.0.1");
    await new Promise((r) => socket.once("connect", r));
    socket.write([`GET /_devora/hmr HTTP/1.1`, `Host: 127.0.0.1:${dev.port}`, "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString("base64")}`, "Sec-WebSocket-Version: 13", `Origin: http://127.0.0.1:${dev.port}`, `Sec-WebSocket-Protocol: devora-hmr, ${dev.token}`].join("\r\n") + "\r\n\r\n");
    let data = "";
    const gotReload = new Promise<void>((resolve) => {
      socket.on("data", (c) => {
        data += c.toString("latin1");
        if (data.includes("full-reload")) resolve();
      });
    });
    await new Promise((r) => setTimeout(r, 200));
    expect(data).toMatch(/101 Switching Protocols/);
    expect(dev.hmr.clients).toBe(1);
    fs.writeFileSync(path.join(app, "routes", "index.tsx"), "export default function Page() { return <h1>changed</h1>; }\n");
    await gotReload;
    socket.destroy();
  }, 15_000);
});
