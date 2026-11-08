/**
 * H30: the CSRF token of a signed-in browser is bound to its session (an HMAC of the session ID keyed with the
 * session secret), so a CSRF cookie planted by someone who can write cookies for the domain proves nothing.
 * Requests with no session keep the double-submit cookie, and the opt-outs are unchanged.
 */
import { describe, expect, it } from "vitest";
import { createRequestContext, sessionStoreKey, type SessionCookieOptions } from "../session.js";
import { createMemorySessionStore } from "../sessionStore.js";
import { CSRF_COOKIE_NAME, deriveSessionCsrfToken, verifyCsrfByDefault } from "../csrf.js";
import { HttpError } from "../httpError.js";

function freshOpts(overrides: Partial<SessionCookieOptions> = {}): SessionCookieOptions {
  return { name: "devora_session", secret: "csrf-binding-secret", store: createMemorySessionStore(), ...overrides };
}

function cookieValue(setCookies: string[] | undefined, name: string): string | undefined {
  const cookie = setCookies?.find((c) => c.startsWith(`${name}=`));
  return cookie?.split(";")[0]!.slice(name.length + 1);
}

async function login(o: SessionCookieOptions): Promise<string> {
  const { ctx, settle } = await createRequestContext({}, o);
  const id = await ctx.setSession({ userId: "u1" });
  await settle();
  return id;
}

/** A request from a browser that holds this session and (optionally) this CSRF cookie. */
async function asBrowser(o: SessionCookieOptions, sessionId: string | undefined, csrfCookie?: string) {
  const parts = [sessionId ? `${o.name}=${sessionId}` : "", csrfCookie ? `${CSRF_COOKIE_NAME}=${csrfCookie}` : ""].filter(Boolean);
  return createRequestContext({ cookieHeader: parts.join("; ") || undefined }, o);
}

function verdict(fn: () => void): "accepted" | number {
  try {
    fn();
    return "accepted";
  } catch (error) {
    if (error instanceof HttpError) return error.status;
    throw error;
  }
}

