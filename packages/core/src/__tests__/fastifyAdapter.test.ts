import { describe, it, expect } from "vitest";
import { fromFastifyPlugin, type FastifyPlugin } from "../fastifyAdapter.js";
import type { RequestContext } from "../serverFn.js";

const fakeCtx = {} as RequestContext;

describe("fromFastifyPlugin", () => {
  it("adapts a real Fastify-shaped plugin's route registrations into a DevoraModule", async () => {
    const plugin: FastifyPlugin = (instance, _opts, done) => {
      instance.get("/ping", () => ({ pong: true }));
      instance.post("/echo", (request, reply) => {
        reply.code(201);
        reply.send(request.body.toString("utf-8"));
      });
      done();
    };

    // getRoutes() on the module itself (not yet registered into a parent)
    // returns its own routes unprefixed — same convention module.ts already
    // uses (a module's own name only prefixes its routes from its parent's
    // point of view, once registered — see module.test.ts).
    const mod = fromFastifyPlugin("demo", plugin);
    const routes = mod.getRoutes();
    expect(Object.keys(routes).sort()).toEqual(["/echo", "/ping"]);

    const pingResult = await routes["/ping"]!(
      { method: "GET", url: "/ping", headers: {}, params: {}, body: Buffer.from("") },
      fakeCtx
    );
    expect(pingResult.status).toBe(200);
    expect(pingResult.body).toBe(JSON.stringify({ pong: true }));

    // No content-type header here — non-JSON, so request.body stays the raw
    // Buffer, same as before this fix (only application/json gets parsed —
    // see the dedicated describe block below for that case).
    const echoResult = await routes["/echo"]!(
      { method: "POST", url: "/echo", headers: {}, params: {}, body: Buffer.from("hello") },
      fakeCtx
    );
    expect(echoResult.status).toBe(201);
    expect(echoResult.body).toBe("hello");
  });

  it("supports a plugin nesting another plugin via instance.register()", () => {
    const child: FastifyPlugin = (instance, _opts, done) => {
      instance.get("/inner", () => "ok");
      done();
    };
    const parent: FastifyPlugin = (instance, _opts, done) => {
      instance.register(child);
      done();
    };

    // "outer" registered "outer-sub-0" (the auto-named nested plugin, with
    // an incrementing suffix — see the real sibling-naming-collision bug
    // fixed below) as a child — outer.getRoutes() prefixes the child's
    // routes by the CHILD's own name ("outer-sub-0"), not outer's own name
    // (that prefixing only happens one level further up, from some other
    // module's point of view after *it* registers "outer" — see module.ts's
    // doc comment).
    const mod = fromFastifyPlugin("outer", parent);
    expect(Object.keys(mod.getRoutes())).toEqual(["/outer-sub-0/inner"]);
  });

  it("real bug: two different sibling sub-plugins registered under the same parent get distinct names, not a collision", () => {
    const first: FastifyPlugin = (instance, _opts, done) => {
      instance.get("/first-route", () => "first");
      done();
    };
    const second: FastifyPlugin = (instance, _opts, done) => {
      instance.get("/second-route", () => "second");
      done();
    };
    const parent: FastifyPlugin = (instance, _opts, done) => {
      instance.register(first);
      instance.register(second);
      done();
    };

    // Before this fix, both siblings were named "outer-sub" identically —
    // this either silently merged their namespace or, had they declared a
    // route at the same relative path, tripped module.ts's duplicate-route
    // check with a misleading error. Both routes must be reachable, each
    // under its own distinct prefix.
    const mod = fromFastifyPlugin("outer", parent);
    const routes = mod.getRoutes();
    expect(Object.keys(routes).sort()).toEqual(["/outer-sub-0/first-route", "/outer-sub-1/second-route"]);
  });

  it("throws immediately if the plugin uses an unsupported instance method (addHook)", () => {
    const plugin: FastifyPlugin = (instance, _opts, done) => {
      // @ts-expect-error deliberately calling an unsupported real Fastify method
      instance.addHook("onRequest", () => {});
      done();
    };
    expect(() => fromFastifyPlugin("bad", plugin)).toThrow(/addHook/);
  });

  it("throws if the plugin never calls done() synchronously", () => {
    const plugin: FastifyPlugin = (_instance, _opts, _done) => {
      // never calls done()
    };
    expect(() => fromFastifyPlugin("hangs", plugin)).toThrow(/must call done\(\)/);
  });

  describe("real bug: per-verb routes no longer collapse to one path-keyed handler", () => {
    it("GET and POST registered at the same path each invoke their own handler, not whichever was registered last", async () => {
      // The exact shape a real, idiomatic Fastify plugin uses (GET to read,
      // POST to mutate, same path) — before this fix, the second
      // registration silently overwrote the first in the shared
      // path-keyed route table, and EVERY method (including GET) invoked
      // whichever handler survived.
      let deletedCalled = false;
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.get("/account", () => ({ read: true }));
        instance.post("/account", () => {
          deletedCalled = true;
          return { deletedAccount: true };
        });
        done();
      };
      const mod = fromFastifyPlugin("accounts", plugin);
      const routes = mod.getRoutes();
      expect(Object.keys(routes)).toEqual(["/account"]);

      const getResult = await routes["/account"]!(
        { method: "GET", url: "/account", headers: {}, params: {}, body: Buffer.from("") },
        fakeCtx
      );
      expect(getResult.body).toBe(JSON.stringify({ read: true }));
      expect(deletedCalled).toBe(false);

      const postResult = await routes["/account"]!(
        { method: "POST", url: "/account", headers: {}, params: {}, body: Buffer.from("") },
        fakeCtx
      );
      expect(postResult.body).toBe(JSON.stringify({ deletedAccount: true }));
      expect(deletedCalled).toBe(true);
    });

    it("a method nobody registered at that path gets a 405, not a silently-reused handler", async () => {
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.get("/account", () => ({ read: true }));
        done();
      };
      const mod = fromFastifyPlugin("accounts", plugin);
      const result = await mod.getRoutes()["/account"]!(
        { method: "DELETE", url: "/account", headers: {}, params: {}, body: Buffer.from("") },
        fakeCtx
      );
      expect(result.status).toBe(405);
      expect(result.headers?.Allow).toBe("GET");
    });
  });

  describe("real bug: request.body is now parsed for application/json, matching real Fastify's default behavior", () => {
    it("parses a JSON body into an object, not a raw Buffer", async () => {
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.post("/webhook", (request) => ({ received: request.body }));
        done();
      };
      const mod = fromFastifyPlugin("hooks", plugin);
      const result = await mod.getRoutes()["/webhook"]!(
        {
          method: "POST",
          url: "/webhook",
          headers: { "content-type": "application/json" },
          params: {},
          body: Buffer.from(JSON.stringify({ dryRun: true })),
        },
        fakeCtx
      );
      expect(result.body).toBe(JSON.stringify({ received: { dryRun: true } }));
    });

    it("real bug: a feature-flag field in a JSON body is no longer silently undefined (the fail-open scenario)", async () => {
      // Before this fix, request.body was always the raw Buffer regardless
      // of content-type — request.body.dryRun was undefined (a Buffer has
      // no such property), so a plugin's `if (request.body.dryRun) { safe }
      // else { destructive }` always took the destructive branch, even for
      // a caller who explicitly asked for a dry run.
      let ranDestructive = false;
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.post("/migrate", (request) => {
          const body = request.body as { dryRun?: boolean };
          if (body.dryRun) return { ok: true, ran: false };
          ranDestructive = true;
          return { ok: true, ran: true };
        });
        done();
      };
      const mod = fromFastifyPlugin("migrations", plugin);
      const result = await mod.getRoutes()["/migrate"]!(
        {
          method: "POST",
          url: "/migrate",
          headers: { "content-type": "application/json" },
          params: {},
          body: Buffer.from(JSON.stringify({ dryRun: true })),
        },
        fakeCtx
      );
      expect(JSON.parse(result.body as string)).toEqual({ ok: true, ran: false });
      expect(ranDestructive).toBe(false);
    });

    it("invalid JSON with a JSON content-type gets a 400, matching real Fastify's fail-closed behavior", async () => {
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.post("/webhook", (request) => ({ received: request.body }));
        done();
      };
      const mod = fromFastifyPlugin("hooks", plugin);
      const result = await mod.getRoutes()["/webhook"]!(
        {
          method: "POST",
          url: "/webhook",
          headers: { "content-type": "application/json" },
          params: {},
          body: Buffer.from("{not valid json"),
        },
        fakeCtx
      );
      expect(result.status).toBe(400);
    });

    it("a non-JSON content-type still gets the raw Buffer, unchanged", async () => {
      const plugin: FastifyPlugin = (instance, _opts, done) => {
        instance.post("/upload", (request) => (request.body as Buffer).length);
        done();
      };
      const mod = fromFastifyPlugin("files", plugin);
      const result = await mod.getRoutes()["/upload"]!(
        {
          method: "POST",
          url: "/upload",
          headers: { "content-type": "application/octet-stream" },
          params: {},
          body: Buffer.from("binary data"),
        },
        fakeCtx
      );
      expect(result.body).toBe("11");
    });
  });

  it("params from the file-based router reach the Fastify-shaped request.params", async () => {
    const plugin: FastifyPlugin = (instance, _opts, done) => {
      instance.get("/[id]", (request) => ({ id: request.params.id }));
      done();
    };
    const mod = fromFastifyPlugin("users", plugin);
    const handler = mod.getRoutes()["/[id]"]!;
    const result = await handler(
      { method: "GET", url: "/users/42", headers: {}, params: { id: "42" }, body: Buffer.from("") },
      fakeCtx
    );
    expect(result.body).toBe(JSON.stringify({ id: "42" }));
  });
});
