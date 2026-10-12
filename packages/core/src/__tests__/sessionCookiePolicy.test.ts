/**
 * Round 3 phase 2: configurable session cookies (Secure "auto"/true/false,
 * SameSite, Domain), per-app lifetimes, the CSRF opt-out, and the
 * validation that makes a cookie browsers would reject a config error
 * instead of a silent production failure.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestContext } from "../session.js";
import { createMemorySessionStore } from "../sessionStore.js";
import {
  createSessionOptionsResolver,
  resolveSessionManifest,
  type SessionManifest,
  type SessionManifestInput,
} from "../sessionConfig.js";
import { forwardedProto, isHttpsRequest } from "../trustProxy.js";
import { resolveSecurityHeaders } from "../securityHeaders.js";
import { HttpError } from "../httpError.js";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

const base: SessionManifestInput = {
  appName: "web",
  appDomain: "app.example.com",
  authMode: "shared",
  sessions: { store: "memory" },
};

describe("resolveSessionManifest", () => {
  it("no cookie settings: the manifest every earlier build had", () => {
    expect(resolveSessionManifest(base)).toEqual({ store: "memory" });
    expect(resolveSessionManifest({ ...base, sessions: { store: "memory", activeSeconds: 60, idleSeconds: 120 } })).toEqual({
      store: "memory",
      activePeriodMs: 60_000,
      idlePeriodMs: 120_000,
    });
  });

  it("auth none: undefined — and any session setting in app.config.ts is an error, not ignored", () => {
    expect(resolveSessionManifest({ ...base, authMode: "none" })).toBeUndefined();
    expect(() => resolveSessionManifest({ ...base, authMode: "none", appSessions: { idleSeconds: 5 } })).toThrow(/auth: "none"/);
    expect(() => resolveSessionManifest({ ...base, authMode: "none", csrf: false })).toThrow(/`csrf`/);
  });

  it("isolated apps can set their own lifetimes; shared apps can't (one session across apps)", () => {
    const isolated = resolveSessionManifest({
      ...base,
      authMode: "isolated",
      sessions: { store: "memory", activeSeconds: 86400, idleSeconds: 1209600 },
      appSessions: { activeSeconds: 900, idleSeconds: 3600 },
    });
    expect(isolated).toMatchObject({ activePeriodMs: 900_000, idlePeriodMs: 3_600_000 });
    expect(() => resolveSessionManifest({ ...base, appSessions: { idleSeconds: 60 } })).toThrow(/only for auth: "isolated"/);
    expect(() => resolveSessionManifest({ ...base, authMode: "isolated", appSessions: { idleSeconds: -1 } })).toThrow(
      /positive number of seconds/
    );
  });

  it("cookie settings merge app over project, normalized", () => {
    const m = resolveSessionManifest({
      ...base,
      authMode: "isolated",
      sessions: { store: "memory", cookie: { secure: "auto", sameSite: "lax" } },
      appSessions: { cookie: { sameSite: "Strict" as "strict" } },
    });
    expect(m?.cookie).toEqual({ secure: "auto", sameSite: "strict" });
  });

  it("domain: normalized, must cover the app, and applies to shared apps only unless an isolated app sets its own", () => {
    const shared = resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { domain: ".Example.com" } } });
    expect(shared?.cookie).toEqual({ domain: "example.com" });

    // The project domain does not leak onto an isolated app's cookie.
    const isolated = resolveSessionManifest({
      ...base,
      authMode: "isolated",
      sessions: { store: "memory", cookie: { domain: "example.com" } },
    });
    expect(isolated?.cookie).toBeUndefined();
    const isolatedOwn = resolveSessionManifest({
      ...base,
      authMode: "isolated",
      appSessions: { cookie: { domain: "app.example.com" } },
    });
    expect(isolatedOwn?.cookie).toEqual({ domain: "app.example.com" });

    expect(() => resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { domain: "other.com" } } })).toThrow(
      /doesn't cover this app's domain/
    );
    for (const bad of ["localhost", "https://example.com", "example.com:443", "example.com/path", ""]) {
      expect(() => resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { domain: bad } } }), bad).toThrow(
        /must be a plain domain/
      );
    }
    expect(() => resolveSessionManifest({ ...base, appSessions: { cookie: { domain: "example.com" } } })).toThrow(
      /only for auth: "isolated"/
    );
  });

  it("with a shared domain-wide cookie, a shared app can't disagree with the project about its attributes", () => {
    expect(() =>
      resolveSessionManifest({
        ...base,
        sessions: { store: "memory", cookie: { domain: "example.com", sameSite: "lax" } },
        appSessions: { cookie: { sameSite: "strict" } },
      })
    ).toThrow(/share one cookie across example.com/);
    // Restating the same value is fine.
    expect(() =>
      resolveSessionManifest({
        ...base,
        sessions: { store: "memory", cookie: { domain: "example.com", sameSite: "lax" } },
        appSessions: { cookie: { sameSite: "lax" } },
      })
    ).not.toThrow();
  });

  it("rejects values browsers would reject", () => {
    expect(() => resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { sameSite: "none", secure: "auto" } } })).toThrow(
      /requires secure: true/
    );
    expect(() => resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { sameSite: "none", secure: false } } })).toThrow(
      /requires secure: true/
    );
    expect(resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { sameSite: "none" } } })?.cookie).toEqual({
      sameSite: "none",
    });
    expect(() =>
      resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { sameSite: "loose" as "lax" } } })
    ).toThrow(/must be "lax", "strict" or "none"/);
    expect(() =>
      resolveSessionManifest({ ...base, sessions: { store: "memory", cookie: { secure: "yes" as unknown as boolean } } })
    ).toThrow(/must be true, false or "auto"/);
  });

  it("csrf: false is recorded; the default records nothing", () => {
    expect(resolveSessionManifest({ ...base, csrf: false })?.csrfCookie).toBe(false);
    expect(resolveSessionManifest({ ...base, csrf: true })).not.toHaveProperty("csrfCookie");
  });
});

/** Set-Cookie values for one request through the real resolver + createRequestContext. */
async function cookiesFor(
  manifest: SessionManifest,
  request: { isHttps?: boolean; cookieHeader?: string } = {},
  act?: (ctx: Awaited<ReturnType<typeof createRequestContext>>["ctx"]) => Promise<unknown> | void
): Promise<string[]> {
  process.env.DEVORA_SESSION_SECRET = "policy-test-secret";
  const store = createMemorySessionStore();
  const resolve = createSessionOptionsResolver("shared", "web", manifest, async () => ({ default: store }));
  const options = await resolve({ isHttps: request.isHttps });
  const context = await createRequestContext({ cookieHeader: request.cookieHeader }, options);
  await act?.(context.ctx);
  await context.settle();
  return context.getSetCookie() ?? [];
}

