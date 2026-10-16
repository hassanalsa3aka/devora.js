# Live updates (WebSockets)

Devora.js has no built-in WebSockets, and server-sent events from an API route do not work yet. API
routes return one whole response (`{ status, headers, body }`, one `Set-Cookie`), so nothing can be
streamed from them, and serverless platforms (Vercel, Netlify) cannot hold a connection open anyway.
This page is the supported answer: poll, run a small separate realtime server next to your app, or
attach `ws` to the app's own server with a wrapper script (below).

This page covers WebSockets (Socket.IO and `ws`), polling, and why server-sent events are not supported yet.

A runnable version of everything below is in [`examples/realtime/`](../../examples/realtime).

## Polling or a realtime server?

| | Polling | Realtime server |
|---|---|---|
| What it is | The page calls an API route every few seconds | A separate Node process keeps a connection open to each browser and pushes |
| Latency | Up to the interval (a few seconds) | Immediate |
| Extra process to run | No | Yes, on a host that stays on (not a platform that sleeps or scales to zero) |
| Works on Vercel/Netlify | Yes | The Devora app does; the realtime server runs elsewhere |
| Cost under load | One request per user per interval | One open connection per user |

Start with polling. It is a `setInterval` and a `fetch`, it works everywhere the app does, and it
is what the realtime example falls back to. Add a realtime server when a few seconds of delay is
not acceptable (chat, presence, live cursors, a dashboard people watch).

## Architecture

```text
 browser ──── page and API calls ────────────▶ Devora app (any host, serverless is fine)
    │                                              │
    │  1. GET /api/realtime-token (logged in)      │ 3. POST /publish
    │◀──── 60-second token ────────────────────────┤    Authorization: Bearer <publish secret>
    │                                              ▼
    └─ 2. connect with the token ──────────▶ realtime server (always-on Node process)
                                                   │ 4. emits to the user's room
    ◀──────────── live event ──────────────────────┘
```

1. A logged-in browser asks a Devora API route for a token. The route calls `ctx.requireAuth()`, so
   without a login it answers 401. The token holds the user id and expires after 60 seconds.
2. The browser connects to the realtime server with that token. The server verifies the signature
   and the expiry once, at connect time, and puts the socket in a room for that user.
3. When data changes, your Devora code (a loader's action, an API route, a webhook) calls
   `POST /publish` on the realtime server with a secret only the two servers know.
4. The realtime server emits the event to the user's room. Every tab that user has open receives it.

The token is HMAC-SHA256 over `{ sub, exp }`, using `node:crypto` on both sides: no JWT library.
The session cookie never leaves your app; the realtime server never sees it.

## The CSP setting

Every response carries a Content-Security-Policy whose default is
`default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'`.
`default-src 'self'` also governs `connect-src`, so the browser refuses to open a connection to
another origin and logs a `Refused to connect ... violates the Content-Security-Policy directive`
error. Set `security.csp` in the app's `app.config.ts` (it replaces the whole default string, so
repeat the default directives and add `connect-src`):

```ts
export default defineApp({
  security: {
    csp:
      "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; " +
      "connect-src 'self' https://realtime.example.com wss://realtime.example.com",
  },
});
```

