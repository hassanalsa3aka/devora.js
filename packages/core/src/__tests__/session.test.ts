import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signSession,
  verifySession,
  createRequestContext,
  createNoAuthContext,
  resolveSessionCookieOptions,
  type SessionCookieOptions,
} from "../session.js";

const opts: SessionCookieOptions = { name: "devora_session", secret: "test-secret" };

describe("signSession / verifySession", () => {
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

  it("returns undefined for a missing cookie", () => {
    expect(verifySession(undefined, opts)).toBeUndefined();
  });

  it("returns undefined for a malformed cookie (no signature separator)", () => {
    expect(verifySession("not-a-real-cookie-value", opts)).toBeUndefined();
  });
});

describe("createRequestContext", () => {
  it("ctx.session is undefined with no cookie", () => {
    const { ctx } = createRequestContext(undefined, opts);
    expect(ctx.session).toBeUndefined();
  });

  it("requireAuth() throws with no session", () => {
    const { ctx } = createRequestContext(undefined, opts);
    expect(() => ctx.requireAuth()).toThrow(/no active session/);
  });

  it("setSession() makes ctx.session reflect the new value and queues a Set-Cookie", () => {
    const { ctx, getSetCookie } = createRequestContext(undefined, opts);
    ctx.setSession({ username: "bob" });
    expect(ctx.session).toEqual({ username: "bob" });
    expect(ctx.requireAuth()).toBeUndefined(); // doesn't throw now
    const cookies = getSetCookie();
    expect(cookies?.some((c) => c.startsWith("devora_session="))).toBe(true);
  });

  it("clearSession() removes the session and queues a Max-Age=0 cookie", () => {
    const { ctx, getSetCookie } = createRequestContext(undefined, opts);
    ctx.setSession({ username: "bob" });
    ctx.clearSession();
    expect(ctx.session).toBeUndefined();
    const cookies = getSetCookie();
    expect(cookies?.some((c) => c.includes("Max-Age=0"))).toBe(true);
  });

  it("a request arriving with a valid signed cookie starts already logged in", () => {
    const signed = signSession({ username: "carol" }, opts);
    const { ctx } = createRequestContext(`devora_session=${signed}`, opts);
    expect(ctx.session).toEqual({ username: "carol" });
  });

  it("a request arriving with a tampered cookie is treated as logged out — the actual forgery-rejection path", () => {
    const signed = signSession({ username: "carol" }, opts);
    const tampered = signed.replace(/\.[^.]+$/, ".forged-signature-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const { ctx } = createRequestContext(`devora_session=${tampered}`, opts);
    expect(ctx.session).toBeUndefined();
    expect(() => ctx.requireAuth()).toThrow(/no active session/);
  });

  it("verifyCsrf() rejects a POST with no CSRF cookie at all", () => {
    const { ctx } = createRequestContext(undefined, opts);
    const formData = new FormData();
    formData.set("_csrf", "anything");
    expect(() => ctx.verifyCsrf(formData)).toThrow(/missing or invalid CSRF token/);
  });

  it("verifyCsrf() accepts a form value matching the incoming CSRF cookie", () => {
    const { ctx, csrfToken } = createRequestContext(undefined, opts);
    // First request: no incoming CSRF cookie, one gets generated (csrfToken).
    // Simulate the *next* request arriving with that cookie now set.
    const { ctx: ctx2 } = createRequestContext(`devora_csrf=${csrfToken}`, opts);
    const formData = new FormData();
    formData.set("_csrf", csrfToken);
    expect(() => ctx2.verifyCsrf(formData)).not.toThrow();
  });
});

describe("createNoAuthContext (auth: \"none\")", () => {
  it("session is always undefined", () => {
    const { ctx } = createNoAuthContext();
    expect(ctx.session).toBeUndefined();
  });

  it("requireAuth/setSession/clearSession/verifyCsrf all throw a clear, specific error instead of silently no-op'ing", () => {
    const { ctx } = createNoAuthContext();
    expect(() => ctx.requireAuth()).toThrow(/sessions disabled/);
    expect(() => ctx.setSession({})).toThrow(/sessions disabled/);
    expect(() => ctx.clearSession()).toThrow(/sessions disabled/);
    expect(() => ctx.verifyCsrf(new FormData())).toThrow(/sessions disabled/);
  });

  it("issues no cookies at all", () => {
    const { getSetCookie } = createNoAuthContext();
    expect(getSetCookie()).toBeUndefined();
  });
});

describe("resolveSessionCookieOptions", () => {
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
    const result = resolveSessionCookieOptions("shared", "dashboard");
    expect(result.name).toBe("devora_session");
    expect(result.secret).toBe("shared-secret");
  });

  it("isolated apps get their own cookie name and their own secret env var", () => {
    process.env.DEVORA_SESSION_SECRET_ADMIN = "admin-secret";
    const result = resolveSessionCookieOptions("isolated", "admin");
    expect(result.name).toBe("devora_session_admin");
    expect(result.secret).toBe("admin-secret");
  });

  it("an isolated app with no per-app secret falls back to the shared secret", () => {
    process.env.DEVORA_SESSION_SECRET = "fallback-secret";
    const result = resolveSessionCookieOptions("isolated", "admin");
    expect(result.secret).toBe("fallback-secret");
  });

  it("throws in production if no secret is configured at all — never silently falls back", () => {
    process.env.NODE_ENV = "production";
    expect(() => resolveSessionCookieOptions("shared", "dashboard")).toThrow(/no session secret configured/);
  });

  it("in dev, with no secret configured, falls back to the insecure default rather than throwing", () => {
    expect(() => resolveSessionCookieOptions("shared", "dashboard")).not.toThrow();
  });
});
