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

  it("real bug: the double-slash opt-out survives more than one level of nesting", () => {
    // Before this fix, joinRoutePath() *consumed* the "//" marker the first
    // time a parent flattened a child's routes in, so it only survived
    // exactly one register() call — a webhook module registered into an
    // intermediate "payments" module, itself registered into the app root,
    // would have silently come back re-prefixed as "/app/payments/webhooks/
    // stripe" or similar, defeating the entire point of the escape hatch.
    const stripeModule = defineModule({
      name: "stripe",
      routes: { "//webhooks/stripe": apiRoute(() => ok("stripe")) },
    });
    const payments = defineModule({ name: "payments" }, (m) => m.register(stripeModule));
    const app = defineModule({ name: "app" }, (root) => root.register(payments));

    expect(Object.keys(app.getRoutes())).toEqual(["/webhooks/stripe"]);
  });

  it("known footgun (documented, not fixed at the type level — Phase 4 audit, low severity): " +
    "feeding getRoutes() output back into another module's `routes` loses the \"//\" opt-out", () => {
    // The correct composition (register()) preserves the marker — this is
    // the control case, showing the SAME module composed correctly.
    const stripeModule = defineModule({
      name: "stripe",
      routes: { "//webhooks/stripe": apiRoute(() => ok("stripe")) },
    });
    const correctlyComposed = defineModule({ name: "app" }, (root) => root.register(stripeModule));
    expect(Object.keys(correctlyComposed.getRoutes())).toEqual(["/webhooks/stripe"]);

    // The footgun: feeding the module's own PUBLIC getRoutes() output
    // (already normalized — the marker is gone) into a new module's
    // `routes` field instead of using register(). Nothing in the type
    // system stops this (see ModuleDefinition.routes's doc comment) — the
    // route silently gets re-prefixed by whatever registers the wrapper,
    // instead of staying at its fixed path.
    const wrapper = defineModule({ name: "wrapper", routes: stripeModule.getRoutes() });
    const misComposed = defineModule({ name: "app" }, (root) => root.register(wrapper));
    expect(Object.keys(misComposed.getRoutes())).toEqual(["/wrapper/webhooks/stripe"]); // NOT "/webhooks/stripe"
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
