import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script
import { checkPackList, parseNpmJson } from "../checkPackContents.mjs";

const base = { name: "pkg", files: ["dist"], tscBuild: false };

describe("checkPackList", () => {
  it("accepts dist plus the files npm always adds", () => {
    expect(checkPackList({ ...base, packed: ["package.json", "README.md", "LICENSE", "dist/index.js", "dist/index.d.ts"] })).toEqual([]);
  });

  it("flags files outside `files`, secrets, tests, source, configs and leftovers", () => {
    const packed = [
      "package.json",
      "dist/index.js",
      "notes.txt",
      ".env",
      "dist/.env.local",
      "server.pem",
      "dist/__tests__/a.test.js",
      "dist/a.test.js",
      "src/index.ts",
      "tsconfig.json",
      "build.mjs",
      "pnpm-lock.yaml",
      "debug.log",
      "dist/.DS_Store",
      "node_modules/x/index.js",
      "work-notes/FINAL-REPORT.md",
    ];
    const problems: string[] = checkPackList({ ...base, packed });
    for (const needle of ["notes.txt", ".env", "dist/.env.local", "server.pem", "__tests__/a.test.js", "dist/a.test.js", "src/index.ts", "tsconfig.json", "build.mjs", "pnpm-lock.yaml", "debug.log", ".DS_Store", "node_modules/x", "work-notes/FINAL-REPORT.md"]) {
      expect(problems.some((p) => p.includes(needle)), needle).toBe(true);
    }
  });

  it("flags a `files` entry that matched nothing", () => {
    expect(checkPackList({ ...base, files: ["dist", "templates"], packed: ["package.json", "dist/index.js"] })).toEqual([
      'pkg: "files" entry "templates" matched nothing in the tarball',
    ]);
  });

  it("scaffold templates may ship their tsconfig", () => {
    expect(checkPackList({ ...base, files: ["dist", "templates"], packed: ["package.json", "dist/index.js", "templates/tsconfig.base.json"] })).toEqual([]);
    expect(checkPackList({ ...base, files: ["dist", "templates"], packed: ["package.json", "dist/index.js", "templates/.env"] })).toHaveLength(1);
  });

  it("tsc packages: a dist module with no source, and a source module with no dist, are both flagged", () => {
    const problems: string[] = checkPackList({
      ...base,
      tscBuild: true,
      packed: ["package.json", "dist/a.js", "dist/old.js"],
      srcFiles: ["a.ts", "b.ts", "__tests__/a.test.ts", "types.d.ts"],
      distFiles: ["a.js", "a.d.ts", "old.js"],
    });
    expect(problems).toEqual(["pkg: dist/old.js has no source file (left over from a deleted module?)", "pkg: src/b has no dist/b.js (stale or missing build)"]);
  });
});

describe("parseNpmJson", () => {
  const json = JSON.stringify([{ files: [{ path: "dist/index.js" }] }], null, 2);
  it("parses plain output", () => {
    expect(parseNpmJson(json)[0].files[0].path).toBe("dist/index.js");
  });
  it("skips lifecycle-script output printed before the JSON (npm 10 runs prepare)", () => {
    const raw = `[build] note: react was bundled into dist/index.js (expected)\n[build] more [brackets] here\n${json}\n`;
    expect(parseNpmJson(raw)[0].files[0].path).toBe("dist/index.js");
  });
  it("says what it got when there is no JSON", () => {
    expect(() => parseNpmJson("npm ERR! nope")).toThrow(/printed no JSON array/);
  });
});
