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
// Sekhem (the own engine) needs Node 22.15 or later (module.registerHooks): on older Node its module-loader tests are not run,
// and the CLI refuses the engine with a message (tested in engineNode.test.ts). Every other test runs on every Node line.
const [nodeMajor = 0, nodeMinor = 0] = process.versions.node.split(".").map(Number);
const ownEngineNodeOk = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 15);
const needsOwnEngineNode = ["**/dev-server/src/__tests__/graph.test.ts", "**/server/__tests__/devServerExperimental.integration.test.ts", "**/dev-server/src/__tests__/devServerApp.test.ts"];

export default defineConfig({
  test: {
    environment: "node",
    // Integration tests boot a real Vite dev server or write large files. On a busy or slow machine (a CI runner running
    // 60 test files in parallel) 5 s, the default, was not enough: a dev-server test timed out in the full run and passed
    // alone in 0.3 s. A test that really hangs still fails, after 30 s.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "adapters/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ...(ownEngineNodeOk ? [] : needsOwnEngineNode)],
  },
});
