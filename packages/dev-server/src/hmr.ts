/**
 * The HMR channel: one WebSocket path, server-to-client messages only. The upgrade needs a known Host, an Origin
 * equal to the page's own origin, and the per-launch token as a second WebSocket subprotocol
 * (`new WebSocket(url, ["devora-hmr", token])`). Anything else gets a plain 403 and no upgrade. Written against
 * RFC 6455 directly (no dependency): text frames out, close and ping handled in, at most 64 KB read per client.
 */
import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { tokenMatches } from "./guards.js";

export const HMR_PATH = "/_devora/hmr";
export const HMR_PROTOCOL = "devora-hmr";
const MAX_CLIENTS = 32;
const MAX_INBOUND_BYTES = 64 * 1024;
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export interface HmrChannel {
  handleUpgrade(req: IncomingMessage, socket: Duplex): void;
  broadcast(message: unknown): void;
  readonly clients: number;
  closeAll(): void;
}

function refuse(socket: Duplex, status: number, text: string): void {
  socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function frame(text: string): Buffer {
  const payload = Buffer.from(text);
  const len = payload.length;
  const header = len < 126 ? Buffer.from([0x81, len]) : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255]) : Buffer.concat([Buffer.from([0x81, 127, 0, 0, 0, 0]), Buffer.from([(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255])]);
  return Buffer.concat([header, payload]);
}

export function createHmrChannel(options: { token: string; hostAllowed: (host: string | undefined) => boolean }): HmrChannel {
  const sockets = new Set<Duplex>();
  return {
    handleUpgrade(req, socket) {
      const target = req.url ?? "/";
      const url = new URL(target.startsWith("/") ? `http://localhost${target}` : "http://localhost/", "http://localhost");
      if (url.pathname !== HMR_PATH) return refuse(socket, 404, "Not Found");
      if (!options.hostAllowed(req.headers.host)) return refuse(socket, 400, "Bad Request");
      const origin = req.headers.origin;
      let originOk = false;
      if (typeof origin === "string") {
        try {
          const o = new URL(origin);
          originOk = (o.protocol === "http:" || o.protocol === "https:") && o.host === req.headers.host;
        } catch {
          originOk = false;
        }
      }
      if (!originOk) return refuse(socket, 403, "Forbidden");
      const protocols = String(req.headers["sec-websocket-protocol"] ?? "").split(",").map((p) => p.trim());
      if (protocols[0] !== HMR_PROTOCOL || !tokenMatches(options.token, protocols[1])) return refuse(socket, 403, "Forbidden");
      const key = req.headers["sec-websocket-key"];
      if (typeof key !== "string" || req.headers["sec-websocket-version"] !== "13" || String(req.headers.upgrade).toLowerCase() !== "websocket") {
        return refuse(socket, 400, "Bad Request");
      }
      if (sockets.size >= MAX_CLIENTS) return refuse(socket, 503, "Service Unavailable");
      const accept = createHash("sha1").update(key + GUID).digest("base64");
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ${HMR_PROTOCOL}\r\n\r\n`);
      sockets.add(socket);
      let received = 0;
      socket.on("data", (chunk: Buffer) => {
        received += chunk.length;
        const opcode = chunk[0]! & 0x0f;
        if (received > MAX_INBOUND_BYTES || opcode === 0x8) socket.destroy();
        else if (opcode === 0x9) socket.write(Buffer.from([0x8a, 0])); // pong
      });
      const drop = () => sockets.delete(socket);
      socket.on("close", drop);
      socket.on("error", drop);
    },
    broadcast(message) {
      const data = frame(JSON.stringify(message));
      for (const s of sockets) s.write(data);
    },
    get clients() {
      return sockets.size;
    },
    closeAll() {
      for (const s of sockets) s.destroy();
      sockets.clear();
    },
  };
}
