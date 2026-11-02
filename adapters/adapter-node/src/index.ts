import http from "node:http";
import { createProdRequestHandler, type AuthMode, type AppRuntimeConfig, type CorsConfig, type HeadConfig, type RenderMode } from "@devorajs/core";

/**
 * Limits on the HTTP server (app.config.ts `server`). Node's own defaults are
 * generous (five minutes for a whole request, and the headers timeout is
 * only checked every 30 seconds); these are set explicitly so a client that
 * trickles its headers, or never finishes a request, is cut off on time.
 */
export interface ServerLimits {
  /** Time to receive the request headers (a slow-header client gets a 408). Default 15000. */
  headersTimeoutMs?: number;
  /** Time to receive the whole request, body included. Default 60000. */
  requestTimeoutMs?: number;
  /** How long an idle keep-alive connection stays open. Default 5000. */
  keepAliveTimeoutMs?: number;
  /** Largest request header block in bytes (larger gets a 431). Default 16384. */
  maxHeaderBytes?: number;
}

export const DEFAULT_SERVER_LIMITS: Required<ServerLimits> = {
  headersTimeoutMs: 15_000,
  requestTimeoutMs: 60_000,
  keepAliveTimeoutMs: 5_000,
  maxHeaderBytes: 16_384,
};

/** The defaults with `overrides` applied; throws on a value that is not a positive whole number. */
export function resolveServerLimits(overrides: ServerLimits = {}): Required<ServerLimits> {
  const limits = { ...DEFAULT_SERVER_LIMITS };
  for (const key of Object.keys(DEFAULT_SERVER_LIMITS) as (keyof ServerLimits)[]) {
    const value = overrides[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`[adapter-node] app.config.ts server.${key} must be a whole number above zero (got ${String(value)})`);
    }
    limits[key] = value;
  }
  if (limits.headersTimeoutMs > limits.requestTimeoutMs) {
    throw new Error(
      `[adapter-node] app.config.ts server.headersTimeoutMs (${limits.headersTimeoutMs}) can't be longer than requestTimeoutMs (${limits.requestTimeoutMs})`
    );
  }
  return limits;
}

/**
 * Self-hosted fallback (§13). Boots a real Node HTTP server against an
 * app's `dist/server` output (see packages/cli/src/build/buildAppServer.ts,
 * docs/history/BUILD-LOG.md #4) — same request-handling behavior as `devora dev`
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
  /** app.config.ts `allowedHosts` (unset: no host check). */
  allowedHosts?: string[];
  /** app.config.ts `server` — timeouts and the header size limit (see ServerLimits). */
  serverLimits?: ServerLimits;
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
    {
      apiDir: opts.apiDir,
      trustProxy: opts.trustProxy,
      head: opts.head,
      maxBodyBytes: opts.maxBodyBytes,
      cors: opts.cors,
      allowedHosts: opts.allowedHosts,
    }
  );

  const limits = resolveServerLimits(opts.serverLimits);
  const server = http.createServer(
    {
      maxHeaderSize: limits.maxHeaderBytes,
      // How often Node checks headersTimeout/requestTimeout (its default is every 30 s).
      connectionsCheckingInterval: Math.min(1_000, limits.headersTimeoutMs),
    },
    (req, res) => {
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
    }
  );
  server.headersTimeout = limits.headersTimeoutMs;
  server.requestTimeout = limits.requestTimeoutMs;
  server.keepAliveTimeout = limits.keepAliveTimeoutMs;

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