List both the `https:` origin (Socket.IO's polling transport) and the `wss:` origin (the upgrade).
`devora start` reads `app.config.ts` when it starts; the Vercel and Netlify adapters write the
policy into the generated function at build time. Either way, restart or rebuild after changing it.

## Or: `ws` on the app's own port

`devora start` does not expose the HTTP server it creates and has no hook. The function it calls,
`createNodeServer` from [`@devorajs/adapter-node`](../../adapters/adapter-node/README.md), is a public
export that returns the `http.Server`, so a script can call it and handle the WebSocket `upgrade`
itself, on the same port as the HTTP API. Tested on a local Node server with 0.3.4: a bad token
answered 401, a good one connected and echoed a message, and the API and its security headers were
unchanged. Not run on Vercel or Netlify, where it cannot work (a function cannot hold a connection).

```js
// Attach `ws` to the HTTP server `devora start` would create, by calling the same function
// the CLI calls (createNodeServer from @devorajs/adapter-node), which returns the http.Server.
// Run from the project root: node --env-file=.env lab-scripts/start-with-ws.mjs
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import { resolveAuthMode } from "@devorajs/core/config";
import { createNodeServer } from "@devorajs/adapter-node";
import { WebSocketServer } from "ws";

process.env.NODE_ENV = "production";
const root = process.cwd();
const project = await loadProjectConfig(root);
const app = project.apps.find((a) => a.name === "lab");
const appRoot = resolveAppDir(root, app.dir);
const cfg = await loadAppConfig(appRoot);
const server = createNodeServer({
  appRoot, appName: app.name, authMode: resolveAuthMode(project, app.name), domain: app.domain,
  security: cfg.security, sitemapEnabled: false, apiDir: cfg.apiDir, trustProxy: cfg.trustProxy,
  head: cfg.head, maxBodyBytes: cfg.maxBodyBytes, cors: cfg.cors, port: Number(process.env.PORT) || 4500,
});

// WebSocket upgrade on /ws, same port as the HTTP API. The upgrade request is a plain HTTP request:
// the session is checked here by calling the app's own GET /api/me over loopback with the same header.
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", async (req, socket, head) => {
  if (!req.url?.startsWith("/ws")) return socket.destroy();
  const token = new URL(req.url, "http://x").searchParams.get("token");
  const me = await fetch(`http://127.0.0.1:${server.address().port}/api/me`, { headers: { authorization: `Bearer ${token}` } });
  if (me.status !== 200) { socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n"); return socket.destroy(); }
  const { session } = await me.json();
  wss.handleUpgrade(req, socket, head, (ws) => { ws.user = session.username; wss.emit("connection", ws, req); });
});
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ hello: ws.user }));
  ws.on("message", (m) => { for (const c of wss.clients) if (c.readyState === 1) c.send(JSON.stringify({ from: ws.user, text: String(m) })); });
});
```

- Install `ws` and `@devorajs/adapter-node`, build the app, then run the script instead of
  `devora start` (it sets `NODE_ENV=production` itself, as `start` does).
- The script repeats what `start` does: it loads the project and app config and passes the same
  options. If `start` gains options, the script needs them too.
- The upgrade request does not go through the app's routes. This script checks the session by
  calling the app's own `GET /api/me` over loopback with the token; do the same check, or the
  connection is open to anyone.
- A server hook (an `onServer(server)` option) would remove the wrapper. It is planned, not built.

## Server-sent events do not work yet

An API route can set `Content-Type: text/event-stream`, but the handler returns its whole body as a
string and the server sends it in one piece when the handler finishes. Tested: three events produced
half a second apart arrived together after 1.5 seconds and the connection closed, so a browser
`EventSource` would reconnect over and over. Returning a stream, an async iterable or a Node
`Readable` as the body answers 500. Use polling or a realtime server until a route can return a stream.

For work that must happen outside a request, see [Background jobs](BACKGROUND-JOBS.md).

## Deploying it

- **The realtime server needs an always-on host**: a VPS, a container platform, a Fly.io/Render/
  Railway instance that does not sleep. A free tier that spins down after inactivity drops every
  connection and makes the first reconnect slow.
- **Behind nginx**, forward the upgrade headers (`devora generate:proxy --target=nginx` already
  writes `Upgrade` and `Connection "upgrade"` for the apps it proxies; add the same two lines to
  the realtime server's `location`). Caddy forwards WebSockets without extra settings.
- **One instance is fine to start.** Several instances need a shared adapter
  (`@socket.io/redis-adapter`) so a publish that lands on one instance reaches sockets connected
  to another. Without it, a user connected to instance B never sees an event published to A.
- **Keep the two secrets separate** (`REALTIME_TOKEN_SECRET`, `REALTIME_PUBLISH_SECRET`) and out of
  the browser. Rotating the token secret only invalidates 60-second tokens.
- **Reconnects ask for a new token.** The example's client passes `auth` as a function so every
  reconnect fetches a fresh one; a token captured once would expire mid-session.
- Always keep the polling fallback. Corporate proxies, a restarting realtime server, and a laptop
  waking from sleep all end in a dropped connection.

## What was verified, and what was not

Verified (see `examples/realtime/`, checked in CI by `examples/check.mjs`):

- The token route answers 401 without a login and a token with one.
- The realtime server rejects a missing, tampered and expired token, and accepts a good one.
- A `POST /publish` with the wrong secret is a 401; with the right secret, the event reaches the
  connected client of that user and not another user's.
- An order placed through the app's API reaches the connected browser through the realtime server.
- In a real browser (Playwright, Chromium, local production build): the dashboard shows "live" and
  an order placed in a second tab appears in the first within about 35 ms, without a reload. With
  the framework's default CSP, the same page logs `Connecting to 'http://localhost:4400/socket.io/...'
  violates the following Content Security Policy directive: "default-src 'self'"`, shows "polling
  every 5 s", and the order appears after the next poll (about 5 s).

Not verified:

- A deployment to any cloud host, behind a real reverse proxy, or with several realtime instances
  and a Redis adapter. Those paragraphs above describe how the pieces work; they were not run.
- Load: how many simultaneous connections one realtime process holds on your hardware.
