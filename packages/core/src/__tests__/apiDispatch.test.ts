import { describe, it, expect } from "vitest";
import { dispatchApiRoute } from "../apiDispatch.js";
import { apiRoute } from "../apiRoute.js";
import { HttpError } from "../httpError.js";
import { createRequestContext } from "../session.js";
import { createMemorySessionStore } from "../sessionStore.js";
import { CSRF_COOKIE_NAME } from "../csrf.js";
import type { SessionCookieOptions } from "../session.js";

const opts: SessionCookieOptions = { name: "devora_session", secret: "test-secret", store: createMemorySessionStore() };

function baseRequest(overrides: Partial<Parameters<typeof dispatchApiRoute>[1]> = {}) {
  return {
    method: "GET",
    url: "/api/hello",
    headers: {},
    body: Buffer.from(""),
    ...overrides,
  };
}

describe("dispatchApiRoute", () => {
  it("throws a clear error if the module has no handler export", async () => {
    // @ts-expect-error deliberately malformed module for this test
    await expect(dispatchApiRoute({}, baseRequest())).rejects.toThrow(/no exported `handler`/);
  });

  it("a 'none'-auth app (no sessionCookieOptions) gets a ctx whose requireAuth() throws", async () => {
    const handler = apiRoute((_req, ctx) => {
      expect(() => ctx.requireAuth()).toThrow(/sessions disabled/);
      return { status: 200, body: "ok" };
    });
    const result = await dispatchApiRoute({ handler }, baseRequest());
    expect(result.status).toBe(200);
  });

  it("passes params, method, and body through to the handler", async () => {
    const handler = apiRoute((req) => {
      expect(req.method).toBe("POST");
      expect(req.params).toEqual({ id: "42" });
      expect(req.body.toString("utf-8")).toBe('{"x":1}');
      return { status: 201, body: "created" };
    });
    const result = await dispatchApiRoute(
      { handler },
      baseRequest({ method: "POST", params: { id: "42" }, body: Buffer.from('{"x":1}') })
    );
    expect(result.status).toBe(201);
    expect(result.body).toBe("created");
  });

  it("a real session-carrying app: requireAuth() reflects an actual session cookie", async () => {
    // Establish a real session the same way session.test.ts does, then
    // confirm dispatchApiRoute's ctx sees it as authenticated — this is the
    // "sessions apply correctly to API routes too" requirement
    // (architecture-v2.md §3.2.2), exercised for real, not just via ctx's type.
    const established = await createRequestContext({}, opts);
    await established.ctx.setSession({ userId: "u1" });
    const setCookies = established.getSetCookie() ?? [];
    const sessionCookie = setCookies.find((c) => c.startsWith("devora_session="))!;
    const cookieHeader = sessionCookie.split(";")[0];

    const handler = apiRoute((_req, ctx) => {
      ctx.requireAuth(); // must not throw
      return { status: 200, body: JSON.stringify(ctx.session) };
    });
    const result = await dispatchApiRoute(
      { handler },
      baseRequest({ cookieHeader, sessionCookieOptions: opts })
    );
    expect(result.status).toBe(200);
    expect(result.body).toBe(JSON.stringify({ userId: "u1" }));
  });

  it("ctx.verifyCsrf() accepts a header-token string (not just FormData) for a same-origin API call", async () => {
    // First "request" establishes the CSRF cookie (same as a page render would).
    const first = await createRequestContext({}, opts);
    const csrfCookie = (first.getSetCookie() ?? []).find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))!;
    const csrfCookieValue = csrfCookie.split(";")[0];

    const handler = apiRoute((req, ctx) => {
      const headerToken = req.headers["x-devora-csrf"];
      ctx.verifyCsrf(typeof headerToken === "string" ? headerToken : "");
      return { status: 200, body: "verified" };
    });

    const goodResult = await dispatchApiRoute(
      { handler },
      baseRequest({
        method: "POST",
        cookieHeader: `${csrfCookieValue}`,
        sessionCookieOptions: opts,
        headers: { "x-devora-csrf": first.csrfToken },
      })
    );
    expect(goodResult.status).toBe(200);

    const badHandler = apiRoute((_req, ctx) => {
      ctx.verifyCsrf("not-the-real-token");
      return { status: 200, body: "should not reach here" };
    });
    const badResult = await dispatchApiRoute(
      { handler: badHandler },
      baseRequest({ method: "POST", cookieHeader: `${csrfCookieValue}`, sessionCookieOptions: opts })
    );
    expect(badResult.status).toBe(403);
    expect(JSON.parse(String(badResult.body))).toEqual({ message: "Missing or invalid CSRF token" });
  });

  it("collects Set-Cookie from a handler that calls ctx.setSession()", async () => {
    const handler = apiRoute((_req, ctx) => {
      ctx.setSession({ userId: "u2" });
      return { status: 200, body: "logged in" };
    });
    const result = await dispatchApiRoute({ handler }, baseRequest({ sessionCookieOptions: opts }));
    expect(result.setCookie?.some((c) => c.startsWith("devora_session="))).toBe(true);
  });

  describe("methods — real footgun this closes (Phase 4 audit follow-up)", () => {
    it("a route with no `methods` field behaves exactly as before (no silent behavior change)", async () => {
      const handler = apiRoute(() => ({ status: 200, body: "ok" }));
      const result = await dispatchApiRoute({ handler }, baseRequest({ method: "PATCH" }));
      expect(result.status).toBe(200);
    });

    it("rejects a method not in the declared allowlist with a real 405, before the handler ever runs", async () => {
      let handlerRan = false;
      const handler = apiRoute(() => {
        handlerRan = true;
        return { status: 200, body: "should never get here" };
      });
      const result = await dispatchApiRoute(
        { handler, methods: ["GET", "POST"] },
        baseRequest({ method: "DELETE" })
      );
      expect(result.status).toBe(405);
      expect(result.headers?.Allow).toBe("GET, POST");
      expect(handlerRan).toBe(false);
    });

    it("real bug this fixes: a method NOT meant to reach the handler's 'else' branch no longer silently does", async () => {
      // The exact shape apps/dashboard/api/hello.ts had: `if (method ===
      // "POST") { csrf-gated mutation } else { assumed-GET read }` — a PUT
      // used to fall into the "read" branch with no CSRF check at all,
      // since nothing enforced that only GET/POST could ever reach it.
      let csrfChecked = false;
      const handler = apiRoute((req, ctx) => {
        if (req.method === "POST") {
          csrfChecked = true;
          return { status: 200, body: "mutated" };
        }
        return { status: 200, body: "read" }; // meant only for GET
      });
      const result = await dispatchApiRoute(
        { handler, methods: ["GET", "POST"] },
        baseRequest({ method: "PUT" })
      );
      expect(result.status).toBe(405);
      expect(csrfChecked).toBe(false);
    });

    it("allows every declared method through to the handler", async () => {
      const seen: string[] = [];
      const handler = apiRoute((req) => {
        seen.push(req.method);
        return { status: 200, body: "ok" };
      });
      for (const method of ["GET", "POST"]) {
        await dispatchApiRoute({ handler, methods: ["GET", "POST"] }, baseRequest({ method }));
      }
      expect(seen).toEqual(["GET", "POST"]);
    });
  });

  describe("JSON error contract (devora-pre-v3-hotfixes.md #2)", () => {
    const parse = (body: unknown) => JSON.parse(String(body)) as { message: string };

    it("apiRoute() itself is no longer a no-op: calling the wrapped handler directly turns a throw into JSON", async () => {
      const wrapped = apiRoute(() => {
        throw new Error("kaboom");
      });
      const { ctx } = await createRequestContext({}, opts);
      const result = await wrapped(
        { method: "GET", url: "/api/x", headers: {}, params: {}, body: Buffer.from("") },
        ctx
      );
      expect(result.status).toBe(500);
      expect(result.headers?.["Content-Type"]).toMatch(/^application\/json/);
      expect(parse(result.body)).toEqual({ message: "kaboom" });
    });

    it("a handler exported WITHOUT apiRoute() still gets JSON — the dispatcher is its own chokepoint", async () => {
      const result = await dispatchApiRoute(
        {
          handler: () => {
            throw new Error("unwrapped kaboom");
          },
        },
        baseRequest()
      );
      expect(result.status).toBe(500);
      expect(parse(result.body)).toEqual({ message: "unwrapped kaboom" });
    });

    it("an HttpError keeps its status and message", async () => {
      const handler = apiRoute(() => {
        throw new HttpError(409, "already exists");
      });
      const result = await dispatchApiRoute({ handler }, baseRequest());
      expect(result.status).toBe(409);
      expect(parse(result.body)).toEqual({ message: "already exists" });
    });

    it("an app's own error class with a numeric `status` (duck-typed) keeps it too, not flattened to 500", async () => {
      class ApiError extends Error {
        constructor(
          public readonly status: number,
          message: string
        ) {
          super(message);
        }
      }
      const handler = apiRoute(() => {
        throw new ApiError(401, "Authentication required");
      });
      const result = await dispatchApiRoute({ handler }, baseRequest());
      expect(result.status).toBe(401);
      expect(parse(result.body)).toEqual({ message: "Authentication required" });
    });

    it("ctx.requireAuth() failing is a 401 JSON response, not a 500", async () => {
      const handler = apiRoute((_req, ctx) => {
        ctx.requireAuth();
        return { status: 200 };
      });
      const result = await dispatchApiRoute({ handler }, baseRequest({ sessionCookieOptions: opts }));
      expect(result.status).toBe(401);
      expect(parse(result.body)).toEqual({ message: "Authentication required" });
    });

    it("in production an unexpected error's message is hidden (logged server-side, not leaked)", async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const handler = apiRoute(() => {
          throw new Error("SELECT * FROM users -- internal detail");
        });
        const result = await dispatchApiRoute({ handler }, baseRequest());
        expect(result.status).toBe(500);
        expect(parse(result.body)).toEqual({ message: "Internal Server Error" });
      } finally {
        process.env.NODE_ENV = original;
      }
    });

    it("a 405 carries a JSON body too", async () => {
      const handler = apiRoute(() => ({ status: 200 }));
      const result = await dispatchApiRoute({ handler, methods: ["GET"] }, baseRequest({ method: "POST" }));
      expect(result.status).toBe(405);
      expect(parse(result.body)).toEqual({ message: "Method Not Allowed" });
    });
  });
});
