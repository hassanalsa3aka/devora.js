import { describe, it, expect } from "vitest";
import { assertValidDomain, nginxBlock, caddyBlock } from "../generate-proxy.js";
import type { AppConfig } from "@devorajs/core";

function fakeApp(domain: string): AppConfig {
  return { name: "demo", dir: "apps/demo", domain };
}

describe("assertValidDomain — real bug: unvalidated app.domain injected into nginx/Caddy config", () => {
  it("accepts a real, plain hostname", () => {
    expect(() => assertValidDomain(fakeApp("example.com"))).not.toThrow();
    expect(() => assertValidDomain(fakeApp("sub.example.co.uk"))).not.toThrow();
    expect(() => assertValidDomain(fakeApp("my-app-2.example.com"))).not.toThrow();
  });

  it("real bug: rejects a domain containing a newline (nginx directive injection)", () => {
    // Verified end-to-end in this session's audit: this exact shape injected
    // a whole extra `return 200 'pwned-by-config-injection';` directive into
    // a generated nginx.conf.
    const malicious = "evil.example.com;\n    return 200 'pwned-by-config-injection';\n    #";
    expect(() => assertValidDomain(fakeApp(malicious))).toThrow(/invalid domain/);
  });

  it("real bug: rejects a domain containing '{'/'}' (Caddy server-block injection)", () => {
    // Verified end-to-end: this exact shape produced a fully valid EXTRA
    // Caddy server block routing a hostname to an attacker-chosen backend.
    const malicious = "second.example.com {\n    reverse_proxy 10.0.0.1:9999\n}\nfoo.example.com";
    expect(() => assertValidDomain(fakeApp(malicious))).toThrow(/invalid domain/);
  });

  it("rejects other config-breaking characters (semicolons, spaces, quotes)", () => {
    expect(() => assertValidDomain(fakeApp("evil.com; rm -rf /"))).toThrow(/invalid domain/);
    expect(() => assertValidDomain(fakeApp("evil.com 'quoted'"))).toThrow(/invalid domain/);
    expect(() => assertValidDomain(fakeApp(""))).toThrow(/invalid domain/);
  });

  it("rejects a leading/trailing hyphen in a label (not a real hostname)", () => {
    expect(() => assertValidDomain(fakeApp("-evil.example.com"))).toThrow(/invalid domain/);
    expect(() => assertValidDomain(fakeApp("evil-.example.com"))).toThrow(/invalid domain/);
  });
});

describe("nginxBlock / caddyBlock — only reachable with an already-validated domain", () => {
  it("produces exactly one server block per app for a valid domain", () => {
    const app = fakeApp("example.com");
    const nginx = nginxBlock(app, 4000);
    expect(nginx.match(/server_name example\.com;/g)).toHaveLength(1);
    expect((nginx.match(/^server \{/gm) ?? []).length).toBe(1);

    const caddy = caddyBlock(app, 4000);
    expect(caddy.match(/^example\.com \{/gm)).toHaveLength(1);
  });
});
