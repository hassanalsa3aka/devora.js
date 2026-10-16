import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { matchRoute, listRoutePaths, isDynamicRouteFile, resolveStaticRoutePath } from "../router.js";
import { generateSitemapXml, collectSitemapPaths } from "../sitemap.js";

let routesDir: string;

function touch(relPath: string) {
  const full = path.join(routesDir, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, "export default function () { return null; }\n");
}

beforeEach(() => {
  routesDir = mkdtempSync(path.join(tmpdir(), "devora-router-test-"));
});

afterEach(() => {
  rmSync(routesDir, { recursive: true, force: true });
});

describe("matchRoute — static segments (existing behavior, unchanged)", () => {
  it("matches index.tsx to /", () => {
    touch("index.tsx");
    const match = matchRoute(routesDir, "/");
    expect(match?.filePath).toBe(path.join(routesDir, "index.tsx"));
    expect(match?.params).toEqual({});
  });

  it("matches a nested static file", () => {
    touch("settings.tsx");
    const match = matchRoute(routesDir, "/settings");
    expect(match?.filePath).toBe(path.join(routesDir, "settings.tsx"));
  });

  it("strips a trailing slash before matching", () => {
    touch("settings.tsx");
    expect(matchRoute(routesDir, "/settings/")?.filePath).toBe(path.join(routesDir, "settings.tsx"));
  });

  it("returns null for no match", () => {
    touch("settings.tsx");
    expect(matchRoute(routesDir, "/nope")).toBeNull();
  });
});

describe("matchRoute — dynamic segments", () => {
  it("matches [id].tsx and captures the param", () => {
    touch("users/[id].tsx");
    const match = matchRoute(routesDir, "/users/42");
    expect(match?.filePath).toBe(path.join(routesDir, "users/[id].tsx"));
    expect(match?.params).toEqual({ id: "42" });
    // routePath is the concrete requested path, not the file's pattern —
    // what isr caching and logs should key on.
    expect(match?.routePath).toBe("/users/42");
  });

  it("decodes a URL-encoded param value", () => {
    touch("users/[id].tsx");
    const match = matchRoute(routesDir, "/users/a%20b");
    expect(match?.params).toEqual({ id: "a b" });
  });

  it("captures multiple dynamic segments", () => {
    touch("teams/[teamId]/members/[memberId].tsx");
    const match = matchRoute(routesDir, "/teams/1/members/2");
    expect(match?.params).toEqual({ teamId: "1", memberId: "2" });
  });

  it("a static route at the same depth wins over a dynamic one", () => {
    touch("users/new.tsx");
    touch("users/[id].tsx");
    const match = matchRoute(routesDir, "/users/new");
    expect(match?.filePath).toBe(path.join(routesDir, "users/new.tsx"));
    expect(match?.params).toEqual({});
  });

  it("doesn't match a dynamic route against a different segment count", () => {
    touch("users/[id].tsx");
    expect(matchRoute(routesDir, "/users/42/extra")).toBeNull();
    expect(matchRoute(routesDir, "/users")).toBeNull();
  });

  it("isDynamicRouteFile is true only for a route with a [param] segment", () => {
    touch("users/[id].tsx");
    touch("settings.tsx");
    expect(isDynamicRouteFile(routesDir, path.join(routesDir, "users/[id].tsx"))).toBe(true);
    expect(isDynamicRouteFile(routesDir, path.join(routesDir, "settings.tsx"))).toBe(false);
  });
});

describe("listRoutePaths + sitemap — dynamic routes are excluded, not listed literally", () => {
  it("listRoutePaths includes the dynamic route's literal pattern", () => {
    touch("users/[id].tsx");
    touch("settings.tsx");
    expect(listRoutePaths(routesDir).sort()).toEqual(["/settings", "/users/[id]"]);
  });

  it("generateSitemapXml filters out any path containing a [ segment", () => {
    const xml = generateSitemapXml(["/", "/settings", "/users/[id]"], "example.com");
    expect(xml).toContain("https://example.com/settings");
    expect(xml).not.toContain("[id]");
  });
});

describe("resolveStaticRoutePath — docs/design/architecture-v2.md §3.6 static-params API", () => {
  it("substitutes a single dynamic segment", () => {
    touch("posts/[slug].tsx");
    const resolved = resolveStaticRoutePath(routesDir, path.join(routesDir, "posts/[slug].tsx"), {
      slug: "hello-world",
    });
    expect(resolved).toBe("/posts/hello-world");
  });

  it("substitutes multiple dynamic segments, in position", () => {
    touch("orgs/[org]/users/[id].tsx");
    const resolved = resolveStaticRoutePath(
      routesDir,
      path.join(routesDir, "orgs/[org]/users/[id].tsx"),
      { org: "acme", id: "42" }
    );
    expect(resolved).toBe("/orgs/acme/users/42");
  });

  it("leaves static segments untouched", () => {
    touch("blog/posts/[slug].tsx");
    const resolved = resolveStaticRoutePath(routesDir, path.join(routesDir, "blog/posts/[slug].tsx"), {
      slug: "x",
    });
    expect(resolved).toBe("/blog/posts/x");
  });

  it("throws if params is missing a value for one of the route's own dynamic segments", () => {
    touch("posts/[slug].tsx");
    expect(() =>
      resolveStaticRoutePath(routesDir, path.join(routesDir, "posts/[slug].tsx"), {})
    ).toThrow(/missing "slug"/);
  });
});

