import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { AppConfig, AuthMode, AppRuntimeConfig, RenderMode } from "@devorajs/core";
import { bundleForDeploy } from "./bundleForDeploy.js";

export { isVercelLinked, deployToVercel } from "./deploy.js";

const require = createRequire(import.meta.url);

/**
 * `bundleForDeploy` deliberately leaves `react`/`react-dom` `external` (see
 * that file — bundling them inline hits a real esbuild+Node ESM interop
 * failure), on the assumption that a platform's own dependency tracer would
 * supply them the way it does for any ordinary npm package. Confirmed false
 * by a real Vercel deploy: `Cannot find package 'react'` at runtime. The
 * reason is specific to the Build Output API v3 path this adapter uses —
 * Vercel only runs its own tracer (`@vercel/nft`) when *it* builds your
 * function; handed a function you built yourself (this adapter's whole
 * model), it uploads exactly what's in `funcDir` and nothing more. So this
 * vendors the real, resolved package directories in ourselves — not
 * symlinks, which is all pnpm's `node_modules` actually contains, and which
 * wouldn't survive being uploaded to Vercel's infrastructure — making the
 * function genuinely self-contained instead of depending on tracing that
 * was never going to happen.
 *
 * Recurses into each package's own `dependencies` (never `devDependencies`/
 * `peerDependencies` — those aren't needed at runtime) rather than hardcoding
 * "react and react-dom are enough": a first pass that copied only those two
 * top-level directories left the deploy broken a second way, silently —
 * `react-dom`'s own `scheduler`/`loose-envify` dependencies live as *sibling*
 * symlinks in pnpm's per-package virtual-store folder (`.pnpm/react-dom@.../
 * node_modules/scheduler`), not nested inside `react-dom`'s own directory, so
 * a plain recursive copy of `react-dom` alone never reaches them at all.
 * Resolving each dependency relative to its *parent's* own resolved
 * directory (not the app root) matters too — that's what lets Node's own
 * `require.resolve` walk back up to that exact per-package virtual-store
 * folder and find the version pnpm actually picked for that parent,
 * mirroring the resolution Node itself would do at runtime.
 */
async function vendorRuntimeDependency(
  resolveFrom: string,
  pkgName: string,
  destNodeModules: string,
  seen: Set<string> = new Set()
): Promise<void> {
  if (seen.has(pkgName)) return;
  seen.add(pkgName);

  const pkgJsonPath = require.resolve(`${pkgName}/package.json`, { paths: [resolveFrom] });
  const pkgDir = path.dirname(pkgJsonPath);
  await cp(pkgDir, path.join(destNodeModules, pkgName), { recursive: true, dereference: true });

  const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8")) as { dependencies?: Record<string, string> };
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    await vendorRuntimeDependency(pkgDir, dep, destNodeModules, seen);
  }
}

/**
 * Vercel Build Output API adapter (§13). Packages the same `dist/server`
 * output `devora build` already produced (ROADMAP.md #4) — plus the
 * app's routes/ (needed at runtime only for route-path matching via
 * matchRoute, never executed) — into a single Node.js serverless function,
 * then bundles it via `bundleForDeploy` so it can actually run outside the
 * monorepo (see that file for what was tried and what real bugs it fixed).
 *
 * Verified locally by copying the generated function to a directory
 * completely outside this repo (no ancestor `node_modules`) and running it
 * there — previously with `react`/`react-dom` placed in `node_modules` by
 * hand to simulate a platform tracer; a real Vercel deploy proved that
 * simulation wrong (see `vendorRuntimeDependency` above), so this now does
 * the same vendoring for real, not just in the local verification harness.
 */
