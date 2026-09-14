import { describe, it, expect } from "vitest";
import { resolveSplitTarget, nameForSplitTarget } from "../resolveSplitTarget.js";
import type { ProjectConfig } from "@devorajs/core";

const project: ProjectConfig = {
  apps: [
    { name: "admin", dir: "apps/admin", domain: "admin.example.com" },
    { name: "widget", dir: "apps/widget-app", domain: "widget.example.com" }, // name !== dir basename, deliberately
  ],
  shared: { core: "packages/core", backend: "packages/backend", auth: "shared" },
};

describe("resolveSplitTarget", () => {
  it("resolves the literal 'backend' to packages/backend", () => {
    expect(resolveSplitTarget("/root", project, "backend")).toBe("/root/packages/backend");
  });

  it("resolves a real app name to its configured dir", () => {
    expect(resolveSplitTarget("/root", project, "admin")).toBe("/root/apps/admin");
  });

  it("resolves an app whose name differs from its directory's basename", () => {
    expect(resolveSplitTarget("/root", project, "widget")).toBe("/root/apps/widget-app");
  });

  it("throws for an unknown name", () => {
    expect(() => resolveSplitTarget("/root", project, "nope")).toThrow(/no app named "nope"/);
  });
});

describe("nameForSplitTarget — the inverse, and the real bug it fixes", () => {
  it("maps packages/backend back to the literal 'backend'", () => {
    expect(nameForSplitTarget("/root", project, "packages/backend")).toBe("backend");
  });

  it("maps a real app's dir back to its name", () => {
    expect(nameForSplitTarget("/root", project, "apps/admin")).toBe("admin");
  });

  it("real bug: maps a dir back to the app's NAME even when it differs from the directory's own basename", () => {
    // Before this fix, status.ts printed the raw .gitmodules path
    // ("apps/widget-app") as the suggested `devora sync <name>` argument —
    // sync.ts resolves by app *name* ("widget"), not directory, so that
    // suggested command would have failed with "no app named
    // \"apps/widget-app\"" even though the submodule genuinely exists.
    expect(nameForSplitTarget("/root", project, "apps/widget-app")).toBe("widget");
  });

  it("falls back to the raw path if nothing in the config matches (rather than throwing)", () => {
    expect(nameForSplitTarget("/root", project, "some/untracked/dir")).toBe("some/untracked/dir");
  });
});
