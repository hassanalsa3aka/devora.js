/**
 * redirect() keeps the browser on the app's origin unless the app lists the
 * other origins it trusts — checked when redirect() is called and again when
 * the response is built (a loader can return a plain `{ redirect }` object).
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { redirect, redirectRefusal } from "../actionResult.js";
import { createRenderRoute } from "../renderRoute.js";
import { createRenderStreaming } from "../renderStreaming.js";

const OFF_ORIGIN = [
  "//evil.com",
  "//evil.com/path",
  "///evil.com",
  "https://evil.com",
  "http://evil.com/login",
  "HTTPS://EVIL.COM",
  "https:evil.com",
  "/\\evil.com",
  "\\\\evil.com",
  "\\/evil.com",
  " //evil.com",
  "/\t/evil.com",
  "/\n/evil.com",
  "\u0000//evil.com",
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "%2F%2Fevil.com",
  "/%2F%2Fevil.com",
  "/%2f%2fevil.com",
  "/%5Cevil.com",
  "%2F%5Cevil.com",
  "https%3A%2F%2Fevil.com",
  "/%252F%252Fevil.com",
  "%252F%252Fevil.com",
];

const ON_ORIGIN = ["/", "/account", "/account?tab=2#top", "account", "../up", "?q=1", "#hash", "/search?q=https%3A%2F%2Fexample.com", "/a//b", ""];

describe("redirect() targets", () => {
  it.each(OFF_ORIGIN)("refuses %j", (to) => {
    expect(() => redirect(to)).toThrow(/leaves this app's origin/);
    let thrown: unknown;
    try {
      redirect(to);
    } catch (err) {
      thrown = err;
    }
    expect((thrown as { status?: number }).status).toBe(400);
  });

  it.each(ON_ORIGIN)("allows the path %j", (to) => {
    expect(redirect(to)).toEqual({ redirect: to });
  });

  it("an allowlisted origin may be the target; the list never opens other origins", () => {
    const allowedOrigins = ["https://accounts.example.com", "https://pay.example.com/ignored-path"];
    expect(redirect("https://accounts.example.com/login?next=/x", { allowedOrigins })).toMatchObject({
      redirect: "https://accounts.example.com/login?next=/x",
      allowedOrigins: ["https://accounts.example.com", "https://pay.example.com"],
    });
    expect(redirect("https://pay.example.com/checkout", { status: 303, allowedOrigins })).toMatchObject({ status: 303 });
    for (const to of ["https://evil.com", "//evil.com", "/\\evil.com", "http://accounts.example.com/", "https://accounts.example.com.evil.com/", "https://accounts.example.com@evil.com/", "javascript:alert(1)"]) {
      expect(() => redirect(to, { allowedOrigins }), to).toThrow(/leaves this app's origin/);
    }
    // Protocol-relative to an allowed host resolves to the app's own scheme, which is not known here: refused.
    expect(() => redirect("//accounts.example.com/x", { allowedOrigins })).toThrow(/leaves this app's origin/);
    expect(redirect("/still-fine", { allowedOrigins })).toMatchObject({ redirect: "/still-fine" });
  });

  it("a bad allowlist entry is a clear error", () => {
    expect(() => redirect("/x", { allowedOrigins: ["accounts.example.com"] })).toThrow(/is not an origin/);
    expect(() => redirect("/x", { allowedOrigins: ["ftp://files.example.com"] })).toThrow(/http or https/);
  });

  it("a very long refused target is shortened in the message", () => {
    const err = redirectRefusal({ redirect: `https://evil.com/${"a".repeat(500)}` });
    expect(err?.message.length).toBeLessThan(400);
  });
});

describe("a plain { redirect } object is checked when the response is built", () => {
  const renderRoute = createRenderRoute({ createElement, renderToString });

  it("SSR: a loader returning or throwing an off-origin object gets a 400 page, not a Location", async () => {
    const returned = await renderRoute({ loader: () => ({ redirect: "//evil.com" }), default: () => null }, { method: "GET" });
    expect(returned?.status).toBe(400);
    expect(returned?.redirectTo).toBeUndefined();
    const thrown = await renderRoute(
      {
        loader: () => {
          throw { redirect: "https://evil.com" };
        },
        default: () => null,
      },
      { method: "GET" }
    );
    expect(thrown?.status).toBe(400);
    expect(thrown?.redirectTo).toBeUndefined();
    const action = await renderRoute(
      { action: () => ({ redirect: "/\\evil.com" }), default: () => null },
      { method: "POST", formData: new FormData() }
    );
    expect(action?.status).toBe(400);
    expect(action?.redirectTo).toBeUndefined();
    const fine = await renderRoute({ loader: () => ({ redirect: "/ok" }), default: () => null }, { method: "GET" });
    expect(fine).toMatchObject({ status: 302, redirectTo: "/ok" });
  });

  it("streaming: the same, before any HTML is sent", async () => {
    const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
    const returned = await renderStreaming({ renderMode: "streaming", loader: () => ({ redirect: "//evil.com" }), default: () => null }, {});
    expect(returned?.status).toBe(400);
    expect(returned?.redirectTo).toBeUndefined();
    const thrown = await renderStreaming(
      {
        renderMode: "streaming",
        loader: () => {
          throw { redirect: "%2F%2Fevil.com" };
        },
        default: () => null,
      },
      {}
    );
    expect(thrown?.status).toBe(400);
    expect(thrown?.redirectTo).toBeUndefined();
    const fine = await renderStreaming({ renderMode: "streaming", loader: () => ({ redirect: "/ok" }), default: () => null }, {});
    expect(fine).toMatchObject({ status: 302, redirectTo: "/ok" });
  });
});
