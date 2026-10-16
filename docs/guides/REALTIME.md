# Live updates in Devora.js

Devora.js has no built-in WebSockets or server-sent events. API routes return one whole response
(`{ status, headers, body }`, one `Set-Cookie`), so nothing can be streamed from them, and
serverless platforms (Vercel, Netlify) cannot hold a connection open anyway. This page is the
supported answer: poll, or run a small separate realtime server next to your app.

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
