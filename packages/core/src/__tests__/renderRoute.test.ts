import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic, resolveRenderMode, type RenderRouteDeps } from "../renderRoute.js";
import { redirect } from "../actionResult.js";
import { renderCsrShell } from "../csrRoute.js";
import { Island } from "../islandComponent.js";
import { island } from "../island.js";
import type { RouteModule } from "../route.js";
import type { SessionCookieOptions } from "../session.js";

/**
 * `RenderRouteDeps`'s `createElement`/`renderToString` params are typed
 * `unknown` on purpose — `packages/core` has no dependency on react's own
 * types (see renderRoute.ts's doc comment). Real react's actual signatures
 * are narrower (`createElement`'s `type` param, e.g., only accepts known
 * JSX element/component types, not literally anything), so passing the
 * real functions never structurally satisfies the loose interface — this
 * exact mismatch already exists in every real `entry-server.tsx` too, it's
 * just never caught there because `devora build` never runs `tsc` over app
 * code (the same already-documented gap `packages/cli`'s own 3 pre-existing
 * type errors describe). One explicit, honest bridge here rather than
 * fighting real variance rules across every call site.
 */
function deps(): RenderRouteDeps {
  return { createElement, renderToString } as unknown as RenderRouteDeps;
}

const sessionCookieOptions: SessionCookieOptions = { name: "devora_session", secret: "test-secret" };

/**
 * The real SSR request-handler logic (route matched -> action/loader ->
 * render), exercised directly against `createRenderRoute` rather than
 * through an actual HTTP server — `ssrMiddleware.ts`/`prodRequestHandler.ts`
 * are thin adapters around exactly this function (route matching, cookie
 * parsing, response framing), already covered end-to-end by hand
 * throughout this project's development; what's tested here is the part
 * that's identical regardless of which HTTP layer calls it.
 */
describe("createRenderRoute (renderMode: \"ssr\")", () => {
  it("renders a GET request's default component to real HTML, running loader first", async () => {
    const routeModule: RouteModule = {
      loader: async () => ({ name: "world" }),
      default: ({ data }) => createElement("h1", null, `Hello, ${(data as { name: string })?.name}`),
    };
    const renderRoute = createRenderRoute(deps());
    const result = await renderRoute(routeModule, { method: "GET" });
    expect(result?.status).toBe(200);
    expect(result?.html).toContain("Hello, world");
  });

  it("runs action before loader on POST, and a normal action result still renders the page", async () => {
    const calls: string[] = [];
    const routeModule: RouteModule = {
      action: async () => {
        calls.push("action");
      },
      loader: async () => {
        calls.push("loader");
        return {};
      },
      default: () => createElement("div", null, "ok"),
    };
    const renderRoute = createRenderRoute(deps());
    const formData = new FormData();
    await renderRoute(routeModule, { method: "POST", formData });
    expect(calls).toEqual(["action", "loader"]);
  });

  it("an action returning a redirect() short-circuits — loader and render never run, no HTML body", async () => {
    const calls: string[] = [];
    const routeModule: RouteModule = {
      action: async () => redirect("/"),
      loader: async () => {
        calls.push("loader-should-not-run");
        return {};
      },
      default: () => createElement("div", null, "should not render"),
    };
    const renderRoute = createRenderRoute(deps());
    const formData = new FormData();
    const result = await renderRoute(routeModule, { method: "POST", formData });
    expect(result?.status).toBe(302);
    expect(result?.redirectTo).toBe("/");
    expect(result?.html).toBe("");
    expect(calls).toEqual([]);
  });

  it("ctx passed to loader/action is a real, working session context when sessionCookieOptions is given", async () => {
    let sawSession: unknown;
    const routeModule: RouteModule = {
      loader: async (ctx) => {
        sawSession = ctx.session;
        return {};
      },
      default: () => createElement("div", null, "ok"),
    };
    const renderRoute = createRenderRoute(deps());
    await renderRoute(routeModule, { method: "GET", sessionCookieOptions });
    expect(sawSession).toBeUndefined(); // no cookie sent -> logged out, but no throw
  });

  it("ctx is the auth-disabled context when sessionCookieOptions is absent (auth: \"none\") — requireAuth throws instead of silently passing", async () => {
    let threw = false;
    const routeModule: RouteModule = {
      loader: async (ctx) => {
        try {
          ctx.requireAuth();
        } catch {
          threw = true;
        }
        return {};
      },
      default: () => createElement("div", null, "ok"),
    };
    const renderRoute = createRenderRoute(deps());
    await renderRoute(routeModule, { method: "GET" }); // no sessionCookieOptions at all
    expect(threw).toBe(true);
  });

  it("a route with no default export throws a clear error rather than crashing inside react-dom", async () => {
    const routeModule = { loader: async () => ({}) } as unknown as RouteModule;
    const renderRoute = createRenderRoute(deps());
    await expect(renderRoute(routeModule, { method: "GET" })).rejects.toThrow(/no default export/);
  });

  it("returns null for a non-ssr route — the caller is responsible for routing to the right render path", async () => {
    const routeModule: RouteModule = { renderMode: "csr", default: () => createElement("div", null, "x") };
    const renderRoute = createRenderRoute(deps());
    expect(await renderRoute(routeModule, { method: "GET" })).toBeNull();
  });
});

