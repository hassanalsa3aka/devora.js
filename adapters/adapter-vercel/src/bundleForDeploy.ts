import path from "node:path";
import { readdir } from "node:fs/promises";
import * as esbuild from "esbuild";

/**
 * Makes the deployed function actually runnable outside the monorepo
 * (ROADMAP.md #4). Verified for real, not assumed: copied a real generated
 * function directory to /tmp (outside any node_modules ancestor) and ran
 * it — before this, it failed with `Cannot find package '@devorajs/core'`
 * (its `exports` point at `.ts` source, unexecutable by plain Node/any
 * platform runtime); after, with real `react`/`react-dom` placed in
 * `node_modules` (simulating what a platform's own dependency tracer does
 * for ordinary npm packages — not re-implemented here, and not something
 * this environment can verify against a real tracer), the full request
 * chain works: routing, sessions (login → cookie → authenticated write
 * reaching the same DB-stub error as everywhere else), and island SSR
 * content.
 *
 * Two separate bundle passes, not one, and each shape was arrived at by
 * hitting a real failure and fixing it — not decided in advance:
 * 1. The wrapper (`index.mjs`) is bundled alone, inlining `@devorajs/core` —
 *    the actual unique problem (react/react-dom are ordinary npm packages
 *    any platform tracer already knows how to handle; nothing here should
 *    duplicate that).
 * 2. `entry-server.js` + every route file are bundled *together*, with
 *    `splitting: true` — react/react-dom marked `external` (bundling them
 *    inline hit a separate esbuild+Node ESM interop failure, "Dynamic
 *    require of 'stream' is not supported", from react-dom's CJS internals;
 *    switching to CJS output to dodge that then hit a *different* interop
 *    gap — esbuild's CJS output omits `default` from the static export hint
 *    `cjs-module-lexer` uses, so a route's default-exported component
 *    silently became the *whole* CJS exports object one level too high;
 *    `packages/core/src/prodRequestHandler.ts` now defensively unwraps that
 *    exact shape, since it's cheap insurance and it's genuinely possible for
 *    other bundlers to hit the same lexer gap). Bundling every route
 *    separately (no `splitting`) creates an *independent* copy of
 *    `@devorajs/core` per file — harmless for stateless exports, but
 *    `Island.tsx`'s `IslandCollectorContext` is a React Context object,
 *    and two separately-bundled copies are two different objects, so
 *    `useContext` in a route's copy can never see the Provider set up by
 *    entry-server's copy. It fails *silently* (the context's own
 *    `if (!collector) return null` guard), not with an error — an island
 *    quietly renders nothing instead of crashing. `splitting: true` shares
 *    one `@devorajs/core` chunk across all of them, which is what actually
 *    fixed it (confirmed by re-running the isolated test and seeing the
 *    island's real markup appear).
 */
export async function bundleForDeploy(wrapperPath: string, serverOutDir: string): Promise<void> {
  await esbuild.build({
    entryPoints: [wrapperPath],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: wrapperPath,
    allowOverwrite: true,
    logLevel: "silent",
  });

  const routeFiles = await findJsFiles(path.join(serverOutDir, "routes"));
  await esbuild.build({
    entryPoints: [path.join(serverOutDir, "entry-server.js"), ...routeFiles],
    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    external: ["react", "react-dom", "react-dom/*"],
    outdir: serverOutDir,
    outbase: serverOutDir,
    allowOverwrite: true,
    logLevel: "silent",
  });
}

async function findJsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsFiles(full)));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}
