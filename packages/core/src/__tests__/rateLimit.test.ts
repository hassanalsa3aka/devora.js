import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { enforceRateLimit, FixedWindowRateLimiter, RateLimitError, rateLimitKey } from "../rateLimit.js";
import { dispatchApiRoute } from "../apiDispatch.js";
import { createRenderRoute } from "../renderRoute.js";
import { redirect } from "../actionResult.js";

describe("FixedWindowRateLimiter", () => {
  it("allows max per window per key, then says how long to wait; a new window starts fresh", () => {
    const limiter = new FixedWindowRateLimiter({ max: 3, windowSeconds: 60 });
    const t0 = 1_000_000;
    expect([limiter.hit("a", t0), limiter.hit("a", t0), limiter.hit("a", t0)]).toEqual([undefined, undefined, undefined]);
    expect(limiter.hit("a", t0 + 1_000)).toBe(59);
    expect(limiter.hit("b", t0 + 1_000)).toBeUndefined(); // another IP has its own count
    expect(limiter.hit("a", t0 + 60_000)).toBeUndefined();
  });

  it("stays bounded: expired keys go first, then the oldest", () => {
    const limiter = new FixedWindowRateLimiter({ max: 1, windowSeconds: 1 }, 100);
    for (let i = 0; i < 1_000; i++) limiter.hit(`ip-${i}`, 5_000 + i);
    expect(limiter.size).toBeLessThanOrEqual(100);
    // The newest key is still counted.
    expect(limiter.hit("ip-999", 5_999)).toBe(1);
  });

  it("refuses a config that is not whole numbers above zero", () => {
    expect(() => new FixedWindowRateLimiter({ max: 0, windowSeconds: 60 })).toThrow(/whole numbers above zero/);
    expect(() => new FixedWindowRateLimiter({ max: 5, windowSeconds: 0.5 })).toThrow(/whole numbers above zero/);
  });
});

describe("enforceRateLimit", () => {
  it("counts only POST/PUT/PATCH/DELETE, per route config, and throws a 429", () => {
    const config = { max: 1, windowSeconds: 60 };
    enforceRateLimit(config, "POST", "1.1.1.1");
    for (let i = 0; i < 5; i++) enforceRateLimit(config, "GET", "1.1.1.1");
    expect(() => enforceRateLimit(config, "post", "1.1.1.1")).toThrow(RateLimitError);
    // Another route (another config object) counts separately.
    enforceRateLimit({ max: 1, windowSeconds: 60 }, "POST", "1.1.1.1");
    enforceRateLimit(undefined, "POST", "1.1.1.1");
  });
});

describe("routes", () => {
  it("an API route with rateLimit answers 429 with Retry-After before the handler runs", async () => {
    let ran = 0;
    const route = {
      rateLimit: { max: 2, windowSeconds: 60 },
      handler: () => {
        ran++;
        return { status: 200, body: "{}" };
      },
    };
    const request = (ip: string) => ({ method: "POST", url: "/api/login", headers: {}, body: Buffer.from(""), meta: { url: "http://x/api/login", method: "POST", headers: {}, ip } });
    expect((await dispatchApiRoute(route, request("9.9.9.9"))).status).toBe(200);
    expect((await dispatchApiRoute(route, request("9.9.9.9"))).status).toBe(200);
    const limited = await dispatchApiRoute(route, request("9.9.9.9"));
    expect(limited.status).toBe(429);
    expect(limited.headers?.["Retry-After"]).toMatch(/^\d+$/);
    expect(JSON.parse(limited.body!)).toEqual({ message: "Too many requests, try again later" });
    expect(ran).toBe(2);
    expect((await dispatchApiRoute(route, request("8.8.8.8"))).status).toBe(200);
  });

  it("a page with rateLimit renders a 429 error page before the action runs", async () => {
    const renderRoute = createRenderRoute({ createElement, renderToString });
    let ran = 0;
    const route = {
      rateLimit: { max: 1, windowSeconds: 60 },
      action: () => {
        ran++;
        return redirect("/done");
      },
      default: () => null,
    };
    const meta = { url: "http://x/login", method: "POST", headers: {}, ip: "7.7.7.7" };
    expect((await renderRoute(route, { method: "POST", formData: new FormData(), meta }))?.status).toBe(303);
    const limited = await renderRoute(route, { method: "POST", formData: new FormData(), meta });
    expect(limited?.status).toBe(429);
    expect(ran).toBe(1);
    // A GET of the same page is never counted.
    expect((await renderRoute(route, { method: "GET", meta: { ...meta, method: "GET" } }))?.status).toBe(200);
  });
});

