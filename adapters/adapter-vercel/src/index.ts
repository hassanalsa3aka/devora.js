import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp } from "node:fs/promises";
import type { AppConfig, AuthMode, AppRuntimeConfig, RenderMode } from "@devora/core";
import { bundleForDeploy } from "./bundleForDeploy.js";

export { isVercelLinked, deployToVercel } from "./deploy.js";

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
 * there with real `react`/`react-dom` placed in `node_modules` — the part a
 * platform's own dependency tracer normally handles for ordinary npm
 * packages, and the one thing this can't reproduce: no real Vercel
 * deployment or its actual tracer was exercised (no platform access here).
 * That's the one remaining gap this environment genuinely cannot close.
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

  await cp(path.join(appRoot, "routes"), path.join(funcDir, "routes"), { recursive: true });
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

  await writeFile(
    path.join(funcDir, "index.mjs"),
    `import { createProdRequestHandler } from "@devora/core";\n\n` +
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
