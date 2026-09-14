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
    // minimal fake HmrContext is enough for what the hook actually reads.
    plugin.handleHotUpdate({ file: "/app/db/index.ts", modules: [] });

    expect(called).toBe(true);
  });

  it("does nothing for a file with no registered disposable (the common case — most files aren't a DB connection)", () => {
    const plugin = moduleDisposePlugin();
    expect(() => {
      // @ts-expect-error see above
      plugin.handleHotUpdate({ file: "/app/routes/index.tsx", modules: [] });
    }).not.toThrow();
  });

  it("real bug fixed: also disposes an importer's module, not just the exact file that was saved", () => {
    // The crash this whole feature exists to prevent happens whenever the
    // module *holding the connection* re-executes — which Vite triggers not
    // only when that exact file changes, but whenever anything it imports
    // does too (ctx.modules carries the whole invalidated chain; ctx.file
    // is only the literal file that was saved). Editing a shared env.ts
    // that db/index.ts imports must still dispose db/index.ts's connection.
    let dbDisposed = false;
    registerDisposable("/app/db/index.ts", () => (dbDisposed = true));

    const plugin = moduleDisposePlugin();
    // @ts-expect-error minimal fake HmrContext — only .file/.modules are read
    plugin.handleHotUpdate({
      file: "/app/env.ts", // the file actually saved
      modules: [{ file: "/app/env.ts" }, { file: "/app/db/index.ts" }], // Vite's real invalidated chain
    });

    expect(dbDisposed).toBe(true);
  });

  it("tolerates a module with a null file (a virtual module in the chain, not a real fs path)", () => {
    const plugin = moduleDisposePlugin();
    expect(() => {
      // @ts-expect-error see above
      plugin.handleHotUpdate({
        file: "/app/env.ts",
        modules: [{ file: null }, { file: "/app/env.ts" }],
      });
    }).not.toThrow();
  });
});
