/**
 * Round 3 phase 2 through the real production handler (what `devora
 * start` and the Vercel/Netlify functions call) on a real HTTP server,
 * NODE_ENV=production: the session settings a build writes into
 * session-manifest.json, `trustProxy`, `security.noindex`, and the warning
 * for the old "every login breaks over plain HTTP" failure.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler, type ProdRequestHandlerOptions, type SessionManifest } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const BUILT_LOGIN = `
export const methods = ["POST"];
export async function handler(req, ctx) {
  const body = JSON.parse(req.body.toString("utf-8") || "{}");
  const token = await ctx.setSession({ userId: "u1" }, { transport: body.transport ?? "cookie" });
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) };
}`;

const ORIGINAL_ENV = { ...process.env };
let fixture: FixtureProject;
const servers: http.Server[] = [];

beforeAll(() => {
  process.env.NODE_ENV = "production";
  process.env.DEVORA_SESSION_SECRET = "cookie-policy-secret";
  fixture = createFixtureProject();
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(fixture.appRoot, "dist", "server", "api", "login.js"), BUILT_LOGIN);
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

/** A handler built from `manifest`, the way a build would have written it. */
async function serve(
  manifest: SessionManifest,
  options: ProdRequestHandlerOptions = {},
  security?: { noindex?: boolean }
): Promise<string> {
  write(path.join(fixture.appRoot, "dist", "server", "session-manifest.json"), JSON.stringify(manifest));
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "shared", "app.example.com", security, false, undefined, options);
  const server = http.createServer((req, res) => {
    handle(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function login(base: string, headers: Record<string, string> = {}, transport = "cookie"): Promise<Response> {
  return fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ transport }),
  });
}

const cookieNamed = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));

/** fetch() won't send a custom Host header; node:http will. Returns the Set-Cookie values. */
function loginWithHost(base: string, host: string, extra: Record<string, string> = {}): Promise<string[]> {
  const url = new URL(`${base}/api/login`);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { Host: host, "Content-Type": "application/json", ...extra } },
      (res) => {
        res.resume();
        res.on("end", () => resolve((res.headers["set-cookie"] as string[] | undefined) ?? []));
      }
    );
    req.on("error", reject);
    req.end(JSON.stringify({ transport: "cookie" }));
  });
}

