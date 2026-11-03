import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { enforceRateLimit, FixedWindowRateLimiter, RateLimitError } from "../rateLimit.js";
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
