// The realtime server: a plain Node process, separate from the Devora app.
//   - browsers connect over Socket.IO with a 60-second token from the app
//   - the app calls POST /publish (shared secret) when data changes
// One process is enough to start with. Several instances need a shared
// adapter (@socket.io/redis-adapter) so a publish reaches every instance.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { verifyToken } from "./token.mjs";

export function createRealtimeServer({ tokenSecret, publishSecret, origins }) {
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" }).end('{"status":"ok"}');
      return;
    }
    if (req.method === "POST" && url.pathname === "/publish") {
      const given = Buffer.from((req.headers.authorization ?? "").replace(/^Bearer /i, ""));
      const wanted = Buffer.from(publishSecret);
      if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
        res.writeHead(401, { "content-type": "application/json" }).end('{"message":"unauthorized"}');
        return;
      }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 64 * 1024) {
          res.writeHead(413).end();
          return;
        }
      }
      let message;
      try {
        message = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" }).end('{"message":"invalid JSON"}');
        return;
      }
      if (typeof message.userId !== "string" || typeof message.event !== "string") {
        res.writeHead(400, { "content-type": "application/json" }).end('{"message":"userId and event required"}');
        return;
      }
      const room = `user:${message.userId}`;
      const delivered = (await io.in(room).fetchSockets()).length;
      io.to(room).emit(message.event, message.data);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ delivered }));
      return;
    }
    // Socket.IO answers its own path; everything else is a 404.
    if (!url.pathname.startsWith("/socket.io")) res.writeHead(404).end();
  });

  const io = new Server(httpServer, { cors: { origin: origins, credentials: false } });
  io.use((socket, next) => {
    const claims = verifyToken(socket.handshake.auth?.token, tokenSecret);
    if (!claims) return next(new Error("unauthorized"));
    socket.data.userId = claims.sub;
    next();
  });
  io.on("connection", (socket) => {
    // One room per user: a publish for "alice" reaches every tab alice has open.
    socket.join(`user:${socket.data.userId}`);
  });
  return { httpServer, io };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const production = process.env.NODE_ENV === "production";
  const tokenSecret = process.env.REALTIME_TOKEN_SECRET ?? (production ? "" : "dev-only-realtime-token-secret");
  const publishSecret = process.env.REALTIME_PUBLISH_SECRET ?? (production ? "" : "dev-only-realtime-publish-secret");
  if (!tokenSecret || !publishSecret) {
    console.error("[realtime] REALTIME_TOKEN_SECRET and REALTIME_PUBLISH_SECRET are required in production");
    process.exit(1);
  }
  const origins = (process.env.REALTIME_ORIGINS ?? "http://localhost:4173").split(",");
  const port = Number(process.env.PORT ?? 4400);
  const { httpServer } = createRealtimeServer({ tokenSecret, publishSecret, origins });
  httpServer.listen(port, () => console.log(`[realtime] listening on :${port}, allowing ${origins.join(", ")}`));
}
