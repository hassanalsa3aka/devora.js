import { describe, it, expect } from "vitest";
import { defineModule } from "../module.js";
import { apiRoute, type ApiResponse } from "../apiRoute.js";
import type { RequestContext } from "../serverFn.js";

function ok(body: string): ApiResponse {
  return { status: 200, body };
}

describe("defineModule", () => {
  it("registers a child module's routes under its own name", () => {
    const usersModule = defineModule({
      name: "users",
      routes: { "/": apiRoute(() => ok("list users")), "/[id]": apiRoute(() => ok("one user")) },
    });
    const ordersModule = defineModule({
      name: "orders",
      routes: { "/": apiRoute(() => ok("list orders")) },
    });

    const app = defineModule({ name: "app" }, (root) => {
      root.register(usersModule);
      root.register(ordersModule);
    });

    const routes = app.getRoutes();
    expect(Object.keys(routes).sort()).toEqual(["/orders", "/users", "/users/[id]"].sort());
  });

  it("a `/`-prefixed (double-slash) route key opts out of namespacing", () => {
    const stripeModule = defineModule({
      name: "billing",
      routes: { "//webhooks/stripe": apiRoute(() => ok("stripe")) },
    });
    const app = defineModule({ name: "app" }, (root) => root.register(stripeModule));

    expect(Object.keys(app.getRoutes())).toEqual(["/webhooks/stripe"]);
  });

  it("two composed modules don't leak each other's internal state", () => {
    let usersCallCount = 0;
    const usersModule = defineModule({
      name: "users",
      functions: {
        getUser: async (_input: unknown, _ctx: RequestContext) => {
          usersCallCount++;
          return { id: "1" };
        },
      },
    });
    const ordersModule = defineModule({ name: "orders", functions: {} });

    const app = defineModule({ name: "app" }, (root) => {
      root.register(usersModule);
      root.register(ordersModule);
    });

    // A registered child's functions are NOT merged into the parent or
    // exposed to siblings — no cross-module surface unless explicitly
    // imported (see module.ts's doc comment on the scoping model).
    expect(app.functions).toEqual({});
    expect(ordersModule.functions).toEqual({});
    expect(usersModule.functions.getUser).toBeDefined();
    expect(usersCallCount).toBe(0); // never implicitly invoked by registration
  });

  it("throws on a genuine route collision between two modules registered under the same parent", () => {
    const a = defineModule({ name: "dup", routes: { "/x": apiRoute(() => ok("a")) } });
    const b = defineModule({ name: "dup", routes: { "/x": apiRoute(() => ok("b")) } });
    const app = defineModule({ name: "app" }, (root) => {
      root.register(a);
      root.register(b);
    });

    expect(() => app.getRoutes()).toThrow(/registered by more than one module/);
  });

  it("nests transitively — a grandchild's routes are namespaced through both levels", () => {
    const leaf = defineModule({ name: "items", routes: { "/": apiRoute(() => ok("items")) } });
    const mid = defineModule({ name: "orders" }, (m) => m.register(leaf));
    const app = defineModule({ name: "app" }, (root) => root.register(mid));

    expect(Object.keys(app.getRoutes())).toEqual(["/orders/items"]);
  });

  it("a real multi-module test app resolves every route to the right handler", async () => {
    const usersModule = defineModule({
      name: "users",
      routes: { "/[id]": apiRoute(() => ok("user")) },
    });
    const ordersModule = defineModule({
      name: "orders",
      routes: { "/": apiRoute(() => ok("orders")) },
    });
    const app = defineModule({ name: "app" }, (root) => {
      root.register(usersModule);
      root.register(ordersModule);
    });

    const routes = app.getRoutes();
    const usersHandler = routes["/users/[id]"];
    const ordersHandler = routes["/orders"];
    expect(usersHandler).toBeDefined();
    expect(ordersHandler).toBeDefined();

    const fakeReq = { method: "GET", url: "/", headers: {}, params: {}, body: Buffer.from("") };
    const fakeCtx = {} as RequestContext;
    expect(await usersHandler!(fakeReq, fakeCtx)).toEqual(ok("user"));
    expect(await ordersHandler!(fakeReq, fakeCtx)).toEqual(ok("orders"));
  });
});
