/**
 * Regression tests for the red-team findings of 2026-11-05 (work-notes/redteam/REDTEAM.md, ROADMAP findings H24 to
 * H26). Each test failed before its fix.
 */
import { describe, it, expect } from "vitest";
import { dispatchApiRoute } from "../apiDispatch.js";
import { apiRoute } from "../apiRoute.js";
import { createRequestContext, parseCookieHeader, type SessionCookieOptions } from "../session.js";
import { createMemorySessionStore } from "../sessionStore.js";
import { CSRF_COOKIE_NAME, verifyCsrfByDefault } from "../csrf.js";
import { enforceRateLimit, RateLimitError } from "../rateLimit.js";

const opts: SessionCookieOptions = { name: "devora_session", secret: "test-secret", store: createMemorySessionStore() };

/** A live session cookie plus the CSRF cookie and its token, the way a browser that logged in has them. */
async function loggedIn() {
  const first = await createRequestContext({}, opts);
  await first.ctx.setSession({ userId: "u1" });
  const cookies = (first.getSetCookie() ?? []).map((c) => c.split(";")[0]);
  return { cookieHeader: cookies.join("; "), token: first.csrfToken };
}

describe("H24: a malformed escape in a cookie does not break the request", () => {
  it("keeps the raw value instead of throwing", () => {
    expect(parseCookieHeader("theme=%E0%A4%A; a=b%20c")).toEqual({ theme: "%E0%A4%A", a: "b c" });
    expect(() => parseCookieHeader("x=%")).not.toThrow();
  });

  it("a session request with a broken unrelated cookie still authenticates", async () => {
    const { cookieHeader } = await loggedIn();
    const result = await createRequestContext({ cookieHeader: `tracker=%zz%; ${cookieHeader}` }, opts);
    expect(result.ctx.session).toEqual({ userId: "u1" });
  });
});

describe("H25: the first value of a repeated cookie name wins", () => {
  it("a later duplicate (a cookie tossed in from a sibling subdomain) does not replace the first", () => {
    expect(parseCookieHeader(`${CSRF_COOKIE_NAME}=own; ${CSRF_COOKIE_NAME}=tossed`)[CSRF_COOKIE_NAME]).toBe("own");
  });

  it("names that exist on Object.prototype are ordinary cookies", () => {
    const parsed = parseCookieHeader("constructor=a; toString=b; __proto__=c; hasOwnProperty=d");
    expect(parsed.constructor).toBe("a");
    expect(parsed.toString).toBe("b");
    expect(parsed.hasOwnProperty).toBe("d");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("H26: CSRF and rate limits cover every method except GET, HEAD and OPTIONS", () => {
  it("verifyCsrfByDefault checks unusual methods on a cookie-authenticated request", () => {
    for (const method of ["PROPPATCH", "PURGE", "LINK", "MKCOL", "SEARCH", "REPORT"]) {
      let checked = false;
      verifyCsrfByDefault({ method, cookieAuthenticated: true, optedOut: false, verifyCsrf: () => void (checked = true) });
      expect(checked, method).toBe(true);
    }
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      let checked = false;
      verifyCsrfByDefault({ method, cookieAuthenticated: true, optedOut: false, verifyCsrf: () => void (checked = true) });
      expect(checked, method).toBe(false);
    }
  });

  it("an API route without `methods` answers a cookie-authenticated PURGE with no token with 403; the handler never runs", async () => {
    const { cookieHeader, token } = await loggedIn();
    let ran = 0;
    const handler = apiRoute(() => {
      ran++;
      return { status: 200, body: "ran" };
    });
    const request = { url: "/api/thing", body: Buffer.from(""), cookieHeader, sessionCookieOptions: opts };
    const refused = await dispatchApiRoute({ handler }, { ...request, method: "PURGE", headers: {} });
    expect(refused.status).toBe(403);
    expect(ran).toBe(0);
    const allowed = await dispatchApiRoute({ handler }, { ...request, method: "PURGE", headers: { "x-devora-csrf": token } });
    expect(allowed.status).toBe(200);
    expect(ran).toBe(1);
  });

  it("a route's rateLimit counts unusual methods too", () => {
    const config = { max: 2, windowSeconds: 60 };
    enforceRateLimit(config, "PURGE", "198.51.100.7");
    enforceRateLimit(config, "PROPPATCH", "198.51.100.7");
    expect(() => enforceRateLimit(config, "LINK", "198.51.100.7")).toThrow(RateLimitError);
    expect(() => enforceRateLimit(config, "GET", "198.51.100.7")).not.toThrow();
  });
});

describe("H27: ctx.url takes its host from the checked Host header, never from the request target", async () => {
  const { describeRequest, targetPathAndQuery } = await import("../trustProxy.js");
  const request = (url: string) => ({ headers: { host: "app.example.com" }, url, method: "GET", socket: {} });

  it("an absolute-form target does not replace the host", () => {
    expect(describeRequest(request("http://evil.example/reset?x=1"), false).url).toBe("http://app.example.com/reset?x=1");
    expect(describeRequest(request("https://evil.example"), false).url).toBe("http://app.example.com/");
  });

  it("a target starting with // stays a path on this host", () => {
    expect(describeRequest(request("//evil.example/x"), false).url).toBe("http://app.example.com/evil.example/x");
    expect(new URL(describeRequest(request("///evil.example"), false).url).host).toBe("app.example.com");
  });

  it("ordinary and odd targets", () => {
    expect(describeRequest(request("/a/b?c=1"), false).url).toBe("http://app.example.com/a/b?c=1");
    expect(targetPathAndQuery("*")).toBe("/");
    expect(targetPathAndQuery("not a url")).toBe("/");
  });
});

describe("H27 (fuzz): an absolute-form target whose path starts with // gives a single leading slash", async () => {
  const { targetPathAndQuery } = await import("../trustProxy.js");
  it("found by work-notes/redteam/scripts/fuzz.mts", () => {
    expect(targetPathAndQuery("https://comh//")).toBe("/");
    expect(targetPathAndQuery("http://a//b//c?x")).toBe("/b//c?x");
  });
});
