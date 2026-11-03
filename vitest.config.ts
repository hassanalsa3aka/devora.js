import { defineConfig } from "vitest/config";

/**
 * One root-level runner for the whole monorepo (ROADMAP.md's real-test-
 * suite item) — these replace the "verify by hand via curl, then throw the
 * script away" pattern used throughout this project's development so far
 * (see CLAUDE.md's history: every feature was verified end-to-end against
 * a running dev/prod server, but nothing from those sessions persisted as
 * regression protection). `environment: "node"` throughout — every test
 * here exercises server-side rendering (`react-dom/server`'s
 * `renderToString`, real HTML strings), never a browser DOM.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Integration tests boot a real Vite dev server or write large files. On a busy or slow machine (a CI runner running
    // 60 test files in parallel) 5 s, the default, was not enough: a dev-server test timed out in the full run and passed
    // alone in 0.3 s. A test that really hangs still fails, after 30 s.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "adapters/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
