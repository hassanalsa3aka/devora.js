# Where Vite causes problems for islands in `devora dev`

Concrete problems, each with where the evidence is. "No evidence" is said where there is none. Collected
2026-11-05 from the code, tests, ROADMAP findings and docs/history/BUILD-LOG.md; GitHub issues were not searched
beyond what the repository records (none of the tracked findings links an external issue about islands).

| # | Problem | Evidence | Cost today |
|---|---|---|---|
| 1 | Islands are loaded in the browser from `/@fs/<absolute path>` URLs. `/@fs/` is Vite's raw file-serving route: any file under `server.fs.allow` (the workspace root) is readable by URL in dev, and absolute paths of the developer's machine appear in the page | packages/cli/src/islandsPlugin.ts (doc comment: "Vite serves any file under /@fs/<absolute path>"); attack-dev.mjs: `/@fs/<repo>/package.json` → 200 | A design the framework cannot narrow: the island loader depends on the broadest route Vite has |
| 2 | Fast Refresh's preamble must be injected inline, which the framework's own CSP blocks | packages/cli/src/server/reactRefreshPreamblePlugin.ts (both failures confirmed in a browser: "can't detect preamble", then a CSP violation) | A virtual-module workaround the framework must keep in step with `@vitejs/plugin-react` |
| 3 | Dependency re-optimization in the middle of a session reloads the page; the first load could show "invalid hook call" | packages/cli/src/commands/dev.ts (`optimizeDeps.include` comment); ROADMAP Y6 (Unconfirmed: not reproduced since the pre-bundling change) | Every framework client dependency is pre-bundled up front; a transient error is still recorded as unconfirmed |
| 4 | A pre-bundling target conflict: esbuild 0.28 refuses destructuring for Vite 5's target list | dev.ts (`esbuildOptions: { supported: { destructuring: true } }` comment) | A version-coupled workaround |
| 5 | The streaming island cache is keyed by the descriptor object, which survives HMR when only the island file changes; the fix clears every cached island on any edit | packages/core/src/islandComponent.tsx (`clearStreamingModuleCache`), packages/cli/src/server/moduleDisposePlugin.ts | Correct but blunt: every edit re-imports every island in streaming pages |
| 6 | SSR modules are re-executed through `ssrLoadModule`; `import.meta.hot` is undefined there, so module-scope resources (a DB handle) leak or crash on reload | BUILD-LOG.md (better-sqlite3 native assertion after a reload; fix: globalThis cache); moduleDisposePlugin.ts | A framework-level dispose registry exists only because of this |
| 7 | Vite's own host check and Devora's `allowedHosts` disagree (Vite 403 before Devora's 400; a listed host blocked by Vite) | ROADMAP H22 (fixed on this branch by passing the list to Vite) | Two checks to keep consistent |
| 8 | Vite's `/__open-in-editor` answers any page | ROADMAP H28 (guard added on this branch) | Another Vite route the framework has to fence |
| 9 | The test runner pulls a second, older Vite (5.4.21) with advisories | ROADMAP H18 | Dev-only, audit noise |

Not evidence of a problem (looked for, not found):

- No recorded case of an island hydrating with the wrong component or props because of Vite.
- No measured slowness of island HMR: there is no benchmark of dev-server start or HMR latency in the repository
  (phase 3B lists them as not measured unless that phase measured them).
- No recorded production problem: the production build (Vite + esbuild) is not in scope and has no island
  finding open.

What this means for a dev server of our own: items 1, 2, 5, 7 and 8 are under the framework's control in its own
server (no `/@fs/`, a preamble served as a file, per-island invalidation, one host check, no editor endpoint).
Items 3 and 4 move rather than disappear (someone has to bundle dependencies). Item 6 is a property of reloading
server modules in one process and would need the same dispose registry.
