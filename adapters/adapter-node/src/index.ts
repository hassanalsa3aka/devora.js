import http from "node:http";
import { createProdRequestHandler, type AuthMode, type AppRuntimeConfig, type RenderMode } from "@devora/core";

/**
 * Self-hosted fallback (§13). Boots a real Node HTTP server against an
 * app's `dist/server` output (see packages/cli/src/build/buildAppServer.ts,
 * ROADMAP.md #4) — same request-handling behavior as `devora dev`
 * (routing, sessions, security headers, sitemap), just serving pre-built
 * files instead of going through Vite's dev transform. Pair with
 * `devora generate:proxy` for the nginx/caddy front door across
 * multiple app processes.
 */
export function createNodeServer(opts: {
  appRoot: string;
  appName: string;
  authMode: AuthMode;
  domain: string;
  security: AppRuntimeConfig["security"];
  sitemapEnabled: boolean;
  defaultRenderMode?: RenderMode;
  port: number;
}): http.Server {
  const handleRequest = createProdRequestHandler(
    opts.appRoot,
    opts.appName,
    opts.authMode,
    opts.domain,
    opts.security,
    opts.sitemapEnabled,
    opts.defaultRenderMode
  );

  const server = http.createServer((req, res) => {
    handleRequest(req, res)
      .then((handled) => {
        if (!handled) {
          res.statusCode = 404;
          res.end("Not found");
        }
      })
      .catch((err) => {
        console.error(`[adapter-node] "${opts.appName}"`, err);
        if (!res.headersSent) res.statusCode = 500;
        res.end("Internal Server Error");
      });
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[adapter-node] "${opts.appName}": port ${opts.port} already in use`);
    } else {
      console.error(`[adapter-node] "${opts.appName}"`, err);
    }
    process.exitCode = 1;
  });

  server.listen(opts.port, () => {
    console.log(`[adapter-node] "${opts.appName}" → http://localhost:${opts.port} (from ${opts.appRoot}/dist/server)`);
  });

  return server;
}
