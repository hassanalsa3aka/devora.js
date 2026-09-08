import { describe, it, expect } from "vitest";
import { resolveSecurityHeaders } from "../securityHeaders.js";

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
});
