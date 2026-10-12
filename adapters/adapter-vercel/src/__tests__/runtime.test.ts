import { describe, expect, it } from "vitest";
import { parseRange, rangeAllowsMajor, resolveVercelRuntime } from "../runtime.js";

describe("resolveVercelRuntime — never the discontinued nodejs20.x by default", () => {
  it("no engines.node: the running Node major when Vercel supports it", () => {
    expect(resolveVercelRuntime({ runningNodeVersion: "22.11.0" }).runtime).toBe("nodejs22.x");
    expect(resolveVercelRuntime({ runningNodeVersion: "24.1.0" }).runtime).toBe("nodejs24.x");
  });

  it("no engines.node and an unsupported running Node (20, 25, 26): Vercel's default, 24", () => {
    for (const v of ["20.18.0", "25.0.0", "26.2.0"]) {
      expect(resolveVercelRuntime({ runningNodeVersion: v }).runtime, v).toBe("nodejs24.x");
    }
  });

  it("engines.node >=20 (this repo's own, and the old scaffold's): never picks 20", () => {
    expect(resolveVercelRuntime({ enginesNode: ">=20", runningNodeVersion: "20.18.0" }).runtime).toBe("nodejs24.x");
    expect(resolveVercelRuntime({ enginesNode: ">=20", runningNodeVersion: "22.3.0" }).runtime).toBe("nodejs22.x");
  });

  it("engines.node pins a major: that major, regardless of the running Node", () => {
    expect(resolveVercelRuntime({ enginesNode: "22.x", runningNodeVersion: "24.1.0" }).runtime).toBe("nodejs22.x");
    expect(resolveVercelRuntime({ enginesNode: "^22.11.0", runningNodeVersion: "25.0.0" }).runtime).toBe("nodejs22.x");
    expect(resolveVercelRuntime({ enginesNode: ">=20 <23", runningNodeVersion: "24.0.0" }).runtime).toBe("nodejs22.x");
  });

  it("engines.node that only allows Node 20: a clear error, not a doomed deploy", () => {
    const r = resolveVercelRuntime({ enginesNode: "20.x", runningNodeVersion: "20.18.0" });
    expect(r.error).toMatch(/allows no Node version Vercel supports/);
    expect(r.error).toMatch(/nodejs24\.x, nodejs22\.x/);
  });

  it("explicit override wins, and an unknown-but-well-formed one only warns", () => {
    const pinned = resolveVercelRuntime({ override: "nodejs22.x", enginesNode: "24.x", runningNodeVersion: "24.0.0" });
    expect(pinned).toMatchObject({ runtime: "nodejs22.x", warnings: [] });
    expect(resolveVercelRuntime({ override: 24, runningNodeVersion: "22.0.0" }).runtime).toBe("nodejs24.x");
    const future = resolveVercelRuntime({ override: "nodejs26.x", runningNodeVersion: "26.0.0" });
    expect(future.runtime).toBe("nodejs26.x");
    expect(future.error).toBeUndefined();
    expect(future.warnings[0]).toMatch(/isn't one this adapter knows/);
    expect(resolveVercelRuntime({ override: "node22", runningNodeVersion: "22.0.0" }).error).toMatch(/not a Vercel Node runtime/);
  });

  it("unparseable engines.node: ignored with a warning, not guessed at", () => {
    const r = resolveVercelRuntime({ enginesNode: "lts/iron", runningNodeVersion: "22.0.0" });
    expect(r.runtime).toBe("nodejs22.x");
    expect(r.warnings[0]).toMatch(/couldn't parse engines.node/);
  });
});

describe("semver range reader (major-level only)", () => {
  const allows = (range: string, major: number) => rangeAllowsMajor(parseRange(range)!, major);

  it.each([
    [">=22", 22, true],
    [">=22", 24, true],
    [">=22", 20, false],
    [">22", 22, false],
    [">22.1", 22, true],
    ["<22", 22, false],
    ["<=22", 22, true],
    ["^22.11.0", 22, true],
    ["^22.11.0", 24, false],
    ["~22.1", 22, true],
    ["22.x", 24, false],
    ["22", 22, true],
    ["*", 24, true],
    ["20 - 22", 22, true],
    ["20 - 22", 24, false],
    ["^20 || ^24", 24, true],
    ["^20 || ^24", 22, false],
    [">= 22 < 24", 24, false],
    ["v22.1.0", 22, true],
  ])("%s admits Node %i: %s", (range, major, expected) => {
    expect(allows(range, major)).toBe(expected);
  });

  it("rejects garbage", () => {
    expect(parseRange("lts/iron")).toBeUndefined();
    expect(parseRange("")).toBeUndefined();
  });
});
