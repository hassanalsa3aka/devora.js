import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { matchRoute, listRoutePaths, isDynamicRouteFile } from "../router.js";
import { generateSitemapXml } from "../sitemap.js";

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
