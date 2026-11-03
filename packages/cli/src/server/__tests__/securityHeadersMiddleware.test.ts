/**
 * The dev server's header middleware: the app's page policy everywhere, the
 * sandboxing policy on an `.svg` (Vite serves public files after it runs).
 */
import { describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { SVG_CSP } from "@devorajs/core";
import { createSecurityHeadersMiddleware } from "../securityHeadersMiddleware.js";

function run(url: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const res = { setHeader: (name: string, value: string) => void (headers[name.toLowerCase()] = value) } as unknown as ServerResponse;
  let calledNext = false;
  createSecurityHeadersMiddleware(undefined)({ url } as IncomingMessage, res, () => void (calledNext = true));
  expect(calledNext).toBe(true);
  return headers;
}

describe("dev security headers", () => {
  it("an SVG gets the sandboxing policy; a page keeps the page policy; both get nosniff", () => {
    expect(run("/logo.svg")["content-security-policy"]).toBe(SVG_CSP);
    expect(run("/Logo.SVG?t=1")["content-security-policy"]).toBe(SVG_CSP);
    expect(run("/")["content-security-policy"]).toContain("default-src 'self'");
    expect(run("/logo.svg")["x-content-type-options"]).toBe("nosniff");
    expect(run("/")["x-content-type-options"]).toBe("nosniff");
  });
});
