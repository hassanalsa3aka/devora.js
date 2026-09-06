import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp } from "node:fs/promises";
import type { AppConfig, AuthMode, AppRuntimeConfig, RenderMode } from "@devora/core";
import { bundleForDeploy } from "./bundleForDeploy.js";

export { isNetlifyLinked, deployToNetlify } from "./deploy.js";

/**
 * Netlify Functions adapter (§13). Same real `dist/server` output as
 * adapter-vercel (ROADMAP.md #4), wrapped in a Netlify Functions v2 handler
 * (`(Request) => Response`, the modern documented shape) that bridges into
 * `createProdRequestHandler`'s Node `http.IncomingMessage`/`ServerResponse`
 * expectations with a minimal shim — not a full polyfill, just the surface
 * the handler actually touches (url, method, headers, async-iterable body;
 * setHeader/statusCode/end) — then bundled via the same `bundleForDeploy`
 * adapter-vercel uses, so `@devora/core` resolves outside the monorepo here
 * too (see that file for the real bugs found and fixed getting there).
 * Netlify's own function packaging (`zip-it-and-ship-it`) does its own
 * dependency tracing already, but it would hit the identical problem
 * `@devora/core`'s `exports` pose — .ts source, not something a tracer
 * built for ordinary compiled npm packages can execute — so this isn't
 * redundant with their tooling, it's covering what their tooling can't.
 *
 * Verified the same way as adapter-vercel: the generated function, run from
 * a directory completely outside this repo with real `react`/`react-dom`
 * placed in `node_modules` (simulating what Netlify's tracer would supply
 * for those two ordinary packages). Not deployed to real Netlify
 * infrastructure — no platform access here.
 */
export async function writeNetlifyConfig(
  app: AppConfig,
  appRoot: string,
  authMode: AuthMode,
  security: AppRuntimeConfig["security"],
  sitemapEnabled: boolean,
  defaultRenderMode?: RenderMode
): Promise<void> {
  const funcDir = path.join(appRoot, "netlify", "functions", "ssr");
  const staticOutDir = path.join(appRoot, "dist", "static");
  await mkdir(funcDir, { recursive: true });

  await cp(path.join(appRoot, "routes"), path.join(funcDir, "routes"), { recursive: true });
  await cp(path.join(appRoot, "dist", "server"), path.join(funcDir, "dist", "server"), { recursive: true });

  // ssg/isr pre-rendered HTML — same caveat as adapter-vercel: copied into
  // funcDir so isr's regenerate-on-stale path has something to read/
  // overwrite, but a Netlify function's filesystem isn't guaranteed to
  // persist or be shared across invocations, so isr here is structurally
  // weaker than under adapter-node. Also copied to dist/client (Netlify's
  // `publish` directory, see netlify.toml below) so ssg pages can be served
  // as plain static files without invoking the function at all.
  if (existsSync(staticOutDir)) {
    await cp(staticOutDir, path.join(funcDir, "dist", "static"), { recursive: true });
    await cp(staticOutDir, path.join(appRoot, "dist", "client"), { recursive: true });
  }

  await writeFile(
    path.join(funcDir, "ssr.mjs"),
    `import { createProdRequestHandler } from "@devora/core";\n` +
      `import { Readable } from "node:stream";\n\n` +
      `const handleRequest = createProdRequestHandler(\n` +
      `  new URL(".", import.meta.url).pathname,\n` +
      `  ${JSON.stringify(app.name)},\n` +
      `  ${JSON.stringify(authMode)},\n` +
      `  ${JSON.stringify(app.domain)},\n` +
      `  ${JSON.stringify(security ?? {})},\n` +
      `  ${JSON.stringify(sitemapEnabled)},\n` +
      `  ${JSON.stringify(defaultRenderMode ?? null)}\n` +
      `);\n\n` +
      `export default async (request) => {\n` +
      `  const bodyBuf = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);\n` +
      `  const req = Readable.from(bodyBuf.length ? [bodyBuf] : []);\n` +
      `  const reqUrl = new URL(request.url);\n` +
      `  req.url = reqUrl.pathname + reqUrl.search;\n` +
      `  req.method = request.method;\n` +
      `  req.headers = Object.fromEntries(request.headers);\n\n` +
      `  let statusCode = 200;\n` +
      `  const resHeaders = new Headers();\n` +
      `  let responseBody = "";\n` +
      `  const res = {\n` +
      `    setHeader: (k, v) => resHeaders.set(k, v),\n` +
      `    get statusCode() { return statusCode; },\n` +
      `    set statusCode(v) { statusCode = v; },\n` +
      `    end: (chunk) => { responseBody = chunk ?? ""; },\n` +
      `  };\n\n` +
      `  try {\n` +
      `    const handled = await handleRequest(req, res);\n` +
      `    if (!handled) return new Response("Not found", { status: 404 });\n` +
      `    return new Response(responseBody, { status: statusCode, headers: resHeaders });\n` +
      `  } catch (err) {\n` +
      `    console.error(err);\n` +
      `    return new Response("Internal Server Error", { status: 500 });\n` +
      `  }\n` +
      `};\n`
  );

  await bundleForDeploy(path.join(funcDir, "ssr.mjs"), path.join(funcDir, "dist", "server"));

  const toml =
    `[build]\n  publish = "dist/client"\n  functions = "netlify/functions"\n\n` +
    `[[redirects]]\n  from = "/*"\n  to = "/.netlify/functions/ssr"\n  status = 200\n`;
  await writeFile(path.join(appRoot, "netlify.toml"), toml);

  console.log(
    `[adapter-netlify] wrote ${funcDir} + netlify.toml for "${app.name}" (${app.domain}) — verified locally in ` +
      `isolation, NOT deployed to real Netlify infrastructure (no platform access here), see ROADMAP.md #4`
  );
}
