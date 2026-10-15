import { describe, expect, expectTypeOf, it } from "vitest";
import { splitRouteParams, type CatchAllParams, type RouteParams } from "../router.js";
import type { RequestContext } from "../serverFn.js";
import type { ApiRequest } from "../apiRoute.js";
import { createBuildTimeContext } from "../buildTimeContext.js";

describe("ctx.params stays string-valued (existing apps compile unchanged)", () => {
  it("is typed Record<string, string> for pages and API routes; catch-all arrays live in catchAll", () => {
    expectTypeOf<RequestContext["params"]>().toEqualTypeOf<RouteParams>();
    expectTypeOf<RouteParams>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<RequestContext["catchAll"]>().toEqualTypeOf<CatchAllParams>();
    expectTypeOf<ApiRequest["params"]>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<ApiRequest["catchAll"]>().toEqualTypeOf<Record<string, string[]>>();
  });

  it("splitRouteParams joins a catch-all with / and keeps the array", () => {
    expect(splitRouteParams({ id: "7", slug: ["a", "b"], rest: [] })).toEqual({
      params: { id: "7", slug: "a/b", rest: "" },
      catchAll: { slug: ["a", "b"], rest: [] },
    });
    expect(splitRouteParams()).toEqual({ params: {}, catchAll: {} });
  });

  it("the build-time context (ssg/isr) gets the same split", () => {
    const ctx = createBuildTimeContext({ slug: ["guide", "setup"] });
    expect(ctx.params.slug).toBe("guide/setup");
    expect(ctx.catchAll.slug).toEqual(["guide", "setup"]);
  });
});
