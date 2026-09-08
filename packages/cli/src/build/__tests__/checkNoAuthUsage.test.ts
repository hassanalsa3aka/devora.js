import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkNoAuthUsage, assertNoAuthUsage } from "../checkNoAuthUsage.js";

/**
 * Real files on disk, not in-memory strings handed straight to the regex —
 * this is the actual build-time gate for `auth: "none"` apps (see
 * ROADMAP.md's auth-opt-in item), and it's specifically a filesystem scan
 * (`fs.readFileSync`), so a test that skipped the filesystem would miss
 * exactly the part worth verifying.
 */
describe("checkNoAuthUsage", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "devora-noauth-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("finds nothing in a route file that never touches ctx's session methods", async () => {
    const file = path.join(dir, "index.tsx");
    await writeFile(file, `export default function Index() { return null; }\n`);
    expect(checkNoAuthUsage([file])).toEqual([]);
  });

  it("flags a real ctx.setSession() call, naming the exact file and method", async () => {
    const file = path.join(dir, "login.tsx");
    await writeFile(
      file,
      `export async function action(formData, ctx) {\n  ctx.setSession({ ok: true });\n}\n`
    );
    const violations = checkNoAuthUsage([file]);
    expect(violations).toEqual([{ file, method: "setSession" }]);
  });

  it("flags each of requireAuth/setSession/clearSession/verifyCsrf independently", async () => {
    const file = path.join(dir, "kitchen-sink.tsx");
    await writeFile(
      file,
      [
        "export async function loader(ctx) {",
        "  ctx.requireAuth();",
        "  ctx.setSession({});",
        "  ctx.clearSession();",
        "  ctx.verifyCsrf(null);",
        "}",
      ].join("\n")
    );
    const methods = checkNoAuthUsage([file]).map((v) => v.method).sort();
    expect(methods).toEqual(["clearSession", "requireAuth", "setSession", "verifyCsrf"]);
  });

  it("scans multiple files and reports violations from all of them", async () => {
    const clean = path.join(dir, "clean.tsx");
    const dirty = path.join(dir, "dirty.tsx");
    await writeFile(clean, `export default function C() { return null; }\n`);
    await writeFile(dirty, `export async function action(fd, ctx) { ctx.setSession({}); }\n`);
    const violations = checkNoAuthUsage([clean, dirty]);
    expect(violations).toEqual([{ file: dirty, method: "setSession" }]);
  });
});

describe("assertNoAuthUsage", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "devora-noauth-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("does not throw when nothing is found", async () => {
    const file = path.join(dir, "index.tsx");
    await writeFile(file, `export default function Index() { return null; }\n`);
    expect(() => assertNoAuthUsage("marketing", [file])).not.toThrow();
  });

  it("throws a single error naming the app, the file, and the method — this is the actual build-time gate", async () => {
    const file = path.join(dir, "login.tsx");
    await writeFile(file, `export async function action(fd, ctx) { ctx.setSession({}); }\n`);
    expect(() => assertNoAuthUsage("marketing", [file])).toThrow(/marketing/);
    try {
      assertNoAuthUsage("marketing", [file]);
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toContain(file);
      expect(String(err)).toContain("setSession");
      expect(String(err)).toContain('auth: "none"');
    }
  });
});
