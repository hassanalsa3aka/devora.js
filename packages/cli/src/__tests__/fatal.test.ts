import { afterEach, describe, expect, it, vi } from "vitest";
import { DevoraConfigError } from "@devorajs/core";
import { reportFatal } from "../fatal.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("reportFatal", () => {
  it("prints a configuration error as one line, exits 1, and handles it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handled = reportFatal(new DevoraConfigError("[devora] no session store configured: add sessions: { store: \"memory\" } ..."));
    expect(handled).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    const printed = String(spy.mock.calls[0]![0]);
    expect(printed).toMatch(/^\[devora\] no session store configured/);
    expect(printed).not.toMatch(/\n/);
    expect(printed).not.toMatch(/\bat \S+ \(/); // no stack frames
    expect(process.exitCode).toBe(1);
  });

  it("leaves any other error to the caller (keeps its stack)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(reportFatal(new Error("something else"))).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });
});
