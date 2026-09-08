import { describe, it, expect } from "vitest";
import { generateCsrfToken, verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_FORM_FIELD } from "../csrf.js";

describe("generateCsrfToken", () => {
  it("produces a non-empty, URL-safe token", () => {
    const token = generateCsrfToken();
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces a different token each call", () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});

describe("verifyCsrfToken", () => {
  it("accepts a form value matching the cookie exactly", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it("rejects a missing cookie value", () => {
    expect(verifyCsrfToken(undefined, "anything")).toBe(false);
  });

  it("rejects a missing form value", () => {
    expect(verifyCsrfToken(generateCsrfToken(), null)).toBe(false);
  });

  it("rejects a mismatched form value", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token, "a-completely-different-value")).toBe(false);
  });

  it("rejects a non-string form value (e.g. a File)", () => {
    const token = generateCsrfToken();
    const file = new File(["x"], "x.txt");
    expect(verifyCsrfToken(token, file as unknown as FormDataEntryValue)).toBe(false);
  });

  it("exports the expected cookie/field names — a route relies on these being stable", () => {
    expect(CSRF_COOKIE_NAME).toBe("devora_csrf");
    expect(CSRF_FORM_FIELD).toBe("_csrf");
  });
});
