/**
 * Real `devora dev` servers (createAppDevServer — the exact function `dev()`
 * calls), listening on real ports, hit with real HTTP requests. Covers
 * devora-pre-v3-hotfixes.md #2/#6 (the api/** JSON contract) and the
 * unified session auth addendum (cookie + Bearer through one store,
 * revocation, transport-aware CSRF, idle renewal, expiry).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { ViteDevServer } from "vite";
import { createAppDevServer } from "../../commands/dev.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, setCookieValue, type FixtureProject } from "./fixtureApp.js";
import type { SessionsConfig } from "@devorajs/core";

async function boot(fixture: FixtureProject, sessions: SessionsConfig): Promise<{ server: ViteDevServer; base: string }> {
  const server = await createAppDevServer({
    projectRoot: fixture.projectRoot,
    app: { name: "fixture", dir: "app", domain: "fixture.example.com" },
    appRoot: fixture.appRoot,
    authMode: "shared",
    appConfig: {},
    sessions,
    // Not 0: Vite treats a falsy port as "use the default" (5173). A random
    // high base keeps parallel test files from colliding.
    port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
  });
  const { port } = server.httpServer!.address() as AddressInfo;
  return { server, base: `http://localhost:${port}` };
}

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

let fixture: FixtureProject;
let server: ViteDevServer;
let base: string;

beforeAll(async () => {
  fixture = createFixtureProject();
  ({ server, base } = await boot(fixture, { store: "memory" }));
}, 30_000);

afterAll(async () => {
  await server?.close();
  fixture?.cleanup();
});

describe("api/** JSON contract — real dev server", () => {
  it("an uncaught throw in an apiRoute() handler is a JSON 500 with the message, not Vite's HTML overlay", async () => {
    const res = await fetch(`${base}/api/boom`);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await res.json()).toEqual({ message: "kaboom from a handler" });
  });

  it("a handler exported without apiRoute() is still JSON (dispatcher-level catch)", async () => {
    const res = await fetch(`${base}/api/unwrapped`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "kaboom without apiRoute" });
  });

  it("an HttpError keeps its own status", async () => {
    const res = await fetch(`${base}/api/teapot`);
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ message: "short and stout" });
  });

  it("a route module that fails to load is JSON too (the middleware-level catch)", async () => {
    const res = await fetch(`${base}/api/broken-import`);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(typeof ((await res.json()) as { message: unknown }).message).toBe("string");
  });

  it("an unmatched /api/** path is a JSON 404, not Connect's HTML 'Cannot GET'", async () => {
    for (const p of ["/api/does-not-exist", "/api/nested/nope", "/api"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status, p).toBe(404);
      expect(res.headers.get("content-type"), p).toMatch(/^application\/json/);
      expect(await res.json(), p).toEqual({ message: "Not found" });
    }
  });

  it("API responses still carry the default security headers", async () => {
    const res = await fetch(`${base}/api/does-not-exist`);
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("x-frame-options")).toBeTruthy();
  });

  it("page routes are untouched: a throwing page loader still gets the HTML error response", async () => {
    const res = await fetch(`${base}/page-boom`);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
  });

  it("a normal page route still renders", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("fixture home");
  });
});

describe("unified session auth — real dev server", () => {
  it("unauthenticated: 401 JSON on both an empty request and a bogus Bearer token", async () => {
    const bare = await fetch(`${base}/api/me`);
    expect(bare.status).toBe(401);
    expect(await bare.json()).toEqual({ message: "Authentication required" });
    const bogus = await fetch(`${base}/api/me`, { headers: { Authorization: "Bearer nope" } });
    expect(bogus.status).toBe(401);
  });

  it("one session is valid via the cookie AND via Authorization: Bearer; revoking it kills both immediately", async () => {
    // Browser-style login: the session ID arrives as an HttpOnly cookie.
    const login = await fetch(`${base}/api/login`, json({ userId: "alice", transport: "cookie" }));
    expect(login.status).toBe(200);
    const sessionId = setCookieValue(login, "devora_session")!;
    expect(sessionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(login.headers.getSetCookie().find((c) => c.startsWith("devora_session="))).toContain("HttpOnly");

    const viaCookie = await fetch(`${base}/api/me`, { headers: { Cookie: `devora_session=${sessionId}` } });
    expect(viaCookie.status).toBe(200);
    expect(await viaCookie.json()).toEqual({ session: { userId: "alice" }, transport: "cookie" });

    const viaBearer = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${sessionId}` } });
    expect(viaBearer.status).toBe(200);
    expect(await viaBearer.json()).toEqual({ session: { userId: "alice" }, transport: "bearer" });

    // Revoke over Bearer (a mobile logout)...
    const logout = await fetch(`${base}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    expect(logout.status).toBe(204);

    // ...and it's dead on both transports on the very next request.
    expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${sessionId}` } })).status).toBe(401);
    const cookieAfter = await fetch(`${base}/api/me`, { headers: { Cookie: `devora_session=${sessionId}` } });
    expect(cookieAfter.status).toBe(401);
    // The browser is told to drop the dead cookie.
    expect(cookieAfter.headers.getSetCookie().some((c) => c.startsWith("devora_session=;") && c.includes("Max-Age=0"))).toBe(
      true
    );
  });

  it("revoking via the cookie transport kills the Bearer use of the same session too", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "bob", transport: "cookie" }));
    const sessionId = setCookieValue(login, "devora_session")!;
    const csrf = setCookieValue(login, "devora_csrf")!;

    const logout = await fetch(`${base}/api/logout`, {
      method: "POST",
      headers: { Cookie: `devora_session=${sessionId}; devora_csrf=${csrf}` },
    });
    expect(logout.status).toBe(204);
    expect(logout.headers.getSetCookie().some((c) => c.startsWith("devora_session=;"))).toBe(true);
    expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${sessionId}` } })).status).toBe(401);
  });

  it("a Bearer login sets no session cookie and returns the token in the body", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "mobile-user" }));
    expect(setCookieValue(login, "devora_session")).toBeUndefined();
    // An API/mobile caller isn't issued a CSRF cookie either... only once it
    // presents a Bearer header; this first unauthenticated call has none.
    const { token } = (await login.json()) as { token: string };
    const me = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(await me.json()).toEqual({ session: { userId: "mobile-user" }, transport: "bearer" });
    expect(setCookieValue(me, "devora_csrf")).toBeUndefined();
  });

  it("CSRF is enforced for cookie auth: no token → 403, wrong token → 403, right token → 200", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "carol", transport: "cookie" }));
    const sessionId = setCookieValue(login, "devora_session")!;
    const csrf = setCookieValue(login, "devora_csrf")!;
    const cookie = `devora_session=${sessionId}; devora_csrf=${csrf}`;

    const noToken = await fetch(`${base}/api/transfer`, { method: "POST", headers: { Cookie: cookie } });
    expect(noToken.status).toBe(403);
    expect(await noToken.json()).toEqual({ message: "Missing or invalid CSRF token" });

    const wrongToken = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Cookie: cookie, "x-devora-csrf": "forged" },
    });
    expect(wrongToken.status).toBe(403);

    const rightToken = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Cookie: cookie, "x-devora-csrf": csrf },
    });
    expect(rightToken.status).toBe(200);
  });

  it("CSRF is NOT enforced for Bearer auth — the same session, sent as a Bearer token, needs no token", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "dave", transport: "cookie" }));
    const sessionId = setCookieValue(login, "devora_session")!;
    const res = await fetch(`${base}/api/transfer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    expect(res.status).toBe(200);
  });

  it("a request carrying a valid session cookie plus a bogus Bearer header is NOT authenticated by the cookie", async () => {
    const login = await fetch(`${base}/api/login`, json({ userId: "erin", transport: "cookie" }));
    const sessionId = setCookieValue(login, "devora_session")!;
    const res = await fetch(`${base}/api/me`, {
      headers: { Cookie: `devora_session=${sessionId}`, Authorization: "Bearer bogus" },
    });
    expect(res.status).toBe(401);
  });
});

describe("session states over real time — real dev server", () => {
  let shortFixture: FixtureProject;
  let shortServer: ViteDevServer;
  let shortBase: string;

  beforeAll(async () => {
    shortFixture = createFixtureProject();
    ({ server: shortServer, base: shortBase } = await boot(shortFixture, {
      store: "memory",
      activeSeconds: 1,
      idleSeconds: 1,
    }));
  }, 30_000);

  afterAll(async () => {
    await shortServer?.close();
    shortFixture?.cleanup();
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("idle: past the active window it still works, keeps its ID, and the cookie is re-issued with a fresh Max-Age", async () => {
    const login = await fetch(`${shortBase}/api/login`, json({ userId: "idle-user", transport: "cookie" }));
    const sessionId = setCookieValue(login, "devora_session")!;
    await sleep(1300); // past active (1s), inside idle (1s more)

    const me = await fetch(`${shortBase}/api/me`, { headers: { Cookie: `devora_session=${sessionId}` } });
    expect(me.status).toBe(200);
    const reissued = me.headers.getSetCookie().find((c) => c.startsWith("devora_session="));
    expect(reissued).toContain(`devora_session=${sessionId};`);
    expect(reissued).toMatch(/Max-Age=[12](;|$)/);

    // Renewal moved expiry forward: 1.3s more would have killed the
    // original session (2s total), but the renewed one is still alive.
    await sleep(1300);
    expect((await fetch(`${shortBase}/api/me`, { headers: { Authorization: `Bearer ${sessionId}` } })).status).toBe(
      200
    );
  }, 10_000);

  it("dead: unused past the idle window, it's rejected on both transports", async () => {
    const login = await fetch(`${shortBase}/api/login`, json({ userId: "dead-user" }));
    const { token } = (await login.json()) as { token: string };
    await sleep(2200);
    expect((await fetch(`${shortBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401);
    expect((await fetch(`${shortBase}/api/me`, { headers: { Cookie: `devora_session=${token}` } })).status).toBe(401);
  }, 10_000);
});
