import http from "node:http";
import { createProdRequestHandler, type AuthMode, type AppRuntimeConfig, type CorsConfig, type HeadConfig, type RenderMode } from "@devorajs/core";

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
  /** app.config.ts `apiDir` (default "api"). */
  apiDir?: string;
  /** app.config.ts `trustProxy` (default false). */
  trustProxy?: boolean | number;
  /** app.config.ts `head` and `maxBodyBytes`. */
  head?: HeadConfig;
  maxBodyBytes?: number;
  cors?: CorsConfig;
  port: number;
  /** Interface to bind (`HOST` / `devora start --host`). Default: Node's — every interface. */
  host?: string;
}): http.Server {
  const handleRequest = createProdRequestHandler(
    opts.appRoot,
    opts.appName,
    opts.authMode,
    opts.domain,
    opts.security,
    opts.sitemapEnabled,
    opts.defaultRenderMode,
    { apiDir: opts.apiDir, trustProxy: opts.trustProxy, head: opts.head, maxBodyBytes: opts.maxBodyBytes, cors: opts.cors }
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
    } else if (err.code === "EADDRNOTAVAIL" || err.code === "ENOTFOUND") {
      console.error(`[adapter-node] "${opts.appName}": can't bind host "${opts.host}" (${err.code}) — check HOST / --host`);
    } else {
      console.error(`[adapter-node] "${opts.appName}"`, err);
    }
    process.exitCode = 1;
  });

  const onListening = () => {
    const where = opts.host === undefined ? `http://localhost:${opts.port} (all interfaces)` : `http://${formatHost(opts.host)}:${opts.port}`;
    console.log(`[adapter-node] "${opts.appName}" → ${where} (from ${opts.appRoot}/dist/server)`);
  };
  if (opts.host === undefined) server.listen(opts.port, onListening);
  else server.listen(opts.port, opts.host, onListening);

  return server;
}

/** An IPv6 literal needs brackets in a URL. */
function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}
