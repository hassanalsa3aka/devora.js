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

    // "outer" registered "outer-sub" (the auto-named nested plugin) as a
    // child — outer.getRoutes() prefixes the child's routes by the CHILD's
    // own name ("outer-sub"), not outer's own name (that prefixing only
    // happens one level further up, from some other module's point of view
    // after *it* registers "outer" — see module.ts's doc comment).
    const mod = fromFastifyPlugin("outer", parent);
    expect(Object.keys(mod.getRoutes())).toEqual(["/outer-sub/inner"]);
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
