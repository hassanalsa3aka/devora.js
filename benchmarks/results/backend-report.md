# Backend benchmark report

Generated from `results/backend-raw-2026-10-16-after.json` (never edited by hand). Run: 2026-10-16T06:18:01.585Z.

Machine: Apple M5, 10 cores, 16 GB, Darwin 27.0.0 (darwin arm64), Node v24.19.0. Load tool: autocannon 8.0.0, 50 connections, 5 s warm-up, 5 runs of 10 s, median reported. The load tool and the server share one machine.

Contract: [backend/CONTRACT.md](../backend/CONTRACT.md). Every response was checked against it before measuring.

## Versions

| Framework | Version | Kind |
|---|---|---|
| Devora.js | 0.3.4 (core 0.3.4) | Devora.js backend-only app |
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
| 1 | Fastify 5 | 66,054 (65,177–67,425) | 0 | 1 | 0 |
| 2 | Hono | 65,542 (64,359–66,464) | 0 | 1 | 0 |
| 3 | NestJS (Fastify platform) | 61,599 (61,357–63,097) | 0 | 1 | 0 |
| 4 | Devora.js | 51,440 (50,881–51,524) | 0 | 2 | 0 |
| 5 | Express 5 | 48,191 (48,176–48,452) | 1 | 2 | 0 |
| 6 | NestJS (Express platform) | 44,467 (44,394–44,761) | 1 | 2 | 0 |
| 7 | SvelteKit | 33,441 (33,383–33,933) | 1 | 2 | 0 |
| 8 | Astro | 19,845 (19,764–19,854) | 2 | 5 | 0 |
| 9 | React Router | 17,854 (17,817–17,899) | 2 | 4 | 0 |
| 10 | Next.js | 12,083 (12,051–12,125) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 4 of 10, 22% below the leader (51,440 against 66,054 req/s).

## E. Authenticated GET (Bearer lookup, then JSON)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 129,783 (129,571–130,461) | 0 | 0 | 0 |
| 2 | Hono | 127,636 (126,473–128,579) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 113,999 (113,719–114,772) | 0 | 0 | 0 |
| 4 | Express 5 | 87,136 (86,653–87,532) | 0 | 1 | 0 |
| 5 | NestJS (Express platform) | 77,664 (77,420–77,926) | 0 | 1 | 0 |
| 6 | Devora.js | 77,059 (76,733–77,431) | 0 | 2 | 0 |
| 7 | SvelteKit | 55,108 (51,418–55,821) | 0 | 1 | 0 |
| 8 | Astro | 23,130 (22,953–23,317) | 2 | 4 | 0 |
| 9 | React Router | 21,042 (20,978–21,084) | 2 | 3 | 0 |
| 10 | Next.js | 13,552 (13,537–13,570) | 3 | 6 | 0 |

Leader: **Fastify 5**. Devora.js is 6 of 10, 41% below the leader (77,059 against 129,783 req/s).

## F1. POST JSON, valid body (201)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 112,620 (110,717–114,004) | 0 | 0 | 0 |
| 2 | Hono | 105,452 (105,103–105,946) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 96,730 (96,125–96,899) | 0 | 1 | 0 |
| 4 | Express 5 | 74,359 (74,103–74,743) | 0 | 1 | 0 |
| 5 | Devora.js | 73,446 (72,806–73,551) | 0 | 1 | 0 |
| 6 | NestJS (Express platform) | 64,534 (60,860–65,177) | 0 | 1 | 0 |
| 7 | SvelteKit | 42,276 (41,034–42,522) | 1 | 2 | 0 |
| 8 | React Router | 23,362 (23,272–23,422) | 1 | 4 | 0 |
| 9 | Astro | 20,511 (20,453–20,599) | 2 | 5 | 0 |
| 10 | Next.js | 12,288 (12,276–12,297) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 5 of 10, 35% below the leader (73,446 against 112,620 req/s).

## F2. POST JSON, invalid body (422)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 112,765 (112,463–115,005) | 0 | 0 | 0 |
| 2 | Hono | 105,853 (105,457–106,406) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 76,884 (76,436–77,356) | 0 | 1 | 0 |
| 4 | Express 5 | 74,545 (74,010–74,639) | 0 | 1 | 0 |
| 5 | Devora.js | 73,818 (73,673–74,144) | 0 | 1 | 0 |
| 6 | NestJS (Express platform) | 54,079 (53,994–54,244) | 0 | 1 | 0 |
| 7 | SvelteKit | 42,435 (42,240–42,512) | 1 | 2 | 0 |
| 8 | React Router | 23,534 (23,263–23,583) | 1 | 4 | 0 |
| 9 | Astro | 20,559 (20,550–20,629) | 2 | 5 | 0 |
| 10 | Next.js | 12,298 (12,283–12,328) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 5 of 10, 35% below the leader (73,818 against 112,765 req/s).

## G. One awaited 2 ms step, then JSON

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Devora.js | 15,476 (15,193–15,537) | 3 | 5 | 0 |
| 2 | Fastify 5 | 15,044 (14,982–15,505) | 3 | 4 | 0 |
| 3 | Hono | 14,949 (14,881–15,029) | 3 | 4 | 0 |
| 4 | NestJS (Express platform) | 14,816 (14,722–14,904) | 3 | 5 | 0 |
| 5 | Express 5 | 14,812 (14,638–14,918) | 3 | 5 | 0 |
| 6 | NestJS (Fastify platform) | 14,791 (14,681–15,022) | 3 | 5 | 0 |
| 7 | SvelteKit | 14,576 (14,507–14,641) | 3 | 5 | 0 |
| 8 | Astro | 13,924 (13,789–13,934) | 3 | 6 | 0 |
| 9 | Next.js | 13,506 (13,476–13,546) | 3 | 6 | 0 |
| 10 | React Router | 12,565 (12,541–12,745) | 3 | 6 | 0 |

Devora.js is first (15,476 req/s).

## Memory, start and build

| Framework | Idle MB | After load MB | Start ms (median) | Build cold ms | Build warm ms |
|---|---|---|---|---|---|
| Devora.js | 161 | 352 | 174 | 220 | 222 |
| Express 5 | 138 | 243 | 143 | 95 | 94 |
| Fastify 5 | 143 | 211 | 143 | 97 | 97 |
| Hono | 136 | 262 | 140 | 96 | 96 |
| NestJS (Express platform) | 170 | 264 | 223 | 369 | 367 |
| NestJS (Fastify platform) | 166 | 243 | 226 | 515 | 502 |
| Next.js | 175 | 433 | 234 | 1,908 | 1,205 |
| SvelteKit | 141 | 1,249 | 145 | 995 | 983 |
| React Router | 153 | 419 | 179 | 410 | 397 |
| Astro | 161 | 482 | 171 | 545 | 521 |

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

## Where Devora.js is first and where it is behind

Devora.js is first in: G. Behind in: D (Fastify 5, 22% ahead); E (Fastify 5, 41% ahead); F1 (Fastify 5, 35% ahead); F2 (Fastify 5, 35% ahead).

Devora.js sends CSP, HSTS and X-Frame-Options on every response and runs a real session layer for the authenticated scenario; the bare backend frameworks do neither. See the header bytes above and `backend/CONTRACT.md`.

