# Backend benchmark contract

Every app in `apps/` implements the same HTTP API, written in that framework's own idiom and run
with its documented production setup and defaults. The harness (`run-backend.mjs`) checks every
response against this contract before measuring; an app that does not match is reported, not
benchmarked.

| Scenario | Request | Response |
|---|---|---|
| D | `GET /api/items` | `200`, JSON `{"items":[100 objects {id, name, price}]}`, the same payload everywhere |
| E | `GET /api/me`, `Authorization: Bearer <token from POST /api/session>` | `200`, `{"user":"bench"}`; without a valid token `401`, `{"error":"unauthorized"}` |
| F valid | `POST /api/items` `{"name":"Bench","price":9.5}` | `201`, `{"id":<n>,"name":"Bench","price":9.5}` |
| F invalid | `POST /api/items` `{"name":"","price":-1}` | `422`, `{"error":"validation","fields":["name","price"]}` |
| G | `GET /api/slow` | `200`, `{"item":{...}}` after one awaited 2 ms timer (a stand-in for a database round trip) |
| setup | `POST /api/session` `{"username":"bench"}` | `201`, `{"token":"..."}` |

Rules:

- Validation is the same hand-written function in every app (`name` is a string of 1 to 50
  characters, `price` a number >= 0). No validation library is used by any app.
- Sessions: each app keeps an in-memory token table. Devora.js uses its real session layer
  (`ctx.setSession` with the Bearer transport and the `memory` store, `ctx.session`); that layer does
  more work per request (idle and active expiry checks, cookie-binding checks, headers) than a bare
  `Map` lookup. That difference is part of what is measured and is reported, not removed.
- Security defaults stay at each framework's documented defaults. Devora.js sends CSP, HSTS and
  X-Frame-Options on every response; most others send none. The report lists response header bytes.
- No logging is enabled in any app (Nest `logger: false`, Fastify default, etc.).
