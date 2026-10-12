import { describe, expect, it } from "vitest";
import { corsResponse, validateCorsConfig } from "../cors.js";

describe("corsResponse (round 3 K4)", () => {
  const cors = { origins: ["https://app.example.com", "https://*.partner.test"] };

  it("no config: no CORS headers at all", () => {
    expect(corsResponse(undefined, "GET", { origin: "https://evil.test" })).toEqual({ headers: {}, preflight: false });
  });

  it("an allowed origin is echoed with Vary; others get nothing that allows them", () => {
    expect(corsResponse(cors, "GET", { origin: "https://app.example.com" }).headers).toEqual({
      "Access-Control-Allow-Origin": "https://app.example.com",
      Vary: "Origin",
    });
    expect(corsResponse(cors, "GET", { origin: "https://a.b.partner.test" }).headers["Access-Control-Allow-Origin"]).toBe(
      "https://a.b.partner.test"
    );
    for (const origin of ["https://evil.test", "https://partner.test", "http://app.example.com", "https://app.example.com.evil.test"]) {
      expect(corsResponse(cors, "GET", { origin }).headers, origin).toEqual({ Vary: "Origin" });
    }
  });

  it("preflight: answered, with methods/headers/max-age; credentials when enabled", () => {
    const result = corsResponse({ ...cors, credentials: true }, "OPTIONS", {
      origin: "https://app.example.com",
      "access-control-request-method": "PUT",
      "access-control-request-headers": "content-type, authorization",
    });
    expect(result.preflight).toBe(true);
    expect(result.headers).toMatchObject({
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Max-Age": "600",
    });
    // A plain OPTIONS without the preflight header isn't a preflight.
    expect(corsResponse(cors, "OPTIONS", { origin: "https://app.example.com" }).preflight).toBe(false);
  });

  it('"*" allows any origin', () => {
    expect(corsResponse({ origins: "*" }, "GET", { origin: "https://x.test" }).headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("validation rejects mistakes instead of silently blocking", () => {
    expect(() => validateCorsConfig("api", { origins: ["https://app.example.com/"] })).toThrow(/isn't an origin/);
    expect(() => validateCorsConfig("api", { origins: ["app.example.com"] })).toThrow(/isn't an origin/);
    expect(() => validateCorsConfig("api", { origins: [] })).toThrow(/non-empty/);
    expect(() => validateCorsConfig("api", { origins: "*", credentials: true })).toThrow(/can't be combined/);
    expect(() => validateCorsConfig("api", { origins: ["http://localhost:3000", "https://*.example.com"] })).not.toThrow();
  });
});
