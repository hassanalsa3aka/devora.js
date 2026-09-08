import { describe, it, expect } from "vitest";
import { defineProject, resolveAuthMode, type ProjectConfig } from "../config.js";

function project(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    apps: [
      { name: "marketing", dir: "apps/marketing", domain: "example.com", auth: "none" },
      { name: "dashboard", dir: "apps/dashboard", domain: "app.example.com" },
      { name: "admin", dir: "apps/admin", domain: "admin.example.com", auth: "isolated" },
    ],
    shared: { core: "packages/core", backend: "packages/backend", auth: "shared" },
    ...overrides,
  };
}

describe("resolveAuthMode", () => {
  it("an app with no explicit auth field inherits the project default", () => {
    expect(resolveAuthMode(project(), "dashboard")).toBe("shared");
  });

  it("an app with an explicit override uses its own value, not the project default", () => {
    expect(resolveAuthMode(project(), "admin")).toBe("isolated");
  });

  it("auth: \"none\" is respected even when the project default is \"shared\" — not conflated with inheriting it", () => {
    expect(resolveAuthMode(project(), "marketing")).toBe("none");
  });

  it("a project-level default of \"none\" can still be overridden up to \"shared\"/\"isolated\" for one app", () => {
    const p = project({ shared: { core: "packages/core", backend: "packages/backend", auth: "none" } });
    expect(resolveAuthMode(p, "dashboard")).toBe("none"); // inherits none
    expect(resolveAuthMode(p, "admin")).toBe("isolated"); // still overridden
  });

  it("throws for an app name not present in the project", () => {
    expect(() => resolveAuthMode(project(), "doesnotexist")).toThrow(/unknown app/);
  });
});

describe("defineProject", () => {
  it("returns the config unchanged when app names are unique", () => {
    const p = project();
    expect(defineProject(p)).toBe(p);
  });

  it("throws on a duplicate app name — a real misconfiguration, not silently allowed", () => {
    const p = project({
      apps: [
        { name: "dup", dir: "apps/a", domain: "a.example.com" },
        { name: "dup", dir: "apps/b", domain: "b.example.com" },
      ],
    });
    expect(() => defineProject(p)).toThrow(/duplicate app name/);
  });
});
