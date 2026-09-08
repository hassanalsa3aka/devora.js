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
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
