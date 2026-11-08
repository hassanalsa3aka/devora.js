/**
 * The experimental dev server's shell: loopback only, refuses production, the host check on every request and
 * upgrade, request limits, the confined module route with esbuild transforms, the HMR channel, and a file watcher
 * that tells clients to reload. Page and API rendering are not part of it yet: requests it does not own go to
 * `fallback` (default: 404).
 */
import http from "node:http";
import { watch, type FSWatcher } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { assertDevOnly, createDevHostCheck, generateDevToken } from "./guards.js";
import { resolveServedFile, type ServedRoot } from "./files.js";
import { createTransformCache, isTransformable } from "./transform.js";
import { createHmrChannel, HMR_PATH } from "./hmr.js";

export const MODULE_PREFIX = "/_devora/m/";

export interface DevServerOptions {
  roots: ServedRoot[];
  allowedHosts?: string[];
  port?: number;
  host?: "127.0.0.1" | "::1";
  fallback?: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>;
  /** Watch the roots and broadcast { type: "full-reload" } on a change (default true). */
  watch?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface DevServer {
  server: http.Server;
  port: number;
  token: string;
  origin: string;
  hmr: ReturnType<typeof createHmrChannel>;
  close(): Promise<void>;
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};

const TYPES: Record<string, string> = { ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json; charset=utf-8" };

export async function startExperimentalDevServer(options: DevServerOptions): Promise<DevServer> {
  const bindHost = options.host ?? "127.0.0.1";
  assertDevOnly(options.env ?? process.env, bindHost);
  for (const r of options.roots) {
    if (!r.prefix.startsWith(MODULE_PREFIX) || !r.prefix.endsWith("/")) throw new Error(`[devora dev-server] root prefix must start with ${MODULE_PREFIX} and end with "/": ${r.prefix}`);
  }
  const hostAllowed = createDevHostCheck(options.allowedHosts);
  const token = generateDevToken();
  const hmr = createHmrChannel({ token, hostAllowed });
  const transforms = createTransformCache();

  const send = (res: http.ServerResponse, status: number, body: string | Buffer, type = "text/plain; charset=utf-8", extra: Record<string, string> = {}) => {
    res.statusCode = status;
    for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) res.setHeader(k, v);
    res.setHeader("Content-Type", type);
    res.end(body);
  };

  const server = http.createServer({ maxHeaderSize: 16 * 1024 }, async (req, res) => {
    try {
      if (!hostAllowed(req.headers.host)) return send(res, 400, "Bad Request: unknown host");
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (pathname.startsWith(MODULE_PREFIX)) {
        if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed");
        const resolved = await resolveServedFile(pathname, options.roots);
        if (!("file" in resolved)) return send(res, resolved.refused === "missing" ? 404 : 403, resolved.refused === "missing" ? "Not Found" : "Forbidden");
        if (isTransformable(resolved.file)) return send(res, 200, await transforms.load(resolved.file), "text/javascript; charset=utf-8");
        const type = TYPES[path.extname(resolved.file)];
        if (!type) return send(res, 403, "Forbidden");
        // A file the page loads, not a page: nothing in it may run on this origin.
        return send(res, 200, await readFile(resolved.file), type, { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
      }
      if (options.fallback) return await options.fallback(req, res);
      send(res, 404, "Not Found");
    } catch (error) {
      console.error("[devora dev-server]", error);
      if (!res.headersSent) send(res, 500, "Internal Server Error");
      else res.end();
    }
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 60_000;
  server.on("upgrade", (req, socket) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname === HMR_PATH) hmr.handleUpgrade(req, socket);
    else socket.destroy();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, bindHost, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  const watchers: FSWatcher[] = [];
  if (options.watch !== false) {
    for (const r of options.roots) {
      try {
        watchers.push(
          watch(r.dir, { recursive: true }, (_event, file) => {
            if (file && String(file).split(path.sep).some((s) => s.startsWith("."))) return;
            if (file) transforms.invalidate(path.join(r.dir, String(file)));
            hmr.broadcast({ type: "full-reload" });
          })
        );
      } catch {
        // A root that cannot be watched still serves; changes then need a manual reload.
      }
    }
  }

  return {
    server,
    port,
    token,
    origin: `http://${bindHost === "::1" ? "[::1]" : bindHost}:${port}`,
    hmr,
    close: async () => {
      for (const w of watchers) w.close();
      hmr.closeAll();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