describe("matchRoute — catch-all segments", () => {
  it("[...slug] matches one or more segments as a string[]", () => {
    touch("docs/[...slug].tsx");
    expect(matchRoute(routesDir, "/docs/a")?.params).toEqual({ slug: ["a"] });
    expect(matchRoute(routesDir, "/docs/a/b/c")?.params).toEqual({ slug: ["a", "b", "c"] });
  });

  it("[...slug] does not match zero segments", () => {
    touch("docs/[...slug].tsx");
    expect(matchRoute(routesDir, "/docs")).toBeNull();
  });

  it("[[...slug]] also matches zero segments", () => {
    touch("docs/[[...slug]].tsx");
    expect(matchRoute(routesDir, "/docs")?.params).toEqual({ slug: [] });
    expect(matchRoute(routesDir, "/docs/x/y")?.params).toEqual({ slug: ["x", "y"] });
  });

  it("precedence: static, then [param], then [...slug]", () => {
    touch("docs/intro.tsx");
    touch("docs/[page].tsx");
    touch("docs/[...rest].tsx");
    expect(matchRoute(routesDir, "/docs/intro")?.filePath).toBe(path.join(routesDir, "docs/intro.tsx"));
    expect(matchRoute(routesDir, "/docs/other")?.filePath).toBe(path.join(routesDir, "docs/[page].tsx"));
    expect(matchRoute(routesDir, "/docs/a/b")?.filePath).toBe(path.join(routesDir, "docs/[...rest].tsx"));
  });

  it("a dotted segment is part of the match, not a file", () => {
    touch("docs/[...slug].tsx");
    expect(matchRoute(routesDir, "/docs/v1.2/intro")?.params).toEqual({ slug: ["v1.2", "intro"] });
  });

  it("decodes each segment once", () => {
    touch("docs/[...slug].tsx");
    expect(matchRoute(routesDir, "/docs/a%20b/c")?.params).toEqual({ slug: ["a b", "c"] });
    // %252F decodes once, to the literal text "%2F" — never to a slash.
    expect(matchRoute(routesDir, "/docs/a%252Fb")?.params).toEqual({ slug: ["a%2Fb"] });
  });

  it("rejects traversal, encoded slashes and empty segments", () => {
    touch("docs/[...slug].tsx");
    expect(matchRoute(routesDir, "/docs/../etc/passwd")).toBeNull();
    expect(matchRoute(routesDir, "/docs/%2e%2e/x")).toBeNull();
    expect(matchRoute(routesDir, "/docs/a%2Fb")).toBeNull();
    expect(matchRoute(routesDir, "/docs/a%5Cb")).toBeNull();
    expect(matchRoute(routesDir, "/docs/a%00b")).toBeNull();
    expect(matchRoute(routesDir, "/docs/a//b")).toBeNull();
    expect(matchRoute(routesDir, "/docs/%E0%A4%A")).toBeNull();
  });

  it("a catch-all that is not the last segment is a build error", () => {
    touch("docs/[...slug]/edit.tsx");
    expect(() => matchRoute(routesDir, "/docs/a/edit")).toThrow(/last/i);
  });

  it("two routes with the same shape are an error naming both files", () => {
    touch("docs/[a].tsx");
    touch("docs/[b].tsx");
    expect(() => matchRoute(routesDir, "/docs/x")).toThrow(/\[a\]\.tsx.*\[b\]\.tsx|\[b\]\.tsx.*\[a\]\.tsx/s);
  });
});

describe("resolveStaticRoutePath — catch-all", () => {
  it("joins a string[] and encodes each part", () => {
    touch("docs/[...slug].tsx");
    const file = path.join(routesDir, "docs/[...slug].tsx");
    expect(resolveStaticRoutePath(routesDir, file, { slug: ["guide", "a b"] })).toBe("/docs/guide/a%20b");
  });

  it("rejects a string for a catch-all, an empty array, and unsafe parts", () => {
    touch("docs/[...slug].tsx");
    const file = path.join(routesDir, "docs/[...slug].tsx");
    expect(() => resolveStaticRoutePath(routesDir, file, { slug: "a" })).toThrow();
    expect(() => resolveStaticRoutePath(routesDir, file, { slug: [] })).toThrow();
    expect(() => resolveStaticRoutePath(routesDir, file, { slug: [".."] })).toThrow();
    expect(() => resolveStaticRoutePath(routesDir, file, { slug: ["a/b"] })).toThrow();
  });

  it("allows an empty array for [[...slug]]", () => {
    touch("docs/[[...slug]].tsx");
    const file = path.join(routesDir, "docs/[[...slug]].tsx");
    expect(resolveStaticRoutePath(routesDir, file, { slug: [] })).toBe("/docs");
  });
});

describe("collectSitemapPaths — dynamic routes listed by getStaticParams", () => {
  it("lists concrete URLs, skips a dynamic route without getStaticParams", async () => {
    touch("index.tsx");
    touch("posts/[slug].tsx");
    touch("docs/[...path].tsx");
    touch("users/[id].tsx");
    const modules: Record<string, { getStaticParams?: () => unknown }> = {
      [path.join(routesDir, "posts/[slug].tsx")]: { getStaticParams: () => [{ slug: "a" }, { slug: "b" }] },
      [path.join(routesDir, "docs/[...path].tsx")]: { getStaticParams: async () => [{ path: ["x", "y"] }] },
      [path.join(routesDir, "users/[id].tsx")]: {},
    };
    const paths = await collectSitemapPaths(routesDir, async (f) => modules[f] as never);
    expect(paths).toEqual(["/", "/docs/x/y", "/posts/a", "/posts/b"]);
    expect(generateSitemapXml(paths, "example.com")).toContain("https://example.com/docs/x/y");
  });
});
