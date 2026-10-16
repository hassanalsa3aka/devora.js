# Backend benchmark report

Generated from `results/backend-raw-2026-10-16-published-0.3.5.json` (never edited by hand). Run: 2026-10-16T12:31:53.748Z.

Machine: Apple M5, 10 cores, 16 GB, Darwin 27.0.0 (darwin arm64), Node v24.19.0. Load tool: autocannon 8.0.0, 50 connections, 5 s warm-up, 5 runs of 10 s, median reported. The load tool and the server share one machine.

Contract: [backend/CONTRACT.md](../backend/CONTRACT.md). Every response was checked against it before measuring.

## Versions

| Framework | Version | Kind |
|---|---|---|
| Devora.js | 0.3.5 (core 0.3.5) | Devora.js backend-only app |
| Express 5 | 5.3.0 | backend framework |
| Fastify 5 | 5.12.7 | backend framework |
| Hono | 4.13.13 | backend framework |
| NestJS (Express platform) | 12.1.3 | backend framework |
| NestJS (Fastify platform) | 12.1.3 | backend framework |
| Next.js | 16.4.1 | full-stack framework, API route |
| SvelteKit | 3.0.1 | full-stack framework, API route |
| React Router | 8.4.0 | full-stack framework, API route |
| Astro | 7.3.8 | full-stack framework, API route |

## D. GET /api/items (JSON list, 100 items)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 66,678 (62,941–68,180) | 0 | 1 | 0 |
| 2 | Hono | 66,215 (65,210–66,644) | 0 | 1 | 0 |
| 3 | NestJS (Fastify platform) | 61,927 (61,377–62,305) | 0 | 1 | 0 |
| 4 | Devora.js | 49,529 (49,258–51,050) | 0 | 2 | 0 |
| 5 | Express 5 | 48,388 (46,477–48,499) | 1 | 1 | 0 |
| 6 | NestJS (Express platform) | 44,700 (43,626–44,979) | 1 | 2 | 0 |
| 7 | SvelteKit | 32,976 (30,394–33,430) | 1 | 2 | 0 |
| 8 | Astro | 19,844 (19,746–19,854) | 2 | 5 | 0 |
| 9 | React Router | 17,985 (17,109–18,087) | 2 | 4 | 0 |
| 10 | Next.js | 12,069 (11,565–12,195) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is behind 3 frameworks beyond its run-to-run spread (median 49,529 against 66,678 req/s, 26% lower).

## E. Authenticated GET (Bearer lookup, then JSON)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 134,383 (129,958–134,988) | 0 | 0 | 0 |
| 2 | Hono | 128,375 (123,418–129,440) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 119,165 (118,816–119,212) | 0 | 0 | 0 |
| 4 | Express 5 | 85,420 (84,529–88,282) | 0 | 1 | 0 |
| 5 | NestJS (Express platform) | 79,404 (79,159–80,480) | 0 | 1 | 0 |
| 6 | Devora.js | 77,228 (76,431–77,635) | 0 | 2 | 0 |
| 7 | SvelteKit | 50,291 (47,666–53,852) | 0 | 2 | 0 |
| 8 | Astro | 22,319 (21,877–22,690) | 2 | 5 | 0 |
| 9 | React Router | 21,080 (20,251–21,202) | 2 | 3 | 0 |
| 10 | Next.js | 13,216 (12,418–13,656) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is behind 5 frameworks beyond its run-to-run spread (median 77,228 against 134,383 req/s, 43% lower).

## F1. POST JSON, valid body (201)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 116,186 (113,568–116,617) | 0 | 0 | 0 |
| 2 | Hono | 106,772 (100,681–107,773) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 100,425 (100,192–100,797) | 0 | 0 | 0 |
| 4 | Express 5 | 75,395 (73,104–75,645) | 0 | 1 | 0 |
| 5 | Devora.js | 71,450 (69,767–74,167) | 0 | 2 | 0 |
| 6 | NestJS (Express platform) | 65,789 (65,293–66,128) | 0 | 1 | 0 |
| 7 | SvelteKit | 40,831 (38,706–42,029) | 1 | 3 | 0 |
| 8 | React Router | 22,318 (22,033–23,106) | 1 | 5 | 0 |
| 9 | Astro | 19,669 (19,282–20,072) | 2 | 5 | 0 |
| 10 | Next.js | 11,911 (11,389–12,377) | 3 | 8 | 0 |

Leader: **Fastify 5**. Devora.js is behind 3 frameworks beyond its run-to-run spread (median 71,450 against 116,186 req/s, 39% lower), and level with Express 5.

