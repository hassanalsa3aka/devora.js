/**
 * The sidecar's HTTP server rules: loopback only, a random free port per launch, the token on every request, and
 * only the 127.0.0.1 host (so a DNS-rebinding page cannot reach it under another name).
 */
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { guardDesktopRequest } from "./token.js";

export const DESKTOP_HOST = "127.0.0.1";

/** A free port on 127.0.0.1, chosen by the operating system (bind to port 0). */
export function pickLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, DESKTOP_HOST, () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

/** Refuses anything but loopback IPv4. */
export function assertLoopbackHost(host: string): void {
  if (host !== DESKTOP_HOST) {
    throw new Error(`[devora desktop] the desktop server listens on ${DESKTOP_HOST} only (got "${host}")`);
  }
}

/** True for a Host header that names this server (127.0.0.1 with its own port, or no port). */
export function isDesktopHostHeader(value: string | undefined, port: number): boolean {
  return value === DESKTOP_HOST || value === `${DESKTOP_HOST}:${port}`;
}

export type DesktopHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<unknown>;

export interface DesktopServer {
  server: http.Server;
  port: number;
  origin: string;
  close(): Promise<void>;
}

/**
 * Starts `handler` (the app's production request handler) behind the desktop rules. `port` defaults to a random
 * free one; `host` must be 127.0.0.1.
 */
export async function startDesktopServer(options: { token: string; handler: DesktopHandler; port?: number; host?: string }): Promise<DesktopServer> {
  const host = options.host ?? DESKTOP_HOST;
  assertLoopbackHost(host);
  const port = options.port ?? (await pickLoopbackPort());
  const debug = process.env.DEVORA_DESKTOP_DEBUG === "1"; // prints each request (path only, never the query or the token)
  const server = http.createServer((req, res) => {
    if (debug) {
      res.on("finish", () => console.log(`[devora desktop] ${req.method} ${(req.url ?? "").split("?")[0]} -> ${res.statusCode}`));
      res.on("close", () => !res.writableFinished && console.log(`[devora desktop] ${req.method} ${(req.url ?? "").split("?")[0]} -> closed before it was answered`));
    }
    if (!isDesktopHostHeader(req.headers.host, port)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Bad Request: unknown host");
      return;
    }
    if (guardDesktopRequest(options.token, req, res) !== "allowed") return;
    if (debug && (req.url ?? "").startsWith("/__devora_desktop/debug/")) {
      // what the page says about itself (DEVORA_DESKTOP_DEBUG=1; only reaches here with the launch token)
      let message = "";
      try {
        message = decodeURIComponent((req.url ?? "").slice("/__devora_desktop/debug/".length).split("?")[0]!);
      } catch {
        message = "(unreadable)";
      }
      console.log(`[devora desktop] page: ${message.replace(/[\u0000-\u001f]/g, " ")}`);
      res.statusCode = 204;
      res.end();
      // `pnpm run check:desktop-window`: the last report ends the run (the shell notices the server stopped and closes)
      if (process.env.DEVORA_DESKTOP_EXIT_AFTER_REPORT === "1" && message.startsWith("tried a _blank link")) setTimeout(() => process.exit(0), 300);
      return;
    }
    Promise.resolve(options.handler(req, res)).catch((error: unknown) => {
      console.error("[devora desktop] request failed:", error);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  });
  // The server's own limits, the same defaults as devora start.
  server.headersTimeout = 15_000;
  server.requestTimeout = 60_000;
  server.keepAliveTimeout = 5_000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  return {
    server,
    port,
    origin: `http://${DESKTOP_HOST}:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
