import { describe, expect, it } from "vitest";
import { resolveEngine, defineProject } from "../config.js";

describe("engine setting", () => {
  it("config: flag beats file beats default; unknown values throw", () => {
    expect(resolveEngine(undefined, {})).toBe("vite");
    expect(resolveEngine(undefined, { engine: "own" })).toBe("own");
    expect(resolveEngine("vite", { engine: "own" })).toBe("vite");
    expect(() => resolveEngine("webpack")).toThrow(/unknown engine/);
    expect(() => defineProject({ apps: [], shared: { core: "c", auth: "none" }, engine: "x" as never })).toThrow(/engine must be/);
  });
});