## F2. POST JSON, invalid body (422)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 115,901 (111,124–116,337) | 0 | 0 | 0 |
| 2 | Hono | 109,402 (108,931–109,699) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 77,152 (76,132–78,048) | 0 | 1 | 0 |
| 4 | Devora.js | 74,592 (70,423–75,302) | 0 | 1 | 0 |
| 5 | Express 5 | 73,545 (71,334–75,197) | 0 | 1 | 0 |
| 6 | NestJS (Express platform) | 53,860 (53,750–54,009) | 0 | 1 | 0 |
| 7 | SvelteKit | 42,003 (41,540–42,852) | 1 | 2 | 0 |
| 8 | React Router | 23,307 (23,028–23,576) | 1 | 4 | 0 |
| 9 | Astro | 20,059 (19,404–20,173) | 2 | 5 | 0 |
| 10 | Next.js | 11,929 (11,783–12,422) | 3 | 8 | 0 |

Leader: **Fastify 5**. Devora.js is behind 3 frameworks beyond its run-to-run spread (median 74,592 against 115,901 req/s, 36% lower), and level with Express 5.

## G. One awaited 2 ms step, then JSON

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Devora.js | 15,967 (15,348–17,436) | 2 | 5 | 0 |
| 2 | Fastify 5 | 15,455 (15,279–15,699) | 3 | 4 | 0 |
| 3 | Hono | 15,412 (15,332–15,512) | 3 | 4 | 0 |
| 4 | NestJS (Fastify platform) | 15,226 (15,106–15,541) | 3 | 4 | 0 |
| 5 | SvelteKit | 15,200 (15,056–15,947) | 3 | 5 | 0 |
| 6 | NestJS (Express platform) | 15,132 (15,035–15,331) | 3 | 5 | 0 |
| 7 | Express 5 | 14,972 (14,519–15,240) | 3 | 5 | 0 |
| 8 | Astro | 14,435 (14,230–14,685) | 3 | 6 | 0 |
| 9 | React Router | 13,317 (13,032–13,383) | 3 | 6 | 0 |
| 10 | Next.js | 13,293 (12,536–13,496) | 3 | 6 | 0 |

Devora.js is not behind anyone beyond the spread; it is level with Fastify 5, Hono, NestJS (Fastify platform), SvelteKit (median 15,967 req/s).

## Memory, start and build

| Framework | Idle MB | After load MB | Start ms (median) | Build cold ms | Build warm ms |
|---|---|---|---|---|---|
| Devora.js | 161 | 285 | 197 | 211 | 216 |
| Express 5 | 138 | 172 | 139 | 95 | 96 |
| Fastify 5 | 143 | 167 | 166 | 103 | 102 |
| Hono | 136 | 222 | 138 | 96 | 95 |
| NestJS (Express platform) | 171 | 258 | 227 | 366 | 357 |
| NestJS (Fastify platform) | 166 | 245 | 218 | 505 | 498 |
| Next.js | 175 | 395 | 232 | 1,912 | 1,204 |
| SvelteKit | 141 | 600 | 141 | 969 | 968 |
| React Router | 153 | 343 | 203 | 410 | 407 |
| Astro | 161 | 329 | 168 | 548 | 510 |

Backend frameworks written in plain JavaScript have no build step; their "build" is a no-op command.

## Response bytes on the wire

Body bytes, header bytes and `Content-Encoding` for one request per scenario, sent with only the load tool's headers (what the timed runs used) and with a browser's `Accept-Encoding: gzip, deflate, br`.

