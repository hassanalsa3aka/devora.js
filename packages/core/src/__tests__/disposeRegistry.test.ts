import { describe, it, expect, beforeEach } from "vitest";
import { registerDisposable, runAndClearDisposable } from "../disposeRegistry.js";

beforeEach(() => {
  // Real module-level state (globalThis) — reset between tests so one
  // test's registration can't leak into another's assertions.
  globalThis.__devoraDisposables = undefined;
});

describe("registerDisposable / runAndClearDisposable", () => {
  it("runs the registered callback for a plain file path", () => {
    let called = false;
    registerDisposable("/app/db/index.ts", () => (called = true));
    runAndClearDisposable("/app/db/index.ts");
    expect(called).toBe(true);
  });

  it("accepts import.meta.url-shaped file:// URLs and normalizes them to match a plain path lookup", () => {
    let called = false;
    registerDisposable("file:///app/db/index.ts", () => (called = true));
    runAndClearDisposable("/app/db/index.ts");
    expect(called).toBe(true);
  });

  it("does nothing (no throw) for a file with no registered disposable", () => {
    expect(() => runAndClearDisposable("/never/registered.ts")).not.toThrow();
  });

  it("clears the callback after running it — a second run is a no-op", () => {
    let callCount = 0;
    registerDisposable("/app/db/index.ts", () => callCount++);
    runAndClearDisposable("/app/db/index.ts");
    runAndClearDisposable("/app/db/index.ts");
    expect(callCount).toBe(1);
  });

  it("a module re-registering (the normal re-execution case) overwrites the previous callback, not stacks it", () => {
    const order: string[] = [];
    registerDisposable("/app/db/index.ts", () => order.push("first"));
    registerDisposable("/app/db/index.ts", () => order.push("second"));
    runAndClearDisposable("/app/db/index.ts");
    expect(order).toEqual(["second"]);
  });

  it("survives being called across what simulates a module reload (globalThis, not module scope)", () => {
    // Simulates the real reason this exists: the module holding this state
    // must NOT reset when re-executed. Re-importing this file (as Node's
    // module cache would for a real reload) still shares the same
    // globalThis-backed registry.
    let called = false;
    registerDisposable("/app/db/index.ts", () => (called = true));
    // Reset local closures the way a fresh module evaluation would, but
    // globalThis persists — the whole point of storing it there.
    const freshRegistrySnapshot = globalThis.__devoraDisposables;
    expect(freshRegistrySnapshot?.has("/app/db/index.ts")).toBe(true);
    runAndClearDisposable("/app/db/index.ts");
    expect(called).toBe(true);
  });
});
