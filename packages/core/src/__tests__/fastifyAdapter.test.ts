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