const withName = (cookies: string[], name: string) => cookies.find((c) => c.startsWith(`${name}=`));

describe("cookie attributes in production", () => {
  const prod = () => {
    process.env.NODE_ENV = "production";
  };

  it("default: Secure always — exactly the previous production cookie", async () => {
    prod();
    const cookies = await cookiesFor({ store: "memory" }, { isHttps: false }, (ctx) => ctx.setSession({ u: 1 }).then(() => {}));
    expect(withName(cookies, "devora_csrf")).toMatch(/^devora_csrf=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    expect(withName(cookies, "devora_session")).toMatch(/; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
  });

  it('secure: "auto" follows the request — no Secure over plain HTTP, Secure over HTTPS', async () => {
    prod();
    const plain = await cookiesFor({ store: "memory", cookie: { secure: "auto" } }, { isHttps: false });
    expect(withName(plain, "devora_csrf")).not.toMatch(/Secure/);
    const https = await cookiesFor({ store: "memory", cookie: { secure: "auto" } }, { isHttps: true });
    expect(withName(https, "devora_csrf")).toMatch(/; Secure$/);
  });

  it("secure: false never sets it", async () => {
    prod();
    const cookies = await cookiesFor({ store: "memory", cookie: { secure: false } }, { isHttps: true });
    expect(withName(cookies, "devora_csrf")).not.toMatch(/Secure/);
  });

  it("sameSite applies to both cookies; Domain to the session cookie (set AND cleared) only", async () => {
    prod();
    const manifest: SessionManifest = { store: "memory", cookie: { sameSite: "strict", domain: "example.com" } };
    const login = await cookiesFor(manifest, {}, (ctx) => ctx.setSession({ u: 1 }).then(() => {}));
    expect(withName(login, "devora_session")).toMatch(/SameSite=Strict; Domain=example\.com; Max-Age=\d+; Secure$/);
    expect(withName(login, "devora_csrf")).toMatch(/SameSite=Strict; Secure$/);
    expect(withName(login, "devora_csrf")).not.toMatch(/Domain=/);

    // A dead session cookie is cleared with the same Domain, or the browser keeps it.
    const cleared = await cookiesFor(manifest, { cookieHeader: "devora_session=not-a-real-id" });
    expect(withName(cleared, "devora_session")).toBe("devora_session=; Path=/; HttpOnly; SameSite=Strict; Domain=example.com; Max-Age=0; Secure");
  });
});

describe("cookie attributes in dev (unchanged: never Secure, never Domain)", () => {
  it("ignores secure/domain, applies lax/strict, and turns sameSite none into Lax with a warning", async () => {
    process.env.NODE_ENV = "development";
    const strict = await cookiesFor({ store: "memory", cookie: { secure: true, sameSite: "strict", domain: "example.com" } }, {
      isHttps: true,
    });
    expect(withName(strict, "devora_csrf")).toBe(withName(strict, "devora_csrf")!.split(";")[0] + "; Path=/; HttpOnly; SameSite=Strict");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const none = await cookiesFor({ store: "memory", cookie: { sameSite: "none" } });
    expect(withName(none, "devora_csrf")).toMatch(/SameSite=Lax$/);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/dev cookies use SameSite=Lax/);
  });
});

describe("csrf: false", () => {
  it("never issues the CSRF cookie, and verifyCsrf fails closed for anything not Bearer-authenticated", async () => {
    process.env.DEVORA_SESSION_SECRET = "policy-test-secret";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createMemorySessionStore();
    const resolve = createSessionOptionsResolver("shared", "web", { store: "memory", csrfCookie: false }, async () => ({
      default: store,
    }));
    const options = await resolve();
    expect(options.csrfCookie).toBe(false);

    // An unauthenticated call (a mobile client's login) gets no cookie at all.
    const anon = await createRequestContext({}, options);
    expect(anon.getSetCookie()).toBeUndefined();
    expect(anon.csrfToken).toBe("");

    // A leftover CSRF cookie from before the switch can't be used to pass.
    const stale = await createRequestContext({ cookieHeader: "devora_csrf=leftover" }, options);
    expect(() => stale.ctx.verifyCsrf("leftover")).toThrow(HttpError);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/csrf: false/);

    // Bearer-authenticated requests still pass, as before.
    const login = await createRequestContext({}, options);
    const token = await login.ctx.setSession({ u: 1 }, { transport: "bearer" });
    await login.settle();
    const bearer = await createRequestContext({ authorizationHeader: `Bearer ${token}` }, options);
    expect(() => bearer.ctx.verifyCsrf("")).not.toThrow();
    expect(bearer.getSetCookie()).toBeUndefined();
  });
});

describe("isHttpsRequest / forwardedProto", () => {
  it("a TLS socket is HTTPS regardless of headers", () => {
    expect(isHttpsRequest({ headers: {}, socket: { encrypted: true } }, false)).toBe(true);
  });
  it("X-Forwarded-Proto counts only with trustProxy, first value wins", () => {
    const req = { headers: { "x-forwarded-proto": "https, http" }, socket: {} };
    expect(isHttpsRequest(req, false)).toBe(false);
    expect(isHttpsRequest(req, true)).toBe(true);
    expect(isHttpsRequest({ headers: { "x-forwarded-proto": "http" } }, true)).toBe(false);
    expect(forwardedProto({ "x-forwarded-proto": ["HTTPS"] })).toBe("https");
    expect(forwardedProto({})).toBeUndefined();
  });
});

describe("security.noindex", () => {
  it("adds X-Robots-Tag: noindex only when asked", () => {
    expect(resolveSecurityHeaders({ noindex: true })["X-Robots-Tag"]).toBe("noindex");
    expect(resolveSecurityHeaders(undefined)).not.toHaveProperty("X-Robots-Tag");
  });
});
