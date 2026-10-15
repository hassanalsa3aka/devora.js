# Example: realtime

A logged-in dashboard that updates without a reload, using a small separate realtime server.
Devora.js has no built-in WebSockets (see `REALTIME.md` at the repo root for why and for the
deployment notes); this is the supported pattern, runnable.

```text
browser ── pages, /api/* ──▶ apps/app (Devora.js)  ── POST /publish ──▶ realtime/ (Socket.IO)
   ▲  GET /api/realtime-token (login required, 60 s token)                    │
   └────────────── connects with the token, receives "order" events ◀─────────┘
```

| Where | What |
|---|---|
| `apps/app/endpoints/realtime-token.ts` | 401 without a login; otherwise a 60-second HMAC token holding the user id |
| `apps/app/endpoints/orders.ts` | `GET` lists the caller's orders (the polling fallback); `POST` adds one (login + CSRF) and publishes it |
| `apps/app/components/LiveOrders.tsx` | The island: connects with a fresh token on every (re)connect, falls back to polling every 5 s |
| `apps/app/app.config.ts` | `security.csp` with `connect-src` for the realtime server — without it the browser blocks the connection |
| `packages/backend/realtimeToken.ts`, `realtime/token.mjs` | Issue and verify the token with `node:crypto`, no JWT library |
| `realtime/server.mjs` | The realtime process: verifies the token at connect, one room per user, `POST /publish` with a shared secret |

## Run it

```bash
npm ci
npm run dev                # the app on http://localhost:10000
npm run realtime           # in a second terminal: the realtime server on :4400
```

In dev the browser is on port 10000, so allow it: `REALTIME_ORIGINS=http://localhost:10000 npm run realtime`.
Log in with any username, place an order, and open the page in a second tab: the order appears in
both. Stop the realtime server and the page says "polling every 5 s" and keeps working.

Production: copy `.env.example`, set the secrets, then `npm run build && npm start` and
`NODE_ENV=production npm run realtime`.

## Checked

CI runs `node ../check.mjs` here: the token route answers 401 without a login; the realtime
server rejects a missing, tampered, wrongly signed and expired token; a publish with the wrong
secret is a 401 and with the right one reaches that user's connection only; an order placed through
the API reaches the connected client; the CSP names the realtime server.
