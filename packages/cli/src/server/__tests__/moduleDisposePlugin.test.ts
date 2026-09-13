import { describe, it, expect, beforeEach } from "vitest";
import { registerDisposable } from "@devorajs/core";
import { moduleDisposePlugin } from "../moduleDisposePlugin.js";

beforeEach(() => {
  globalThis.__devoraDisposables = undefined;
});

describe("moduleDisposePlugin", () => {
  it("calls the registered disposable for the file Vite is about to invalidate", () => {
    let called = false;
    registerDisposable("/app/db/index.ts", () => (called = true));

    const plugin = moduleDisposePlugin();
    // @ts-expect-error handleHotUpdate is real on this plugin object; a
    // minimal fake HmrContext is enough since the hook only reads ctx.file.
    plugin.handleHotUpdate({ file: "/app/db/index.ts" });

    expect(called).toBe(true);
  });

  it("does nothing for a file with no registered disposable (the common case — most files aren't a DB connection)", () => {
    const plugin = moduleDisposePlugin();
    expect(() => {
      // @ts-expect-error see above
      plugin.handleHotUpdate({ file: "/app/routes/index.tsx" });
    }).not.toThrow();
  });
});
