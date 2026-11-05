/**
 * Phase 3B: fast paths added after profiling must give the same answer as the full code they skip.
 */
import { describe, it, expect } from "vitest";
import { redirectRefusal } from "../actionResult.js";
import { warnIfSessionReadWithoutAuth } from "../session.js";

const PLAIN = "ABCabc019-._~!$&'()*+,;=:@/?#";

describe("redirect(): the plain-path fast path", () => {
  it("every target it accepts resolves on the app's origin and does not change when decoded", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    for (let i = 0; i < 20_000; i++) {
      let target = "/";
      const n = Math.floor(rand() * 12);
      for (let j = 0; j < n; j++) target += PLAIN[Math.floor(rand() * PLAIN.length)];
      if (/^\/[/\\]/.test(target)) continue;
      expect(redirectRefusal({ redirect: target }), target).toBeUndefined();
      expect(new URL(target, "https://app.example.com/page").origin, target).toBe("https://app.example.com");
      expect(decodeURIComponent(target), target).toBe(target);
    }
  });

  it("targets outside the fast path still go through the full check", () => {
    for (const target of ["//evil.example", "/\\evil.example", "/%2F%2Fevil.example", "/%5Cevil.example", " //evil.example", "/\t/evil.example", "https://evil.example", "javascript:alert(1)"]) {
      expect(redirectRefusal({ redirect: target }), target).toBeDefined();
    }
    expect(redirectRefusal({ redirect: "/a%20b" })).toBeUndefined();
  });
});

describe("warnIfSessionReadWithoutAuth: order of the checks", () => {
  it("never warns in production and still warns in development", () => {
    const original = process.env.NODE_ENV;
    const warn = console.warn;
    const seen: string[] = [];
    console.warn = (message: string) => void seen.push(message);
    try {
      const usage = { authUsage: () => ({ sessionRead: true, requireAuthCalled: false }) };
      process.env.NODE_ENV = "production";
      warnIfSessionReadWithoutAuth(usage, "/perf-order-prod");
      expect(seen).toEqual([]);
      process.env.NODE_ENV = "development";
      warnIfSessionReadWithoutAuth(usage, "/perf-order-dev");
      expect(seen.length).toBe(1);
      warnIfSessionReadWithoutAuth({ authUsage: () => ({ sessionRead: false, requireAuthCalled: false }) }, "/perf-order-none");
      expect(seen.length).toBe(1);
    } finally {
      console.warn = warn;
      process.env.NODE_ENV = original;
    }
  });
});
