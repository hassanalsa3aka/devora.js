import { describe, it, expect } from "vitest";
import cors from "cors";
import { withMiddleware, fromExpressMiddleware, type Middleware } from "../middleware.js";
import { apiRoute, type ApiRequest } from "../apiRoute.js";
import type { RequestContext } from "../serverFn.js";

function fakeReq(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return { method: "GET", url: "/x", headers: {}, params: {}, body: Buffer.from(""), ...overrides };
}
const fakeCtx = {} as RequestContext;

describe("withMiddleware", () => {
  it("runs middlewares in the order given, then the handler last", async () => {
    const order: string[] = [];
    const logging: Middleware = (next) => async (req, ctx) => {
      order.push("logging");
      return next(req, ctx);
    };
    const auth: Middleware = (next) => async (req, ctx) => {
      order.push("auth");
      return next(req, ctx);
    };
    const handler = apiRoute(() => {
      order.push("handler");
      return { status: 200 };
    });

    await withMiddleware(handler, logging, auth)(fakeReq(), fakeCtx);
    expect(order).toEqual(["logging", "auth", "handler"]);
  });

  it("a middleware can short-circuit and never call the wrapped handler", async () => {
    let handlerCalled = false;
    const rateLimit: Middleware = (next) => async (req, ctx) => {
      return { status: 429, body: "slow down" };
    };
    const handler = apiRoute(() => {
      handlerCalled = true;
      return { status: 200 };
    });

    const result = await withMiddleware(handler, rateLimit)(fakeReq(), fakeCtx);
    expect(result).toEqual({ status: 429, body: "slow down" });
    expect(handlerCalled).toBe(false);
  });

  it("a real multi-middleware stack (logging + auth check + rate limit) on one route", async () => {
    const order: string[] = [];
    let requestCount = 0;
    const logging: Middleware = (next) => async (req, ctx) => {
      order.push(`log:${req.method}`);
      return next(req, ctx);
    };
    const requireAuthMw: Middleware = (next) => async (req, ctx) => {
      ctx.requireAuth();
      order.push("auth:ok");
      return next(req, ctx);
    };
    const rateLimit: Middleware = (next) => async (req, ctx) => {
      requestCount++;
      if (requestCount > 2) return { status: 429, body: "rate limited" };
      order.push(`rate:${requestCount}`);
      return next(req, ctx);
    };
    const handler = apiRoute(() => ({ status: 200, body: "ok" }));

    const stacked = withMiddleware(handler, logging, requireAuthMw, rateLimit);
    const authedCtx = { requireAuth: () => {} } as unknown as RequestContext;

    const r1 = await stacked(fakeReq(), authedCtx);
    const r2 = await stacked(fakeReq(), authedCtx);
    const r3 = await stacked(fakeReq(), authedCtx);

    expect(r1).toEqual({ status: 200, body: "ok" });
    expect(r2).toEqual({ status: 200, body: "ok" });
    expect(r3).toEqual({ status: 429, body: "rate limited" });
    expect(order).toEqual(["log:GET", "auth:ok", "rate:1", "log:GET", "auth:ok", "rate:2", "log:GET", "auth:ok"]);
  });
});

describe("fromExpressMiddleware", () => {
  it("wraps a hand-written Express-shaped middleware that calls next()", async () => {
    const setXPowered: Middleware = fromExpressMiddleware((req, res, next) => {
      res.setHeader("X-Powered-By", "devora");
      next();
    });
    const handler = apiRoute(() => ({ status: 200, body: "hi" }));
    const result = await withMiddleware(handler, setXPowered)(fakeReq(), fakeCtx);
    expect(result.status).toBe(200);
    expect(result.headers?.["X-Powered-By"]).toBe("devora");
  });

  it("a middleware that calls res.end() short-circuits without reaching the handler", async () => {
    let handlerCalled = false;
    const blocker: Middleware = fromExpressMiddleware((req, res) => {
      res.statusCode = 403;
      res.end("blocked");
    });
    const handler = apiRoute(() => {
      handlerCalled = true;
      return { status: 200 };
    });
    const result = await withMiddleware(handler, blocker)(fakeReq(), fakeCtx);
    expect(result).toEqual({ status: 403, headers: {}, body: "blocked" });
    expect(handlerCalled).toBe(false);
  });

  it("propagates an error passed to next(err)", async () => {
    const failing: Middleware = fromExpressMiddleware((req, res, next) => {
      next(new Error("boom"));
    });
    const handler = apiRoute(() => ({ status: 200 }));
    await expect(withMiddleware(handler, failing)(fakeReq(), fakeCtx)).rejects.toThrow("boom");
  });

  it("the real published `cors` package works through this adapter, not just a hand-written fake", async () => {
    const corsMw: Middleware = fromExpressMiddleware(cors({ origin: "https://example.com" }));
    const handler = apiRoute(() => ({ status: 200, body: "data" }));

    const result = await withMiddleware(handler, corsMw)(
      fakeReq({ headers: { origin: "https://example.com" } }),
      fakeCtx
    );
    expect(result.status).toBe(200);
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("https://example.com");
  });

  it("a real cors preflight (OPTIONS) short-circuits via res.end(), same as the browser expects", async () => {
    const corsMw: Middleware = fromExpressMiddleware(cors());
    const handler = apiRoute(() => ({ status: 200, body: "should not run" }));

    const result = await withMiddleware(handler, corsMw)(
      fakeReq({ method: "OPTIONS", headers: { origin: "https://example.com" } }),
      fakeCtx
    );
    expect(result.status).toBe(204); // cors' documented default preflight status
    expect(result.body).not.toBe("should not run");
  });
});