| Framework | Scenario | Load tool: body B / header B / encoding | Browser: body B / header B / encoding |
|---|---|---|---|
| Devora.js | items | 3966 / 340 / identity | 3966 / 340 / identity |
| Devora.js | me | 16 / 338 / identity | 16 / 338 / identity |
| Devora.js | postValid | 38 / 338 / identity | 38 / 338 / identity |
| Devora.js | postInvalid | 48 / 338 / identity | 48 / 338 / identity |
| Devora.js | slow | 43 / 338 / identity | 43 / 338 / identity |
| Express 5 | items | 3966 / 219 / identity | 3966 / 219 / identity |
| Express 5 | me | 16 / 216 / identity | 16 / 216 / identity |
| Express 5 | postValid | 38 / 216 / identity | 38 / 216 / identity |
| Express 5 | postInvalid | 48 / 216 / identity | 48 / 216 / identity |
| Express 5 | slow | 43 / 216 / identity | 43 / 216 / identity |
| Fastify 5 | items | 3966 / 154 / identity | 3966 / 154 / identity |
| Fastify 5 | me | 16 / 152 / identity | 16 / 152 / identity |
| Fastify 5 | postValid | 38 / 152 / identity | 38 / 152 / identity |
| Fastify 5 | postInvalid | 48 / 152 / identity | 48 / 152 / identity |
| Fastify 5 | slow | 43 / 152 / identity | 43 / 152 / identity |
| Hono | items | 3966 / 138 / identity | 3966 / 138 / identity |
| Hono | me | 16 / 136 / identity | 16 / 136 / identity |
| Hono | postValid | 38 / 136 / identity | 38 / 136 / identity |
| Hono | postInvalid | 48 / 136 / identity | 48 / 136 / identity |
| Hono | slow | 43 / 136 / identity | 43 / 136 / identity |
| NestJS (Express platform) | items | 3966 / 219 / identity | 3966 / 219 / identity |
| NestJS (Express platform) | me | 16 / 216 / identity | 16 / 216 / identity |
| NestJS (Express platform) | postValid | 38 / 216 / identity | 38 / 216 / identity |
| NestJS (Express platform) | postInvalid | 48 / 216 / identity | 48 / 216 / identity |
| NestJS (Express platform) | slow | 43 / 216 / identity | 43 / 216 / identity |
| NestJS (Fastify platform) | items | 3966 / 154 / identity | 3966 / 154 / identity |
| NestJS (Fastify platform) | me | 16 / 152 / identity | 16 / 152 / identity |
| NestJS (Fastify platform) | postValid | 38 / 152 / identity | 38 / 152 / identity |
| NestJS (Fastify platform) | postInvalid | 48 / 152 / identity | 48 / 152 / identity |
| NestJS (Fastify platform) | slow | 43 / 152 / identity | 43 / 152 / identity |
| Next.js | items | 3966 / 231 / identity | 3966 / 231 / identity |
| Next.js | me | 16 / 231 / identity | 16 / 231 / identity |
| Next.js | postValid | 38 / 231 / identity | 38 / 231 / identity |
| Next.js | postInvalid | 48 / 231 / identity | 48 / 231 / identity |
| Next.js | slow | 43 / 231 / identity | 43 / 231 / identity |
| SvelteKit | items | 3966 / 138 / identity | 3966 / 138 / identity |
| SvelteKit | me | 16 / 136 / identity | 16 / 136 / identity |
| SvelteKit | postValid | 38 / 136 / identity | 38 / 136 / identity |
| SvelteKit | postInvalid | 48 / 136 / identity | 48 / 136 / identity |
| SvelteKit | slow | 43 / 136 / identity | 43 / 136 / identity |
| React Router | items | 3966 / 182 / identity | 478 / 204 / br |
| React Router | me | 16 / 182 / identity | 20 / 204 / br |
| React Router | postValid | 38 / 182 / identity | 42 / 204 / br |
| React Router | postInvalid | 48 / 182 / identity | 48 / 204 / br |
| React Router | slow | 43 / 182 / identity | 46 / 204 / br |
| Astro | items | 3966 / 144 / identity | 3966 / 144 / identity |
| Astro | me | 16 / 144 / identity | 16 / 144 / identity |
| Astro | postValid | 38 / 144 / identity | 38 / 144 / identity |
| Astro | postInvalid | 48 / 144 / identity | 48 / 144 / identity |
| Astro | slow | 43 / 144 / identity | 43 / 144 / identity |

## Contract conformance

| Framework | items | me | postValid | postInvalid | slow |
|---|---|---|---|---|---|
| Devora.js | yes | yes | yes | yes | yes |
| Express 5 | yes | yes | yes | yes | yes |
| Fastify 5 | yes | yes | yes | yes | yes |
| Hono | yes | yes | yes | yes | yes |
| NestJS (Express platform) | yes | yes | yes | yes | yes |
| NestJS (Fastify platform) | yes | yes | yes | yes | yes |
| Next.js | yes | yes | yes | yes | yes |
| SvelteKit | yes | yes | yes | yes | yes |
| React Router | yes | yes | yes | yes | yes |
| Astro | yes | yes | yes | yes | yes |

## Where Devora.js is ahead, level or behind

A difference inside the run-to-run spread (ranges of the runs that overlap) is a tie.

Ahead of every other framework: no scenario.

Level: G (with Fastify 5, Hono, NestJS (Fastify platform), SvelteKit).

Behind: D (Fastify 5); E (Fastify 5); F1 (Fastify 5); F2 (Fastify 5).

Devora.js sends CSP, HSTS and X-Frame-Options on every response and runs a real session layer for the authenticated scenario; the bare backend frameworks do neither. See the header bytes above and `backend/CONTRACT.md`.

