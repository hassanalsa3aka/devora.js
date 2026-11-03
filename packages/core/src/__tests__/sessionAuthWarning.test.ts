/**
 * Dev only: a route that reads ctx.session without ever calling
 * ctx.requireAuth() gets one console warning per path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { createRenderRoute } from "../renderRoute.js";
import { createRenderStreaming } from "../renderStreaming.js";
import { dispatchApiRoute } from "../apiDispatch.js";
import { createMemorySessionStore } from "../sessionStore.js";
import type { SessionCookieOptions } from "../session.js";

const sessionCookieOptions: SessionCookieOptions = { name: "devora_session", secret: "warn-test-secret", store: createMemorySessionStore() };
const renderRoute = createRenderRoute({ createElement, renderToString });
const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
const meta = (path: string) => ({ url: `http://localhost${path}`, method: "GET", headers: {} });
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  process.env.NODE_ENV = "development";
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});
const warningsFor = (path: string) =>
  warn.mock.calls.map((c: unknown[]) => String(c[0])).filter((m: string) => m.includes(`${path} read ctx.session`));

describe("dev warning: ctx.session read without ctx.requireAuth()", () => {
  it("a page loader that reads the session warns once per path; requireAuth() silences it", async () => {
    const reads = { loader: (ctx: { session?: unknown }) => ({ who: ctx.session ?? null }), default: () => null };
    await renderRoute(reads, { method: "GET", sessionCookieOptions, meta: meta("/w-page") });
    await renderRoute(reads, { method: "GET", sessionCookieOptions, meta: meta("/w-page?again=1") });
    expect(warningsFor("/w-page")).toHaveLength(1);
    expect(warningsFor("/w-page")[0]).toMatch(/call ctx\.requireAuth\(\) first/);

    const guarded = {
      loader: (ctx: { session?: unknown; requireAuth: () => void }) => {
        ctx.requireAuth();
        return ctx.session;
      },
      default: () => null,
    };
    const res = await renderRoute(guarded, { method: "GET", sessionCookieOptions, meta: meta("/w-guarded") });
    expect(res?.status).toBe(401);
    expect(warningsFor("/w-guarded")).toHaveLength(0);
  });

  it("an API route and a streaming loader warn too; a route that never reads the session does not", async () => {
    await dispatchApiRoute(
      { handler: (_req, ctx) => ({ status: 200, body: JSON.stringify(ctx.session ?? null) }) },
      { method: "GET", url: "/api/w-api", headers: {}, body: Buffer.from(""), sessionCookieOptions }
    );
    expect(warningsFor("/api/w-api")).toHaveLength(1);
    await renderStreaming(
      { renderMode: "streaming", loader: (ctx) => ({ who: ctx.session ?? null }), default: () => null },
      { sessionCookieOptions, meta: meta("/w-stream") }
    );
    expect(warningsFor("/w-stream")).toHaveLength(1);
    await renderRoute({ loader: () => ({}), default: () => null }, { method: "GET", sessionCookieOptions, meta: meta("/w-none") });
    expect(warningsFor("/w-none")).toHaveLength(0);
  });

  it("never in production", async () => {
    process.env.NODE_ENV = "production";
    await renderRoute(
      { loader: (ctx: { session?: unknown }) => ctx.session ?? null, default: () => null },
      { method: "GET", sessionCookieOptions, meta: meta("/w-prod") }
    );
    expect(warningsFor("/w-prod")).toHaveLength(0);
  });
});
