import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// @ts-expect-error plain .mjs script, no types
import { checkPublishable, entryTargets } from "../checkPublishable.mjs";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "devora-publish-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const manifest = {
  name: "@devorajs/example",
  files: ["dist"],
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
};

function build() {
  mkdirSync(path.join(dir, "dist"), { recursive: true });
  writeFileSync(path.join(dir, "dist", "index.js"), "export {};\n");
  writeFileSync(path.join(dir, "dist", "index.d.ts"), "export {};\n");
}

describe("checkPublishable", () => {
  it("collects every target in exports, main and types", () => {
    expect(entryTargets(manifest).sort()).toEqual(["./dist/index.d.ts", "./dist/index.js"]);
  });

  it("passes for a built package whose pack list has the entries", () => {
    build();
    expect(checkPublishable(manifest, dir, ["dist/index.js", "dist/index.d.ts", "package.json"])).toEqual([]);
  });

  it("stops when dist/ is missing", () => {
    const problems = checkPublishable(manifest, dir);
    expect(problems.join("\n")).toMatch(/dist\/ is missing or empty/);
  });

  it("stops when dist/ exists but is empty", () => {
    mkdirSync(path.join(dir, "dist"));
    expect(checkPublishable(manifest, dir).join("\n")).toMatch(/dist\/ is missing or empty/);
  });

  it("stops when an exports target does not exist", () => {
    build();
    const broken = { ...manifest, exports: { ".": "./dist/missing.js" } };
    expect(checkPublishable(broken, dir).join("\n")).toMatch(/"\.\/dist\/missing\.js".*does not exist/);
  });

  it("stops when the pack list lacks the built entry", () => {
    build();
    const problems = checkPublishable(manifest, dir, ["package.json", "README.md"]);
    expect(problems.join("\n")).toMatch(/pack list does not include "\.\/dist\/index\.js"/);
  });
});
