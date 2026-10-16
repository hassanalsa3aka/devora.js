import { describe, expect, it } from "vitest";
import { requestContextFields } from "../serverFn.js";
import { createNoAuthContext } from "../session.js";

describe("requestContextFields", () => {
  const meta = { url: "https://example.test/a?b=1", method: "POST", headers: { "x-one": "1", "x-many": ["a", "b"], "x-skip": undefined } as Record<string, string | string[] | undefined>, ip: "10.0.0.1" };

  it("builds url and headers on first read and returns the same objects after", () => {
    const f = requestContextFields(meta);
    const url = f.url;
    expect(url.href).toBe("https://example.test/a?b=1");
    expect(f.url).toBe(url);
    const headers = f.headers;
    expect(headers.get("x-one")).toBe("1");
    expect(headers.get("x-many")).toBe("a, b");
    expect(headers.has("x-skip")).toBe(false);
    expect(f.headers).toBe(headers);
    expect(f.method).toBe("POST");
    expect(f.ip).toBe("10.0.0.1");
  });

  it("falls back to localhost for an unparseable URL, and drops a header value Fetch rejects", () => {
    const f = requestContextFields({ url: "not a url", method: "GET", headers: { "x-bad": "line\nbreak", "x-ok": "yes" } });
    expect(f.url.href).toBe("http://localhost/");
    expect(f.headers.get("x-ok")).toBe("yes");
    expect(f.headers.has("x-bad")).toBe(false);
  });

  it("request carries the same url, method and headers", () => {
    const f = requestContextFields(meta);
    expect(f.request.url).toBe("https://example.test/a?b=1");
    expect(f.request.method).toBe("POST");
    expect(f.request.headers.get("x-one")).toBe("1");
    expect(f.request).toBe(f.request);
  });

  it("a request nobody inspects builds nothing (ctx.url is still correct when read later)", () => {
    const { ctx } = createNoAuthContext({}, meta);
    expect(ctx.url.pathname).toBe("/a");
    expect(ctx.headers.get("x-one")).toBe("1");
    expect(ctx.url).toBe(ctx.url);
  });
});
