/** The desktop sidecar rules that can run without a display (work-notes/desktop/DESIGN.md). */
import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import net from "node:net";
import {
  DESKTOP_LAUNCH_PATH,
  DESKTOP_TOKEN_HEADER,
  generateLaunchToken,
  generateTauriProject,
  isAllowedNavigation,
  mayOpenExternally,
  parseIpcAllowlist,
  pickLoopbackPort,
  startDesktopServer,
  tokensMatch,
  type DesktopServer,
} from "../index.js";

const running: DesktopServer[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map((s) => s.close()));
});

function request(port: number, path: string, headers: Record<string, string> = {}, host = "127.0.0.1"): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, headers: { Host: `${host}:${port}`, ...headers } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function serve() {
  const token = generateLaunchToken();
  const server = await startDesktopServer({ token, handler: (_req, res) => void res.end("app page") });
  running.push(server);
  return { token, server };
}

describe("token", () => {
  it("is 43 base64url characters, different every launch, compared in constant time", () => {
    const a = generateLaunchToken();
    const b = generateLaunchToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(tokensMatch(a, a)).toBe(true);
    expect(tokensMatch(a, b)).toBe(false);
    expect(tokensMatch(a, a.slice(1))).toBe(false);
    expect(tokensMatch(a, undefined)).toBe(false);
  });
});

describe("sidecar server", () => {
  it("listens on 127.0.0.1 only, on a random port", async () => {
    const { server } = await serve();
    const address = server.server.address() as net.AddressInfo;
    expect(address.address).toBe("127.0.0.1");
    const other = await serve();
    expect(other.server.port).not.toBe(server.port);
    await expect(startDesktopServer({ token: generateLaunchToken(), handler: () => {}, host: "0.0.0.0" })).rejects.toThrow(/127\.0\.0\.1 only/);
    await expect(startDesktopServer({ token: generateLaunchToken(), handler: () => {}, host: "::" })).rejects.toThrow(/127\.0\.0\.1 only/);
    expect(await pickLoopbackPort()).toBeGreaterThan(0);
  });

  it("refuses a request without the token, with a wrong one, or for another host", async () => {
    const { token, server } = await serve();
    expect((await request(server.port, "/")).status).toBe(403);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: generateLaunchToken() })).status).toBe(403);
    expect((await request(server.port, "/", { Cookie: `devora_desktop=${generateLaunchToken()}` })).status).toBe(403);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token }, "localhost")).status).toBe(400);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token }, "evil.example")).status).toBe(400);
    const ok = await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token });
    expect(ok.status).toBe(200);
    expect(ok.body).toBe("app page");
  });

  it("the launch URL sets an HttpOnly, SameSite=Strict cookie and redirects; the cookie then works", async () => {
    const { token, server } = await serve();
    expect((await request(server.port, `${DESKTOP_LAUNCH_PATH}?token=${generateLaunchToken()}`)).status).toBe(403);
    expect((await request(server.port, DESKTOP_LAUNCH_PATH)).status).toBe(403);
    const launched = await request(server.port, `${DESKTOP_LAUNCH_PATH}?token=${token}`);
    expect(launched.status).toBe(303);
    expect(launched.headers.location).toBe("/");
    const cookie = String(launched.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    const page = await request(server.port, "/", { Cookie: cookie.split(";")[0]! });
    expect(page.status).toBe(200);
  });
});

describe("window policy", () => {
  const origin = "http://127.0.0.1:43123";
  it("allows only the sidecar's origin", () => {
    expect(isAllowedNavigation(`${origin}/account`, origin)).toBe(true);
    for (const target of ["http://127.0.0.1:43124/", "http://localhost:43123/", "https://evil.example/", "file:///etc/passwd", "javascript:alert(1)", "not a url"]) {
      expect(isAllowedNavigation(target, origin), target).toBe(false);
    }
  });

  it("opens only plain https links in the system browser", () => {
    expect(mayOpenExternally("https://docs.example.com/x")).toBe(true);
    for (const target of ["http://example.com", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,x", "vscode://x", "https://user:pw@example.com"]) {
      expect(mayOpenExternally(target), target).toBe(false);
    }
  });

  it("IPC allowlist: none by default, plain command names only", () => {
    expect(parseIpcAllowlist(undefined)).toEqual([]);
    expect(parseIpcAllowlist(["open_file_dialog", "open_file_dialog"])).toEqual(["open_file_dialog"]);
    for (const bad of [["*"], ["fs:allow-read"], ["../x"], ["Open"], [""], "open_file_dialog"]) {
      expect(() => parseIpcAllowlist(bad), JSON.stringify(bad)).toThrow();
    }
  });
});

describe("generated Tauri project", () => {
  it("grants no command by default, sets the CSP, loads nothing remote, and configures no unsigned updater", () => {
    const files = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0" });
    const conf = JSON.parse(files["tauri.conf.json"]!);
    const capability = JSON.parse(files["capabilities/main.json"]!);
    expect(capability.permissions).toEqual([]);
    expect(conf.app.security.csp).toMatch(/default-src 'self'/);
    expect(conf.app.security.csp).not.toMatch(/unsafe-eval|https?:/);
    expect(conf.app.security.freezePrototype).toBe(true);
    expect(conf.app.withGlobalTauri).toBe(false);
    expect(conf.plugins).toEqual({});
    expect(files["src/main.rs"]).toMatch(/127\.0\.0\.1:0/);
    expect(files["src/main.rs"]).toMatch(/\.env\("DEVORA_DESKTOP_TOKEN"/);
    expect(files["src/main.rs"]).toMatch(/on_navigation/);
    expect(files["src/main.rs"]).not.toMatch(/\.args\(/);
  });

  it("lists allowlisted commands only, and refuses an unsigned or plain-http updater", () => {
    const files = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0", ipc: ["open_file_dialog"] });
    expect(JSON.parse(files["capabilities/main.json"]!).permissions).toEqual(["allow-open-file-dialog"]);
    expect(() => generateTauriProject({ productName: "A", identifier: "com.example.a", version: "1.0.0", updaterEndpoint: "https://u.example.com" })).toThrow(/signed/);
    expect(() => generateTauriProject({ productName: "A", identifier: "com.example.a", version: "1.0.0", updaterEndpoint: "http://u.example.com", updaterPublicKey: "k" })).toThrow(/https/);
    expect(() => generateTauriProject({ productName: 'A"; rm', identifier: "com.example.a", version: "1.0.0" })).toThrow();
    expect(() => generateTauriProject({ productName: "A", identifier: "example", version: "1.0.0" })).toThrow();
  });
});