describe("CSRF token bound to the session (H30)", () => {
  it("a signed-in browser gets the token derived from its session ID, and it passes", async () => {
    const o = freshOpts();
    const id = await login(o);
    const request = await asBrowser(o, id);
    expect(request.csrfToken).toBe(deriveSessionCsrfToken(id, o));
    expect(verdict(() => request.ctx.verifyCsrf(request.csrfToken))).toBe("accepted");
    const form = new FormData();
    form.set("_csrf", request.csrfToken);
    expect(verdict(() => request.ctx.verifyCsrf(form))).toBe("accepted");
  });

  it("a token from another session is refused", async () => {
    const o = freshOpts();
    const a = await login(o);
    const b = await login(o);
    const tokenOfB = (await asBrowser(o, b)).csrfToken;
    expect(tokenOfB).not.toBe(deriveSessionCsrfToken(a, o));
    const asA = await asBrowser(o, a);
    expect(verdict(() => asA.ctx.verifyCsrf(tokenOfB))).toBe(403);
  });

  it("a token made with another secret, or for another auth scope, is refused", async () => {
    const o = freshOpts();
    const id = await login(o);
    const request = await asBrowser(o, id);
    expect(verdict(() => request.ctx.verifyCsrf(deriveSessionCsrfToken(id, { name: o.name, secret: "another-secret" })))).toBe(403);
    expect(verdict(() => request.ctx.verifyCsrf(deriveSessionCsrfToken(id, { name: "devora_session_admin", secret: o.secret })))).toBe(403);
  });

  it("a planted CSRF cookie with a matching token no longer passes for a signed-in browser (the double-submit hole)", async () => {
    const o = freshOpts();
    const id = await login(o);
    const planted = "a-value-the-attacker-chose";
    const request = await asBrowser(o, id, planted);
    expect(verdict(() => request.ctx.verifyCsrf(planted))).toBe(403);
    // ... and the cookie's own value is not the token a signed-in page receives either
    expect(request.csrfToken).not.toBe(planted);
  });

  it("the token is not the session's store key, and is stable for the life of the session", async () => {
    const o = freshOpts();
    const id = await login(o);
    const first = (await asBrowser(o, id)).csrfToken;
    const second = (await asBrowser(o, id)).csrfToken;
    expect(first).toBe(second);
    expect(first).not.toBe(sessionStoreKey(id, o));
    expect(first).not.toContain(id);
  });

  it("an action that logs in and then renders gets the token of the new session", async () => {
    const o = freshOpts();
    const anonymous = await asBrowser(o, undefined, "anon-cookie-value");
    expect(anonymous.csrfToken).toBe("anon-cookie-value");
    const id = await anonymous.ctx.setSession({ userId: "u2" });
    await anonymous.settle();
    expect(anonymous.csrfToken).toBe(deriveSessionCsrfToken(id, o));
  });

  it("a token without a session is handled safely: the double-submit cookie decides, a session-bound token does not match it", async () => {
    const o = freshOpts();
    const id = await login(o);
    const sessionToken = deriveSessionCsrfToken(id, o);
    // no session cookie, a CSRF cookie: the token must equal the cookie
    const noSession = await asBrowser(o, undefined, "plain-cookie");
    expect(verdict(() => noSession.ctx.verifyCsrf("plain-cookie"))).toBe("accepted");
    expect(verdict(() => noSession.ctx.verifyCsrf(sessionToken))).toBe(403);
    // a dead or unknown session ID behaves like no session
    const unknownSession = await asBrowser(o, "x".repeat(43), "plain-cookie");
    expect(verdict(() => unknownSession.ctx.verifyCsrf(sessionToken))).toBe(403);
    expect(verdict(() => unknownSession.ctx.verifyCsrf("plain-cookie"))).toBe("accepted");
    // empty, missing and non-string submissions are refused for both kinds of request
    const signedIn = await asBrowser(o, id);
    for (const bad of ["", new FormData()] as const) {
      expect(verdict(() => signedIn.ctx.verifyCsrf(bad))).toBe(403);
      expect(verdict(() => noSession.ctx.verifyCsrf(bad))).toBe(403);
    }
    const file = new FormData();
    file.set("_csrf", new File(["x"], "x.txt"));
    expect(verdict(() => signedIn.ctx.verifyCsrf(file))).toBe(403);
  });

  it("requests without any cookie are unchanged: a fresh token and cookie are issued, and nothing verifies against them", async () => {
    const o = freshOpts();
    const first = await createRequestContext({}, o);
    const issued = cookieValue(first.getSetCookie(), CSRF_COOKIE_NAME);
    expect(issued).toBeTruthy();
    expect(first.csrfToken).toBe(issued);
    expect(verdict(() => first.ctx.verifyCsrf(first.csrfToken))).toBe(403); // no cookie was sent on this request
    const second = await asBrowser(o, undefined, issued);
    expect(second.getSetCookie()).toBeUndefined();
    expect(verdict(() => second.ctx.verifyCsrf(issued!))).toBe("accepted");
  });

  it("Bearer requests stay exempt, and an app with csrf: false still refuses", async () => {
    const o = freshOpts();
    const id = await login(o);
    const bearer = await createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);
    expect(verdict(() => bearer.ctx.verifyCsrf(""))).toBe("accepted");
    const off = freshOpts({ csrfCookie: false });
    const offId = await login(off);
    const request = await asBrowser(off, offId);
    expect(request.csrfToken).toBe("");
    expect(verdict(() => request.ctx.verifyCsrf(deriveSessionCsrfToken(offId, off)))).toBe(403);
  });

  it("the default check and the csrf = false opt-out work as before", async () => {
    const o = freshOpts();
    const id = await login(o);
    const request = await asBrowser(o, id);
    const run = (optedOut: boolean, headerToken?: string) =>
      verdict(() =>
        verifyCsrfByDefault({ method: "POST", cookieAuthenticated: true, optedOut, verifyCsrf: (s) => request.ctx.verifyCsrf(s), headerToken })
      );
    expect(run(false)).toBe(403);
    expect(run(false, "wrong")).toBe(403);
    expect(run(false, request.csrfToken)).toBe("accepted");
    expect(run(true)).toBe("accepted");
  });
});
