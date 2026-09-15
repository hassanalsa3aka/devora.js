import { describe, it, expect } from "vitest";
import { resolveSecurityHeaders, generateNonce, addNonceToCsp } from "../securityHeaders.js";

describe("resolveSecurityHeaders", () => {
  it("applies real defaults for an app with no security block at all — a default, not opt-in", () => {
    const headers = resolveSecurityHeaders(undefined);
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Strict-Transport-Security"]).toBeDefined();
  });

  it("a per-app CSP override replaces only the CSP header, not the others", () => {
    const headers = resolveSecurityHeaders({ csp: "default-src 'none'" });
    expect(headers["Content-Security-Policy"]).toBe("default-src 'none'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Strict-Transport-Security"]).toBeDefined();
  });

  it("a per-app frameOptions override replaces only that header", () => {
    const headers = resolveSecurityHeaders({ frameOptions: "SAMEORIGIN" });
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("hsts: false omits the Strict-Transport-Security header entirely", () => {
    const headers = resolveSecurityHeaders({ hsts: false });
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("hsts left unset (not explicitly false) still gets the header — the default is on", () => {
    const headers = resolveSecurityHeaders({ csp: "default-src 'none'" });
    expect(headers["Strict-Transport-Security"]).toBeDefined();
  });

  it("a streaming nonce is omitted from the CSP for every other render mode (no nonce passed)", () => {
    const headers = resolveSecurityHeaders(undefined);
    expect(headers["Content-Security-Policy"]).not.toContain("nonce-");
  });

  it("a streaming nonce adds a real script-src directive alongside the existing default-src", () => {
    const headers = resolveSecurityHeaders(undefined, "abc123");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self' 'nonce-abc123'");
  });

  it("a streaming nonce merges into a custom CSP override's own existing script-src", () => {
    const headers = resolveSecurityHeaders({ csp: "default-src 'self'; script-src 'self' https://cdn.example.com" }, "xyz789");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self' https://cdn.example.com 'nonce-xyz789'");
  });
});

describe("generateNonce", () => {
  it("produces a non-empty value", () => {
    expect(generateNonce().length).toBeGreaterThan(0);
  });

  it("produces a different value each call — a reused nonce across responses defeats its own purpose", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe("addNonceToCsp", () => {
  it("adds a new script-src directive when the policy has none (default-src was covering scripts)", () => {
    const result = addNonceToCsp("default-src 'self'; object-src 'none'", "n1");
    expect(result).toBe("default-src 'self'; object-src 'none'; script-src 'self' 'nonce-n1'");
  });

  it("appends to an existing script-src directive instead of adding a second one", () => {
    const result = addNonceToCsp("default-src 'self'; script-src 'self'", "n2");
    expect(result).toBe("default-src 'self'; script-src 'self' 'nonce-n2'");
    expect(result.match(/script-src/g)).toHaveLength(1);
  });

  it("real bug: adds the nonce to script-src-elem directly, instead of a spec-ineffective new script-src", () => {
    // CSP3's script-src-elem takes precedence over script-src for <script>
    // elements specifically — before this fix, a policy declaring ONLY
    // script-src-elem fell through unrecognized, and the nonce landed on a
    // brand-new script-src directive that the browser ignores for script
    // elements whenever script-src-elem is also present, silently leaving
    // React's own inline Suspense-patch script blocked.
    const result = addNonceToCsp("default-src 'self'; script-src-elem 'self'", "n3");
    expect(result).toBe("default-src 'self'; script-src-elem 'self' 'nonce-n3'");
    expect(result).not.toContain("script-src '"); // no spurious separate script-src directive
  });

  it("adds the nonce to both when a policy declares script-src AND script-src-elem separately", () => {
    const result = addNonceToCsp("script-src 'self'; script-src-elem 'self'", "n4");
    expect(result).toBe("script-src 'self' 'nonce-n4'; script-src-elem 'self' 'nonce-n4'");
  });
});
