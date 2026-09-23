/**
 * The production request handler (what adapter-node, `devora start`, and the
 * Vercel/Netlify functions all call) behind a real `node:http` server, with
 * NODE_ENV=production. The "built" route files are hand-written plain ESM
 * standing in for `dist/server/**` — the handler only ever `import()`s
 * them, so this exercises the real production dispatch, session, and error
 * paths without a multi-second Vite build per test run. (A full
 * `devora build && devora start` run was also done by hand — see
 * devora-pre-v3-hotfixes.md.)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler } from "@devorajs/core";
import { createFixtureProject, setCookieValue, write, type FixtureProject } from "./fixtureApp.js";

const BUILT_API: Record<string, string> = {
  "login.js": `
export const methods = ["POST"];
export async function handler(req, ctx) {
  const body = JSON.parse(req.body.toString("utf-8") || "{}");
  const token = await ctx.setSession({ userId: body.userId }, { transport: body.transport ?? "bearer" });
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) };
}`,
  "me.js": `
export function handler(_req, ctx) {
  ctx.requireAuth();
  return { status: 200, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: ctx.session, transport: ctx.sessionTransport }) };
}`,
  "transfer.js": `
export const methods = ["POST"];
export function handler(req, ctx) {
  ctx.requireAuth();
  const t = req.headers["x-devora-csrf"];
  ctx.verifyCsrf(typeof t === "string" ? t : "");
  return { status: 200, body: "ok" };
}`,
  "logout.js": `
export const methods = ["POST"];
export async function handler(_req, ctx) {
  ctx.requireAuth();
  await ctx.revokeSession();
  return { status: 204 };
}`,
  "boom.js": `
export function handler() { throw new Error("SELECT secret FROM internals"); }`,
};

const ORIGINAL_ENV = { ...process.env };
let fixture: FixtureProject;
let server: http.Server;
let base: string;

function serve(handleRequest: ReturnType<typeof createProdRequestHandler>): Promise<{ server: http.Server; base: string }> {
  // Same shape as adapter-node's own server wrapper.
  const s = http.createServer((req, res) => {
    handleRequest(req, res)
      .then((handled) => {
        if (!handled) {
          res.statusCode = 404;
          res.end("Not Found");
        }
      })
      .catch(() => {
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
  });
  return new Promise((resolve) =>
    s.listen(0, "127.0.0.1", () => resolve({ server: s, base: `http://127.0.0.1:${(s.address() as AddressInfo).port}` }))
  );
}

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

beforeAll(async () => {
  process.env.NODE_ENV = "production";
  process.env.DEVORA_SESSION_SECRET = "integration-test-secret";
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  for (const [file, source] of Object.entries(BUILT_API)) write(path.join(serverOut, "api", file), source);
  // A project-supplied, module-backed store (shared.sessions.store = "<path>"),
  // as buildAppServer.ts would bundle it — records calls so the test can
  // prove the handler really used it rather than the built-in memory store.
  write(
    path.join(serverOut, "session-store.js"),
    `const records = new Map();
globalThis.__devoraTestStoreCalls = [];
const log = (op) => globalThis.__devoraTestStoreCalls.push(op);
export default {
  get(key) { log("get"); return records.get(key); },
  set(key, record) { log("set"); records.set(key, JSON.parse(JSON.stringify(record))); },
  delete(key) { log("delete"); records.delete(key); },
};`
  );
  write(path.join(serverOut, "session-manifest.json"), JSON.stringify({ store: "module" }));

  const handleRequest = createProdRequestHandler(fixture.appRoot, "fixture", "shared", "fixture.example.com", undefined, false);
  ({ server, base } = await serve(handleRequest));
});

afterAll(async () => {
  await new Promise((r) => server?.close(r));
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

describe("production handler — api/** JSON contract", () => {
  it("unmatched /api/** paths are a JSON 404, not the adapter's plain-text 404", async () => {
    for (const p of ["/api/nope", "/api/a/b/c", "/api"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status, p).toBe(404);
      expect(res.headers.get("content-type"), p).toMatch(/^application\/json/);
      expect(await res.json(), p).toEqual({ message: "Not found" });
    }
  });

  it("an uncaught throw is a JSON 500 whose internal message is NOT leaked in production", async () => {
    const res = await fetch(`${base}/api/boom`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
  });

  it("a route whose built file is missing is a JSON 500, not the adapter's plain-text one", async () => {
    // api/broken-import.ts exists in source (so it matches) but was never "built".
    const res = await fetch(`${base}/api/broken-import`);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
  });

  it("a non-API page 404 is unchanged (still the adapter's own response)", async () => {
    const res = await fetch(`${base}/no-such-page`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type") ?? "").not.toMatch(/json/);
  });
});

describe("production handler — unified session auth", () => {
  it("uses the project's configured store module, not the built-in memory store", async () => {
    const before = (globalThis as { __devoraTestStoreCalls?: string[] }).__devoraTestStoreCalls?.length ?? 0;
    await fetch(`${base}/api/login`, json({ userId: "store-check" }));
    const calls = (globalThis as { __devoraTestStoreCalls?: string[] }).__devoraTestStoreCalls ?? [];
    expect(calls.length).toBeGreaterThan(before);
    expect(calls).toContain("set");
  });

  it("cookie + Bearer via one store; revocation kills both; production cookie is Secure", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "alice", transport: "cookie" }));
    const setCookie = login.headers.getSetCookie().find((c) => c.startsWith("devora_session="))!;
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    const id = setCookieValue(login, "devora_session")!;

    expect((await fetch(`${base}/api/me`, { headers: { Cookie: `devora_session=${id}` } })).status).toBe(200);
    expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${id}` } })).status).toBe(200);

    expect((await fetch(`${base}/api/logout`, { method: "POST", headers: { Authorization: `Bearer ${id}` } })).status).toBe(
      204
    );
    expect((await fetch(`${base}/api/me`, { headers: { Cookie: `devora_session=${id}` } })).status).toBe(401);
    expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${id}` } })).status).toBe(401);
  });

  it("CSRF: enforced for the cookie transport, skipped for Bearer", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "carol", transport: "cookie" }));
    const id = setCookieValue(login, "devora_session")!;
    const csrf = setCookieValue(login, "devora_csrf")!;

    const cookieNoToken = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Cookie: `devora_session=${id}; devora_csrf=${csrf}` },
    });
    expect(cookieNoToken.status).toBe(403);

    const cookieWithToken = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Cookie: `devora_session=${id}; devora_csrf=${csrf}`, "x-devora-csrf": csrf },
    });
    expect(cookieWithToken.status).toBe(200);

    const bearerNoToken = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${id}` },
    });
    expect(bearerNoToken.status).toBe(200);
  });
});

describe("production handler — refuses to guess a session store", () => {
  it("throws at creation when no store is configured (no manifest), instead of silently using memory", () => {
    const bare = createFixtureProject();
    try {
      expect(() =>
        createProdRequestHandler(bare.appRoot, "fixture", "shared", "fixture.example.com", undefined, false)
      ).toThrow(/no session store configured/);
    } finally {
      bare.cleanup();
    }
  });

  it("an auth: \"none\" app needs neither a store nor a secret", () => {
    const bare = createFixtureProject();
    const secret = process.env.DEVORA_SESSION_SECRET;
    delete process.env.DEVORA_SESSION_SECRET;
    try {
      expect(() =>
        createProdRequestHandler(bare.appRoot, "fixture", "none", "fixture.example.com", undefined, false)
      ).not.toThrow();
    } finally {
      process.env.DEVORA_SESSION_SECRET = secret;
      bare.cleanup();
    }
  });
});