export async function writeVercelOutput(
  app: AppConfig,
  appRoot: string,
  authMode: AuthMode,
  security: AppRuntimeConfig["security"],
  sitemapEnabled: boolean,
  defaultRenderMode?: RenderMode
): Promise<void> {
  const outputDir = path.join(appRoot, ".vercel", "output");
  const funcDir = path.join(outputDir, "functions", "index.func");
  const clientOutDir = path.join(appRoot, "dist", "client");
  const staticOutDir = path.join(appRoot, "dist", "static");

  await mkdir(path.join(outputDir, "static"), { recursive: true });
  await mkdir(funcDir, { recursive: true });

  // existsSync-guarded, unlike originally (a real gap this surfaced): a
  // backend-only app (architecture-v2.md §3.4) has no routes/ directory at
  // all, and `cp` throws ENOENT on a missing source — this used to assume
  // every app has at least one page route, true before backend-only mode
  // existed.
  if (existsSync(path.join(appRoot, "routes"))) {
    await cp(path.join(appRoot, "routes"), path.join(funcDir, "routes"), { recursive: true });
  }
  // Generic API routes (architecture-v2.md §3.2) — prodRequestHandler.ts's
  // matchRoute() needs the *source* api/ files at runtime (same as routes/
  // above), not just their built dist/server/api/*.js output (copied below
  // regardless). A real bug found wiring this up: without this, every
  // /api/* request 404'd in the deployed function even though the built
  // handler file was present and correctly bundled — matchRoute() had
  // nothing to match against. existsSync-guarded: most apps have no api/
  // directory at all.
  if (existsSync(path.join(appRoot, "api"))) {
    await cp(path.join(appRoot, "api"), path.join(funcDir, "api"), { recursive: true });
  }
  await cp(path.join(appRoot, "dist", "server"), path.join(funcDir, "dist", "server"), { recursive: true });

  // Island client assets (ROADMAP.md #4) — served directly by Vercel's
  // static file handling (see the "handle": "filesystem" route below), not
  // proxied through the function, so they aren't copied into funcDir too.
  if (existsSync(clientOutDir)) {
    await cp(clientOutDir, path.join(outputDir, "static"), { recursive: true });
  }

  // ssg/isr pre-rendered HTML (ROADMAP.md's render-modes item) — copied into
  // BOTH places: static/ so Vercel's filesystem routing can serve an ssg
  // page directly with no function invocation at all (the same reasoning as
  // island assets above), and into funcDir so isr's synchronous-regenerate-
  // on-stale path has something to read/overwrite. That second half is the
  // one genuinely unverified part: a Vercel function's filesystem isn't
  // guaranteed to persist or be shared across invocations, so isr here is
  // structurally weaker than under adapter-node — flagged, not silently
  // assumed to work the same way.
  if (existsSync(staticOutDir)) {
    await cp(staticOutDir, path.join(outputDir, "static"), { recursive: true });
    await cp(staticOutDir, path.join(funcDir, "dist", "static"), { recursive: true });
  }

  // Real bug — same root cause as adapter-netlify's identical fix (see that
  // file's copy of this comment for the full account, found via a live
  // Netlify deploy): `bundleForDeploy` writes `dist/server/**/*.js` with
  // `format: "esm"`, but nothing in `funcDir` ever declared `"type":
  // "module"`. `index.mjs` itself loads fine regardless (Vercel's
  // `nodejs20.x` runtime invokes it directly, and `.mjs` is always ESM to
  // Node), but `prodRequestHandler.ts`'s `importBuilt()` dynamically
  // `import()`s a plain `.js` route file at request time — with no
  // package.json to say otherwise, Node defaults that to CommonJS and
  // throws `SyntaxError: Cannot use import statement outside a module` on
  // the first real request to any `ssr`/`isr`/`csr` route. Never verified
  // live on Vercel for those render modes, only `ssg` (never invokes the
  // function for its homepage) — so this was equally live-broken here,
  // just not yet hit.
  await writeFile(path.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));

  await writeFile(
    path.join(funcDir, "index.mjs"),
    `import { createProdRequestHandler } from "@devorajs/core";\n\n` +
      `// appRoot is this function's own directory — routes/ and dist/server\n` +
      `// were copied in alongside this file by writeVercelOutput.\n` +
      `const handleRequest = createProdRequestHandler(\n` +
      `  new URL(".", import.meta.url).pathname,\n` +
      `  ${JSON.stringify(app.name)},\n` +
      `  ${JSON.stringify(authMode)},\n` +
      `  ${JSON.stringify(app.domain)},\n` +
      `  ${JSON.stringify(security ?? {})},\n` +
      `  ${JSON.stringify(sitemapEnabled)},\n` +
      `  ${JSON.stringify(defaultRenderMode ?? null)}\n` +
      `);\n\n` +
      `export default async function handler(req, res) {\n` +
      `  try {\n` +
      `    const handled = await handleRequest(req, res);\n` +
      `    if (!handled) {\n` +
      `      res.statusCode = 404;\n` +
      `      res.end("Not found");\n` +
      `    }\n` +
      `  } catch (err) {\n` +
      `    console.error(err);\n` +
      `    if (!res.headersSent) res.statusCode = 500;\n` +
      `    res.end("Internal Server Error");\n` +
      `  }\n` +
      `}\n`
  );

  await bundleForDeploy(path.join(funcDir, "index.mjs"), path.join(funcDir, "dist", "server"));

  const funcNodeModules = path.join(funcDir, "node_modules");
  await mkdir(funcNodeModules, { recursive: true });
  // `react` is always needed: @devorajs/core's own server code imports it
  // (csrf.ts, islandComponent.tsx). `react-dom` only renders pages — a
  // backend-only app (no dist/server/entry-server.js, same signal
  // bundleForDeploy uses) never imports it, and never installs it either,
  // so vendoring it unconditionally failed that app's build outright with
  // "Cannot find module 'react-dom/package.json'" (found scaffolding a real
  // create-devora --scope=backend project).
  await vendorRuntimeDependency(appRoot, "react", funcNodeModules);
  if (existsSync(path.join(funcDir, "dist", "server", "entry-server.js"))) {
    await vendorRuntimeDependency(appRoot, "react-dom", funcNodeModules);
  }

  await writeFile(
    path.join(funcDir, ".vc-config.json"),
    JSON.stringify({ runtime: "nodejs20.x", handler: "index.mjs", launcherType: "Nodejs" }, null, 2)
  );

  // "handle": "filesystem" first — try a static file (island assets under
  // static/) before falling through to the function. Without this, every
  // request including asset requests hit the function, which doesn't even
  // have those files (they're in static/, not funcDir) — a real bug caught
  // while wiring production island hydration, not a hypothetical one.
  const config = {
    version: 3,
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index" }],
  };
  await writeFile(path.join(outputDir, "config.json"), JSON.stringify(config, null, 2));

  console.log(
    `[adapter-vercel] wrote ${outputDir} for "${app.name}" (${app.domain}) — verified locally in isolation, ` +
      `NOT deployed to real Vercel infrastructure (no platform access here), see ROADMAP.md #4`
  );
}