describe("IPv6 clients are counted by /64 prefix (H31)", () => {
  const config = { max: 3, windowSeconds: 60 };
  // enforceRateLimit keeps one limiter per config object, so each test makes its own
  const fresh = () => ({ ...config });

  it("rotating addresses inside one /64 share one count", () => {
    const own = fresh();
    const rotating = Array.from({ length: 6 }, (_, i) => `2001:db8:abcd:12::${(i + 1).toString(16)}`);
    const results = rotating.map((ip) => {
      try {
        enforceRateLimit(own, "POST", ip);
        return "ok";
      } catch (error) {
        return error instanceof RateLimitError ? "429" : "error";
      }
    });
    expect(results).toEqual(["ok", "ok", "ok", "429", "429", "429"]);
    // the interface part can be anything, including a random-looking 64 bits
    expect(() => enforceRateLimit(own, "POST", "2001:db8:abcd:12:dead:beef:1234:5678")).toThrow(RateLimitError);
  });

  it("different /64 prefixes have separate counts", () => {
    const own = fresh();
    for (let i = 0; i < 3; i++) enforceRateLimit(own, "POST", "2001:db8:abcd:12::1");
    expect(() => enforceRateLimit(own, "POST", "2001:db8:abcd:12::2")).toThrow(RateLimitError);
    for (const other of ["2001:db8:abcd:13::1", "2001:db8:abcd:11::1", "2001:db8:abce:12::1", "2001:db9:abcd:12::1"]) {
      expect(() => enforceRateLimit(own, "POST", other)).not.toThrow();
    }
  });

  it("writes one address several ways to one key; IPv4 and IPv4-mapped addresses count as IPv4", () => {
    const key = rateLimitKey("2001:db8::1");
    expect(key).toBe("2001:db8:0:0::/64");
    for (const same of ["2001:DB8::1", "2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8:0:0::ffff", "[2001:db8::1]", "2001:db8::1%eth0", "2001:db8:0:0:1:2:3:4"]) {
      expect(rateLimitKey(same), same).toBe(key);
    }
    expect(rateLimitKey("2001:db8:0:1::")).not.toBe(key);
    expect(rateLimitKey("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitKey("::ffff:cb00:7107")).toBe("203.0.113.7");
    expect(rateLimitKey("::1")).toBe("0:0:0:0::/64");
    expect(rateLimitKey("64:ff9b::192.0.2.33")).toBe("64:ff9b:0:0::/64");
  });

  it("an address it cannot read, and a missing address, are handled safely", () => {
    expect(rateLimitKey(undefined)).toBe("unknown");
    expect(rateLimitKey("")).toBe("unknown");
    for (const odd of ["not an address", "2001:db8:::1", "2001:db8:1:2:3:4:5:6:7", "1:2:3", "::ffff:999.1.1.1", "x".repeat(300)]) {
      expect(rateLimitKey(odd), odd).toBe(odd);
    }
  });

  it("IPv4 clients are counted per address, as before", () => {
    const own = fresh();
    for (let i = 0; i < 3; i++) enforceRateLimit(own, "POST", "203.0.113.7");
    expect(() => enforceRateLimit(own, "POST", "203.0.113.7")).toThrow(RateLimitError);
    expect(() => enforceRateLimit(own, "POST", "203.0.113.8")).not.toThrow();
  });
});
