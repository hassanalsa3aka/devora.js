import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signSession,
  verifySession,
  createRequestContext,
  createNoAuthContext,
  resolveSession,
  resolveSessionScope,
  sessionStoreKey,
  type SessionCookieOptions,
} from "../session.js";
import { createMemorySessionStore, getSessionState } from "../sessionStore.js";
import { HttpError } from "../httpError.js";

const opts = { name: "devora_session", secret: "test-secret" };

describe("signSession / verifySession (deprecated — no longer used for sessions, kept for migration)", () => {
  it("round-trips real data", () => {
    const signed = signSession({ username: "alice" }, opts);
    expect(verifySession(signed, opts)).toEqual({ username: "alice" });
  });

  it("rejects a tampered signature", () => {
    const signed = signSession({ username: "alice" }, opts);
    const [payload] = signed.split(".");
    const tampered = `${payload}.not-the-real-signature-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
    expect(verifySession(tampered, opts)).toBeUndefined();
  });

  it("rejects a payload signed with a different secret", () => {
    const signed = signSession({ username: "alice" }, { name: "devora_session", secret: "other-secret" });
    expect(verifySession(signed, opts)).toBeUndefined();
  });

  it("real bug fixed: a cookie signed for one cookie name is rejected under a different name, even with the identical secret", () => {
    // This is exactly what happens when an "isolated" app (e.g. apps/admin)
    // falls back to the shared secret (resolveSessionCookieOptions already
    // supports and tests this as valid config) — before this fix, the two
    // cookies were cryptographically indistinguishable and a shared-app
    // session cookie could be replayed verbatim as the isolated app's own
    // cookie, defeating auth-mode isolation entirely.
    const sharedOpts = { name: "devora_session", secret: "same-secret-both-apps" };
    const isolatedOpts = { name: "devora_session_admin", secret: "same-secret-both-apps" };
    const forged = signSession({ username: "ordinary-user" }, sharedOpts);
    expect(verifySession(forged, isolatedOpts)).toBeUndefined();
    // Sanity check: it still verifies correctly under its own real name.
    expect(verifySession(forged, sharedOpts)).toEqual({ username: "ordinary-user" });
  });

  it("returns undefined for a missing cookie", () => {
    expect(verifySession(undefined, opts)).toBeUndefined();
  });

  it("returns undefined for a malformed cookie (no signature separator)", () => {
    expect(verifySession("not-a-real-cookie-value", opts)).toBeUndefined();
  });
});

/** A fresh store per test, so one test's sessions can't leak into another's. */
function freshOpts(overrides: Partial<SessionCookieOptions> = {}): SessionCookieOptions {
  return { name: "devora_session", secret: "test-secret", store: createMemorySessionStore(), ...overrides };
}

function cookieValue(setCookies: string[] | undefined, name: string): string | undefined {
  const cookie = setCookies?.find((c) => c.startsWith(`${name}=`));
  return cookie?.split(";")[0]!.slice(name.length + 1);
}

/** Logs in through the real API and returns the opaque session ID. */
async function login(o: SessionCookieOptions, data: unknown = { userId: "u1" }): Promise<string> {
  const { ctx, settle } = await createRequestContext({}, o);
  const id = await ctx.setSession(data);
  await settle();
  return id;
}

describe("createRequestContext — unified session auth", () => {
  it("ctx.session is undefined with no credentials, and requireAuth() throws a 401 HttpError", async () => {
    const { ctx } = await createRequestContext({}, freshOpts());
    expect(ctx.session).toBeUndefined();
    expect(ctx.sessionTransport).toBeUndefined();
    let caught: unknown;
    try {
      ctx.requireAuth();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(HttpError);
    expect((caught as HttpError).status).toBe(401);
  });

  it("setSession() issues an opaque random ID (not a signed payload) in an HttpOnly cookie, stored server-side under an HMAC'd key", async () => {
    const o = freshOpts();
    const { ctx, getSetCookie, settle } = await createRequestContext({}, o);
    const id = await ctx.setSession({ username: "bob" });
    await settle();

    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ctx.session).toEqual({ username: "bob" });
    expect(ctx.sessionTransport).toBe("cookie");
    const cookie = getSetCookie()!.find((c) => c.startsWith("devora_session="))!;
    expect(cookie).toContain(`devora_session=${id};`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toMatch(/Max-Age=\d+/);
    // The payload never travels to the client — nothing but the ID is in it.
    expect(cookie).not.toContain("bob");
    // Stored under HMAC(secret, name:id) — the raw ID is not a store key.
    expect(await o.store.get(id)).toBeUndefined();
    expect(await o.store.get(sessionStoreKey(id, o))).toMatchObject({ data: { username: "bob" } });
  });

  it("the same session ID authenticates via the cookie AND via Authorization: Bearer — one lookup, two transports", async () => {
    const o = freshOpts();
    const id = await login(o, { userId: "u1" });

    const viaCookie = await createRequestContext({ cookieHeader: `devora_session=${id}` }, o);
    expect(viaCookie.ctx.session).toEqual({ userId: "u1" });
    expect(viaCookie.ctx.sessionTransport).toBe("cookie");

    const viaBearer = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(viaBearer.ctx.session).toEqual({ userId: "u1" });
    expect(viaBearer.ctx.sessionTransport).toBe("bearer");
  });

  it("revokeSession() kills the session on BOTH transports immediately, and clears the cookie", async () => {
    const o = freshOpts();
    const id = await login(o);

    const revoking = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    await revoking.ctx.revokeSession();
    await revoking.settle();
    expect(revoking.ctx.session).toBeUndefined();

    const cookieAfter = await createRequestContext({ cookieHeader: `devora_session=${id}` }, o);
    expect(cookieAfter.ctx.session).toBeUndefined();
    expect(() => cookieAfter.ctx.requireAuth()).toThrow(/Authentication required/);
    // A dead cookie is actively cleared, not left in the browser.
    expect(cookieAfter.getSetCookie()?.some((c) => c.startsWith("devora_session=;") && c.includes("Max-Age=0"))).toBe(true);

    const bearerAfter = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(bearerAfter.ctx.session).toBeUndefined();
  });

  it("clearSession() (existing logout code) now revokes server-side too, not just the cookie", async () => {
    const o = freshOpts();
    const id = await login(o);
    const viaCookie = await createRequestContext({ cookieHeader: `devora_session=${id}` }, o);
    await viaCookie.ctx.clearSession();
    await viaCookie.settle();
    expect(viaCookie.getSetCookie()?.some((c) => c.includes("Max-Age=0"))).toBe(true);
    const replayed = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(replayed.ctx.session).toBeUndefined();
  });

  it("revokeSession(otherId) revokes a different session of the same scope (e.g. 'sign out other devices')", async () => {
    const o = freshOpts();
    const phone = await login(o, { device: "phone" });
    const laptop = await login(o, { device: "laptop" });

    const fromLaptop = await createRequestContext({ cookieHeader: `devora_session=${laptop}` }, o);
    await fromLaptop.ctx.revokeSession(phone);
    await fromLaptop.settle();
    expect(fromLaptop.ctx.session).toEqual({ device: "laptop" }); // still logged in itself

    expect((await createRequestContext({ authorizationHeader: `Bearer ${phone}` }, o)).ctx.session).toBeUndefined();
  });

  it("setSession(data, { transport: 'bearer' }) sets no session cookie and returns the token for the response body", async () => {
    const o = freshOpts();
    const { ctx, getSetCookie, settle } = await createRequestContext({}, o);
    const token = await ctx.setSession({ userId: "mobile" }, { transport: "bearer" });
    await settle();
    expect(getSetCookie()?.some((c) => c.startsWith("devora_session="))).toBeFalsy();
    expect(ctx.sessionTransport).toBe("bearer");
    expect((await createRequestContext({ authorizationHeader: `Bearer ${token}` }, o)).ctx.session).toEqual({
      userId: "mobile",
    });
  });

  it("setSession() on an already-authenticated request rotates the ID — the old one is dead (no session fixation)", async () => {
    const o = freshOpts();
    const oldId = await login(o, { role: "user" });
    const { ctx, settle } = await createRequestContext({ cookieHeader: `devora_session=${oldId}` }, o);
    const newId = await ctx.setSession({ role: "admin" });
    await settle();
    expect(newId).not.toBe(oldId);
    expect((await createRequestContext({ cookieHeader: `devora_session=${oldId}` }, o)).ctx.session).toBeUndefined();
    expect((await createRequestContext({ cookieHeader: `devora_session=${newId}` }, o)).ctx.session).toEqual({
      role: "admin",
    });
  });

  it("a request that sends a Bearer header is never authenticated by its cookie, even if the cookie is valid", async () => {
    const o = freshOpts();
    const id = await login(o);
    const { ctx } = await createRequestContext(
      { cookieHeader: `devora_session=${id}`, authorizationHeader: "Bearer not-a-real-token" },
      o
    );
    expect(ctx.session).toBeUndefined();
    expect(ctx.sessionTransport).toBeUndefined();
  });

  it("a non-Bearer Authorization scheme (e.g. Basic from a proxy) doesn't block the cookie path", async () => {
    const o = freshOpts();
    const id = await login(o);
    const { ctx } = await createRequestContext(
      { cookieHeader: `devora_session=${id}`, authorizationHeader: "Basic dXNlcjpwYXNz" },
      o
    );
    expect(ctx.sessionTransport).toBe("cookie");
  });

  it("a pre-upgrade signed-payload cookie is treated as dead and cleared (never reaches the store)", async () => {
    const o = freshOpts();
    const legacy = signSession({ username: "carol" }, o);
    const { ctx, getSetCookie } = await createRequestContext({ cookieHeader: `devora_session=${legacy}` }, o);
    expect(ctx.session).toBeUndefined();
    expect(getSetCookie()?.some((c) => c.startsWith("devora_session=;"))).toBe(true);
  });

  it("an ID issued under the shared scope is rejected by an isolated app — even with the SAME secret and SAME store, on both transports", async () => {
    const store = createMemorySessionStore();
    const shared = freshOpts({ name: "devora_session", secret: "same-secret", store });
    const isolated = freshOpts({ name: "devora_session_admin", secret: "same-secret", store });
    const id = await login(shared, { username: "ordinary-user" });

    expect((await createRequestContext({ cookieHeader: `devora_session_admin=${id}` }, isolated)).ctx.session).toBeUndefined();
    expect((await createRequestContext({ authorizationHeader: `Bearer ${id}` }, isolated)).ctx.session).toBeUndefined();
    // Sanity: still valid in its own scope.
    expect((await createRequestContext({ authorizationHeader: `Bearer ${id}` }, shared)).ctx.session).toEqual({
      username: "ordinary-user",
    });
  });

  it("settle() rejects if a store write failed — a response can't carry a session ID that was never stored", async () => {
    const failing = freshOpts({
      store: {
        get: () => undefined,
        set: () => {
          throw new Error("db down");
        },
        delete: () => {},
      },
    });
    const { ctx, settle } = await createRequestContext({}, failing);
    void ctx.setSession({ userId: "u1" }); // deliberately not awaited
    await expect(settle()).rejects.toThrow(/db down/);
  });
});

describe("session states: active → idle (silently renewed) → dead", () => {
  const minute = 60_000;

  it("getSessionState() classifies by the two timestamps", () => {
    const record = { data: {}, activeExpiresAt: 1000, expiresAt: 2000 };
    expect(getSessionState(record, 999)).toBe("active");
    expect(getSessionState(record, 1000)).toBe("idle");
    expect(getSessionState(record, 1999)).toBe("idle");
    expect(getSessionState(record, 2000)).toBe("dead");
    expect(getSessionState(undefined, 0)).toBe("dead");
  });

  it("an idle session is still valid, keeps the SAME ID, and has both windows extended on use", async () => {
    const o = freshOpts({ activePeriodMs: 1 * minute, idlePeriodMs: 10 * minute });
    const id = await login(o);
    const key = sessionStoreKey(id, o);
    const before = (await o.store.get(key))!;

    const later = before.activeExpiresAt + 5 * minute; // past active, within idle
    const resolved = await resolveSession({ authorizationHeader: `Bearer ${id}` }, o, later);
    expect(resolved.state).toBe("idle");
    expect(resolved.renewed).toBe(true);
    expect(resolved.sessionId).toBe(id);

    const after = (await o.store.get(key))!;
    expect(after.activeExpiresAt).toBe(later + 1 * minute);
    expect(after.expiresAt).toBe(later + 11 * minute);
    // Renewed, so it's active again at that point in time.
    expect(getSessionState(after, later)).toBe("active");
  });

  it("an idle session arriving by cookie gets its cookie re-issued with the extended Max-Age", async () => {
    const o = freshOpts({ activePeriodMs: 1, idlePeriodMs: 10 * minute });
    const id = await login(o);
    await new Promise((r) => setTimeout(r, 5)); // past the 1ms active window
    const { ctx, getSetCookie } = await createRequestContext({ cookieHeader: `devora_session=${id}` }, o);
    expect(ctx.session).toEqual({ userId: "u1" });
    expect(cookieValue(getSetCookie(), "devora_session")).toBe(id);
  });

  it("a session past its idle window is dead: rejected on both transports and deleted from the store", async () => {
    const o = freshOpts({ activePeriodMs: 1 * minute, idlePeriodMs: 1 * minute });
    const id = await login(o);
    const key = sessionStoreKey(id, o);
    const { expiresAt } = (await o.store.get(key))!;

    expect((await resolveSession({ cookieHeader: `devora_session=${id}` }, o, expiresAt)).state).toBe("dead");
    expect(await o.store.get(key)).toBeUndefined();
    expect((await resolveSession({ authorizationHeader: `Bearer ${id}` }, o)).state).toBe("dead");
  });
});

describe("CSRF — enforced for cookie auth, skipped for Bearer auth", () => {
  it("verifyCsrf() rejects a POST with no CSRF cookie at all (403)", async () => {
    const { ctx } = await createRequestContext({}, freshOpts());
    const formData = new FormData();
    formData.set("_csrf", "anything");
    let caught: unknown;
    try {
      ctx.verifyCsrf(formData);
    } catch (err) {
      caught = err;
    }
    expect((caught as HttpError).status).toBe(403);
  });

  it("verifyCsrf() accepts a form value matching the incoming CSRF cookie", async () => {
    const o = freshOpts();
    const { csrfToken } = await createRequestContext({}, o);
    const { ctx: ctx2 } = await createRequestContext({ cookieHeader: `devora_csrf=${csrfToken}` }, o);
    const formData = new FormData();
    formData.set("_csrf", csrfToken);
    expect(() => ctx2.verifyCsrf(formData)).not.toThrow();
  });

  it("a cookie-authenticated request is still CSRF-checked", async () => {
    const o = freshOpts();
    const id = await login(o);
    const { ctx } = await createRequestContext({ cookieHeader: `devora_session=${id}; devora_csrf=real-token` }, o);
    expect(ctx.sessionTransport).toBe("cookie");
    expect(() => ctx.verifyCsrf("wrong-token")).toThrow(/CSRF/);
    expect(() => ctx.verifyCsrf("real-token")).not.toThrow();
  });

  it("a Bearer-authenticated request is exempt — no CSRF cookie or token needed", async () => {
    const o = freshOpts();
    const id = await login(o);
    const { ctx } = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(() => ctx.verifyCsrf("")).not.toThrow();
  });

  it("an INVALID Bearer token gets no exemption — only a request that actually authenticated via Bearer does", async () => {
    const { ctx } = await createRequestContext(
      { authorizationHeader: "Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
      freshOpts()
    );
    expect(() => ctx.verifyCsrf("")).toThrow(/CSRF/);
  });

  it("a request sending a Bearer header isn't issued a CSRF cookie (API/mobile clients don't keep cookies)", async () => {
    const o = freshOpts();
    const id = await login(o);
    const { getSetCookie } = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(getSetCookie()?.some((c) => c.startsWith("devora_csrf="))).toBeFalsy();
  });
});

describe("createNoAuthContext (auth: \"none\")", () => {
  it("session is always undefined", () => {
    const { ctx } = createNoAuthContext();
    expect(ctx.session).toBeUndefined();
  });

  it("requireAuth/setSession/revokeSession/clearSession/verifyCsrf all throw a clear, specific error instead of silently no-op'ing", () => {
    const { ctx } = createNoAuthContext();
    expect(() => ctx.requireAuth()).toThrow(/sessions disabled/);
    expect(() => ctx.setSession({})).toThrow(/sessions disabled/);
    expect(() => ctx.revokeSession()).toThrow(/sessions disabled/);
    expect(() => ctx.clearSession()).toThrow(/sessions disabled/);
    expect(() => ctx.verifyCsrf(new FormData())).toThrow(/sessions disabled/);
  });

  it("issues no cookies at all", () => {
    const { getSetCookie } = createNoAuthContext();
    expect(getSetCookie()).toBeUndefined();
  });
});

describe("resolveSessionScope", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.DEVORA_SESSION_SECRET;
    delete process.env.DEVORA_SESSION_SECRET_ADMIN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("shared apps get one project-wide cookie name", () => {
    process.env.DEVORA_SESSION_SECRET = "shared-secret";
    const result = resolveSessionScope("shared", "dashboard");
    expect(result.name).toBe("devora_session");
    expect(result.secret).toBe("shared-secret");
  });

  it("isolated apps get their own cookie name and their own secret env var", () => {
    process.env.DEVORA_SESSION_SECRET_ADMIN = "admin-secret";
    const result = resolveSessionScope("isolated", "admin");
    expect(result.name).toBe("devora_session_admin");
    expect(result.secret).toBe("admin-secret");
  });

  it("an isolated app with no per-app secret falls back to the shared secret", () => {
    process.env.DEVORA_SESSION_SECRET = "fallback-secret";
    const result = resolveSessionScope("isolated", "admin");
    expect(result.secret).toBe("fallback-secret");
  });

  it("throws in production if no secret is configured at all — never silently falls back", () => {
    process.env.NODE_ENV = "production";
    expect(() => resolveSessionScope("shared", "dashboard")).toThrow(/no session secret configured/);
  });

  it("in dev, with no secret configured, falls back to the insecure default rather than throwing", () => {
    expect(() => resolveSessionScope("shared", "dashboard")).not.toThrow();
  });
});