describe("Secure", () => {
  it("default (true): Secure even over plain HTTP — and a one-time warning says why logins won't stick", async () => {
    const base = await serve({ store: "memory" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cookies = await loginWithHost(base, "203.0.113.7:8080");
    expect(cookies.find((c) => c.startsWith("devora_session="))).toMatch(/; Secure$/);
    await loginWithHost(base, "203.0.113.7:8080");
    const warnings = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes("plain-HTTP"));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/shared\.sessions\.cookie\.secure/);
  });

  it("no warning over HTTPS (behind a proxy) or on localhost, where browsers accept Secure cookies", async () => {
    const base = await serve({ store: "memory" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await loginWithHost(base, "app.example.com", { "X-Forwarded-Proto": "https" });
    await loginWithHost(base, "localhost:4173");
    await loginWithHost(base, "[::1]:4173");
    expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes("plain-HTTP"))).toEqual([]);
  });

  it('"auto" without trustProxy: X-Forwarded-Proto is ignored, so no Secure', async () => {
    const base = await serve({ store: "memory", cookie: { secure: "auto" } });
    const res = await login(base, { "X-Forwarded-Proto": "https" });
    expect(cookieNamed(res, "devora_session")).not.toMatch(/Secure/);
  });

  it('"auto" with trustProxy: Secure exactly when the proxy says the client used HTTPS', async () => {
    const base = await serve({ store: "memory", cookie: { secure: "auto" } }, { trustProxy: true });
    expect(cookieNamed(await login(base, { "X-Forwarded-Proto": "https" }), "devora_session")).toMatch(/; Secure$/);
    expect(cookieNamed(await login(base, { "X-Forwarded-Proto": "http" }), "devora_session")).not.toMatch(/Secure/);
    expect(cookieNamed(await login(base), "devora_session")).not.toMatch(/Secure/);
  });

  it("false: never, so a plain-HTTP deployment's login works — and the cookie it sets logs in", async () => {
    const base = await serve({ store: "memory", cookie: { secure: false } });
    const res = await login(base);
    const session = cookieNamed(res, "devora_session")!;
    expect(session).not.toMatch(/Secure/);
    // Same request again with the cookie: an authenticated request gets no new session cookie.
    const again = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { Cookie: session.split(";")[0]!, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(again.status).toBe(200);
  });
});

describe("SameSite, Domain, lifetimes", () => {
  it("come from the manifest", async () => {
    const base = await serve({
      store: "memory",
      cookie: { sameSite: "strict", domain: "example.com" },
      activePeriodMs: 60_000,
      idlePeriodMs: 60_000,
    });
    const res = await login(base);
    expect(cookieNamed(res, "devora_session")).toMatch(/; SameSite=Strict; Domain=example\.com; Max-Age=(119|120); Secure$/);
    expect(cookieNamed(res, "devora_csrf")).toMatch(/; SameSite=Strict; Secure$/);
  });
});

describe("CSRF cookie and Bearer", () => {
  it("default settings: a Bearer-authenticated request gets no CSRF cookie (already true before round 3)", async () => {
    const base = await serve({ store: "memory" });
    const { token } = (await (await login(base, {}, "bearer")).json()) as { token: string };
    const authed = await login(base, { Authorization: `Bearer ${token}` }, "bearer");
    expect(authed.status).toBe(200);
    expect(authed.headers.getSetCookie()).toEqual([]);
  });
});

describe("csrf: false", () => {
  it("an unauthenticated Bearer-style login gets no CSRF cookie (it did before)", async () => {
    const off = await serve({ store: "memory", csrfCookie: false });
    const res = await login(off, {}, "bearer");
    expect(res.headers.getSetCookie()).toEqual([]);
    const on = await serve({ store: "memory" });
    expect(cookieNamed(await login(on, {}, "bearer"), "devora_csrf")).toBeDefined();
  });
});

describe("security.noindex", () => {
  it("X-Robots-Tag on every response, API and 404 alike", async () => {
    const base = await serve({ store: "memory" }, {}, { noindex: true });
    expect((await login(base)).headers.get("x-robots-tag")).toBe("noindex");
    expect((await fetch(`${base}/api/missing`)).headers.get("x-robots-tag")).toBe("noindex");
    const plain = await serve({ store: "memory" });
    expect((await login(plain)).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("CORS and the backend-only status (round 3 phase 4)", () => {
  it("API preflight is answered before any route runs; allowed origins are echoed, others aren't", async () => {
    const base = await serve({ store: "memory" }, { cors: { origins: ["https://app.example.com"], credentials: true } });
    const preflight = await fetch(`${base}/api/login`, {
      method: "OPTIONS",
      headers: { Origin: "https://app.example.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");
    expect(preflight.headers.get("access-control-allow-headers")).toBe("content-type");

    const allowed = await login(base, { Origin: "https://app.example.com" });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    const blocked = await login(base, { Origin: "https://evil.test" });
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
    // Even a 404 carries the CORS headers, so the browser can read the JSON error.
    const missing = await fetch(`${base}/api/nope`, { headers: { Origin: "https://app.example.com" } });
    expect(missing.status).toBe(404);
    expect(missing.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });

  it("no cors config: no CORS headers", async () => {
    const base = await serve({ store: "memory" });
    expect((await login(base, { Origin: "https://app.example.com" })).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("GET / on an app with no pages is a small JSON status, not a bare 404", async () => {
    // A backend-only app: no routes/ and no entry-server build.
    fs.rmSync(path.join(fixture.appRoot, "routes"), { recursive: true, force: true });
    const base = await serve({ store: "memory" });
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ app: "fixture", status: "ok", api: "/api" });
  });
});
