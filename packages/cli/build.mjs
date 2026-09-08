import { chmod } from "node:fs/promises";
import * as esbuild from "esbuild";

/**
 * Bundles the CLI into a single plain-Node-executable file (see
 * ROADMAP.md's CLI bin item). Two real problems, not one, made
 * `pnpm exec devora` fail before this:
 *
 * 1. `src/index.ts`'s relative imports use `.js` specifiers over `.ts`
 *    sources (e.g. `./commands/dev.js`, no `dev.js` on disk) — plain Node's
 *    native TS support doesn't remap `.js` -> `.ts` the way `tsx`/`ts-node`
 *    do, so `node src/index.ts` fails with `ERR_MODULE_NOT_FOUND`.
 * 2. Even a correctly-compiled entry would immediately hit the same
 *    problem one level deeper: `@devorajs/core` and every `@devorajs/adapter-*`
 *    package's `exports` field points at raw `.ts` source too (needed so
 *    Vite/tsx can resolve them live during development without a rebuild
 *    step) — plain Node can't execute those either.
 *
 * (esbuild already preserves `src/index.ts`'s own leading `#!/usr/bin/env
 * node` shebang automatically — no `banner` option needed for it; adding one
 * anyway would duplicate the line and break the file, since Node only
 * special-cases stripping a shebang on the file's literal first line.)
 *
 * `tsc` alone only fixes #1. Fixing #2 without repointing those packages'
 * `exports` at compiled output (which would silently stop reflecting local
 * edits until a manual rebuild — a real DX regression, not worth it just to
 * fix this bin) means the CLI's own entry point needs every workspace-local
 * package inlined, exactly the same "bundle so it survives outside the
 * monorepo's live-source resolution" problem `adapter-vercel`/
 * `adapter-netlify`'s `bundleForDeploy.ts` already solved for the exact same
 * reason (see that file). Reusing that approach here rather than inventing
 * a second one.
 *
 * External packages are real npm dependencies this bundle intentionally
 * does NOT inline, because they're already declared dependencies of this
 * package and pnpm links them into `packages/cli/node_modules` — resolvable
 * at runtime from `dist/index.js`'s location without needing to be bundled:
 * - `commander`, `vite` — plain npm packages, no reason to inline.
 * - `esbuild` — has a native binary it locates relative to its own module
 *   location; bundling it inline would break that lookup.
 * - `jiti` — `@devorajs/core/config-loader`'s loader for `devora.config.ts`/
 *   `app.config.ts`, with real side-effecting internals (see
 *   `packages/core/src/configLoader.ts`'s doc comment) that make it
 *   unsafe to assume tree-shakeable; kept external and explicit instead.
 *
 * `react` is deliberately NOT external: it's pulled in only transitively,
 * through `@devorajs/core`'s barrel (`islandComponent.tsx` imports it for
 * `createElement`/context types), and no CLI command ever renders anything
 * — nothing here calls the island machinery. It's also not a declared
 * dependency of this package, so marking it external would leave an
 * unresolvable bare specifier at runtime. Bundling it in is correct and
 * cheap (react itself is small and side-effect-free at module scope);
 * confirmed by inspecting the actual bundled output below rather than
 * assuming either way.
 */
const result = await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: ["commander", "vite", "esbuild", "jiti"],
  logLevel: "info",
  metafile: true,
});

// esbuild doesn't set the executable bit on its output, and pnpm's `.bin`
// symlink needs it set on the target for direct invocation to work.
await chmod("dist/index.js", 0o755);

const reactPulledIn = Object.keys(result.metafile.inputs).some((file) =>
  file.includes("/react/") || file.includes("\\react\\")
);
console.log(
  reactPulledIn
    ? "[build] note: react was bundled into dist/index.js (expected — transitively pulled in via @devorajs/core, never externally resolvable from this package)."
    : "[build] react was fully tree-shaken out of dist/index.js."
);
