import { describe, expect, it } from "vitest";
import { ownEngineNodeProblem } from "../engineNode.js";

describe("Node version for the own engine", () => {
  it("refuses below 22.15 with a clear message and accepts 22.15 and later", () => {
    for (const v of ["20.20.2", "22.14.0", "18.0.0", "22.0.1"]) expect(ownEngineNodeProblem(v)).toMatch(/needs Node 22\.15 or later \(this is Node /);
    for (const v of ["22.15.0", "22.23.4", "24.22.2", "26.13.0"]) expect(ownEngineNodeProblem(v)).toBeUndefined();
  });
});
