import { describe, expect, it } from "vitest";
import { createHostCheck, normalizeHost } from "../allowedHosts.js";
import { requestHost } from "../trustProxy.js";

describe("normalizeHost", () => {
  it("drops the port, brackets, case and a trailing dot; refuses things that are not hosts", () => {
    expect(normalizeHost("App.Example.COM:8443")).toBe("app.example.com");
    expect(normalizeHost("app.example.com.")).toBe("app.example.com");
    expect(normalizeHost("[::1]:3000")).toBe("::1");
    expect(normalizeHost("::1")).toBe("::1");
    for (const bad of [undefined, "", "evil.com/path", "user@evil.com", "a b", "[::1"]) expect(normalizeHost(bad), String(bad)).toBeUndefined();
  });
});

describe("createHostCheck", () => {
  const check = createHostCheck(["app.example.com", ".example.org", "127.0.0.1"])!;

  it("allows listed hosts, any port, any case; a leading dot covers the domain and its subdomains", () => {
    for (const host of ["app.example.com", "APP.example.com:443", "example.org", "a.b.example.org:8080", "127.0.0.1:4173"]) expect(check(host), host).toBe(true);
  });

  it("refuses everything else, including look-alikes and a missing host", () => {
    for (const host of [undefined, "", "evil.com", "example.com", "app.example.com.evil.com", "notexample.org", "example.org.evil.com", "localhost"]) {
      expect(check(host), String(host)).toBe(false);
    }
  });

  it("is off when unset; the dev variant also allows loopback; bad entries are clear errors", () => {
    expect(createHostCheck(undefined)).toBeUndefined();
    const dev = createHostCheck(["app.example.com"], { allowLoopback: true })!;
    for (const host of ["localhost:10000", "127.0.0.1", "[::1]:3000"]) expect(dev(host), host).toBe(true);
    expect(dev("evil.com")).toBe(false);
    expect(() => createHostCheck([])).toThrow(/non-empty list/);
    expect(() => createHostCheck(["https://app.example.com"])).toThrow(/is not a host/);
    expect(() => createHostCheck(["app.example.com/path"])).toThrow(/is not a host/);
  });
});

describe("requestHost", () => {
  it("uses X-Forwarded-Host only when the proxy is trusted", () => {
    const headers = { host: "internal:4173", "x-forwarded-host": "app.example.com, evil.com" };
    expect(requestHost({ headers }, true)).toBe("app.example.com");
    expect(requestHost({ headers }, false)).toBe("internal:4173");
    expect(requestHost({ headers: {} }, true)).toBeUndefined();
  });
});