describe("resolveRenderMode", () => {
  it("defaults to \"ssr\" when neither the route nor the app declares one", () => {
    expect(resolveRenderMode({} as RouteModule)).toBe("ssr");
  });

  it("the route's own renderMode wins over the app default", () => {
    expect(resolveRenderMode({ renderMode: "ssg" } as RouteModule, "ssr")).toBe("ssg");
  });

  it("falls back to the app default when the route declares none", () => {
    expect(resolveRenderMode({} as RouteModule, "ssg")).toBe("ssg");
  });
});

describe("createRenderStatic (renderMode: \"ssg\"/\"isr\")", () => {
  it("renders real HTML with no request/session machinery at all", async () => {
    const routeModule: RouteModule = {
      loader: async () => ({ value: 42 }),
      default: ({ data }) => createElement("p", null, `value: ${(data as { value: number })?.value}`),
    };
    const renderStatic = createRenderStatic(deps());
    const { html } = await renderStatic(routeModule);
    expect(html).toContain("value: 42");
  });

  it("ctx passed to loader has no session and requireAuth throws — build-time context is never authenticated", async () => {
    let threw = false;
    const routeModule: RouteModule = {
      loader: async (ctx) => {
        try {
          ctx.requireAuth();
        } catch {
          threw = true;
        }
        return {};
      },
      default: () => createElement("div", null, "ok"),
    };
    await createRenderStatic(deps())(routeModule);
    expect(threw).toBe(true);
  });
});

describe("renderCsrShell (renderMode: \"csr\")", () => {
  it("renders a mountable shell with the entry marker when both URLs are known", () => {
    const routeModule: RouteModule = { default: () => createElement("div", null, "x") };
    const html = renderCsrShell(routeModule, "/@fs/routes/widget.tsx", "/csr-client.tsx");
    expect(html).toContain('data-csr-entry="/@fs/routes/widget.tsx"');
    expect(html).toContain("csr-client.tsx");
  });

  it("renders an empty, unmountable body when the entry URL is unknown (dev-mode edge case)", () => {
    const routeModule: RouteModule = { default: () => createElement("div", null, "x") };
    const html = renderCsrShell(routeModule, undefined, undefined);
    expect(html).not.toContain("data-csr-entry");
  });

  it("never calls loader — csr routes are explicitly scoped to never run one on the server", () => {
    let loaderCalled = false;
    const routeModule: RouteModule = {
      loader: async () => {
        loaderCalled = true;
        return {};
      },
      default: () => createElement("div", null, "x"),
    };
    renderCsrShell(routeModule, "/x", "/csr-client.tsx");
    expect(loaderCalled).toBe(false);
  });
});

describe("Island / IslandCollectorContext (partial hydration)", () => {
  it("a page with no islands renders normally through createRenderRoute, no second pass needed", async () => {
    const routeModule: RouteModule = {
      default: () => createElement("h1", null, "no islands here"),
    };
    const result = await createRenderRoute(deps())(routeModule, { method: "GET" });
    expect(result?.html).toContain("no islands here");
    expect(result?.html).not.toContain("data-island");
  });

  it("a route using an island renders the real resolved component after the two-pass render, with a hydration marker", async () => {
    const widget = island<{ label: string }>(async () => ({
      default: (props) => createElement("span", null, `island: ${props.label}`),
    }), "/@fs/widget.tsx");

    const routeModule: RouteModule = {
      default: () =>
        createElement(
          "div",
          null,
          // `as never`: Island's own generic can't be inferred cleanly
          // through createElement's overloads here (a TS inference-order
          // quirk, not a real runtime concern — Props is fully erased at
          // runtime, and `widget`/`{ label: "hi" }` are already the same,
          // correctly-matching, explicitly-pinned type from `island<...>`
          // above).
          createElement(Island, { component: widget, props: { label: "hi" } } as never)
        ),
    };

    const result = await createRenderRoute(deps())(routeModule, {
      method: "GET",
      islandClientUrl: "/island-client.tsx",
    });
    expect(result?.html).toContain("island: hi");
    expect(result?.html).toContain("data-island");
    expect(result?.html).toContain("data-island-url=\"/@fs/widget.tsx\"");
    // A page that used a hydratable island gets the hydration bootstrap script tag.
    expect(result?.html).toContain("island-client.tsx");
  });

  it("an island with no clientUrl renders its real content but is NOT marked hydratable (no script tag)", async () => {
    const widget = island(async () => ({
      default: () => createElement("span", null, "static only"),
    })); // no clientUrl passed

    const routeModule: RouteModule = {
      default: () => createElement(Island, { component: widget, props: {} }),
    };

    const result = await createRenderRoute(deps())(routeModule, {
      method: "GET",
      islandClientUrl: "/island-client.tsx",
    });
    expect(result?.html).toContain("static only");
    expect(result?.html).not.toContain("island-client.tsx");
  });
});
