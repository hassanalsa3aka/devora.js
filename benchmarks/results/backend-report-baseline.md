# Backend benchmark report

Generated from `results/backend-raw-2026-10-16-baseline.json` (never edited by hand). Run: 2026-10-16T04:25:16.252Z.

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
| 1 | Hono | 63,741 (61,840–64,031) | 0 | 1 | 0 |
| 2 | Fastify 5 | 63,539 (62,721–65,632) | 0 | 1 | 0 |
| 3 | NestJS (Fastify platform) | 60,115 (59,481–62,282) | 0 | 1 | 0 |
| 4 | NestJS (Express platform) | 44,906 (44,833–45,087) | 1 | 2 | 0 |
| 5 | Express 5 | 36,167 (35,778–36,400) | 1 | 2 | 0 |
| 6 | SvelteKit | 33,203 (33,151–33,572) | 1 | 2 | 0 |
| 7 | Devora.js | 30,524 (26,001–37,802) | 1 | 3 | 0 |
| 8 | Astro | 19,523 (19,497–19,534) | 2 | 5 | 0 |
| 9 | React Router | 17,663 (17,579–17,751) | 2 | 4 | 0 |
| 10 | Next.js | 11,397 (10,280–11,853) | 3 | 9 | 0 |

Leader: **Hono**. Devora.js is 7 of 10, 52% below the leader (30,524 against 63,741 req/s).

## E. Authenticated GET (Bearer lookup, then JSON)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 128,532 (124,675–129,103) | 0 | 0 | 0 |
| 2 | Hono | 126,892 (124,861–127,450) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 112,096 (110,839–112,282) | 0 | 0 | 0 |
| 4 | NestJS (Express platform) | 75,191 (71,646–76,273) | 0 | 1 | 0 |
| 5 | Express 5 | 58,721 (40,451–62,625) | 0 | 1 | 0 |
| 6 | SvelteKit | 53,014 (49,770–55,097) | 0 | 1 | 0 |
| 7 | Devora.js | 43,169 (42,768–43,347) | 1 | 2 | 0 |
| 8 | Astro | 22,652 (22,459–22,747) | 2 | 4 | 0 |
| 9 | React Router | 20,495 (19,302–20,825) | 2 | 4 | 0 |
| 10 | Next.js | 13,256 (13,213–13,319) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 7 of 10, 66% below the leader (43,169 against 128,532 req/s).

## F1. POST JSON, valid body (201)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 110,467 (109,751–111,584) | 0 | 0 | 0 |
| 2 | Hono | 106,575 (102,886–108,681) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 96,125 (79,927–96,544) | 0 | 1 | 0 |
| 4 | Express 5 | 66,454 (51,332–77,309) | 0 | 1 | 0 |
| 5 | NestJS (Express platform) | 65,466 (64,816–65,668) | 0 | 1 | 0 |
| 6 | Devora.js | 43,981 (33,708–44,284) | 1 | 2 | 0 |
| 7 | SvelteKit | 41,846 (39,369–41,881) | 1 | 2 | 0 |
| 8 | React Router | 23,368 (23,180–23,448) | 1 | 4 | 0 |
| 9 | Astro | 19,788 (19,756–19,925) | 2 | 5 | 0 |
| 10 | Next.js | 11,941 (11,891–11,973) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 6 of 10, 60% below the leader (43,981 against 110,467 req/s).

## F2. POST JSON, invalid body (422)

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Fastify 5 | 111,677 (111,281–111,991) | 0 | 0 | 0 |
| 2 | Hono | 107,558 (106,336–108,244) | 0 | 0 | 0 |
| 3 | NestJS (Fastify platform) | 76,628 (68,720–77,681) | 0 | 1 | 0 |
| 4 | Express 5 | 73,981 (73,097–74,388) | 0 | 1 | 0 |
| 5 | NestJS (Express platform) | 54,073 (53,831–54,303) | 0 | 1 | 0 |
| 6 | Devora.js | 43,036 (35,901–43,367) | 1 | 2 | 0 |
| 7 | SvelteKit | 42,038 (41,661–42,186) | 1 | 2 | 0 |
| 8 | React Router | 23,393 (23,303–23,544) | 1 | 5 | 0 |
| 9 | Astro | 19,765 (19,645–19,900) | 2 | 5 | 0 |
| 10 | Next.js | 11,944 (10,993–11,982) | 3 | 7 | 0 |

Leader: **Fastify 5**. Devora.js is 6 of 10, 61% below the leader (43,036 against 111,677 req/s).

## G. One awaited 2 ms step, then JSON

| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |
|---|---|---|---|---|---|
| 1 | Devora.js | 17,752 (16,969–17,820) | 2 | 4 | 0 |
| 2 | Express 5 | 15,500 (14,771–16,404) | 3 | 5 | 0 |
| 3 | NestJS (Express platform) | 15,291 (15,116–16,035) | 3 | 5 | 0 |
| 4 | Hono | 15,159 (14,812–15,632) | 3 | 5 | 0 |
| 5 | Fastify 5 | 15,118 (14,920–15,220) | 3 | 4 | 0 |
| 6 | SvelteKit | 14,683 (14,528–14,833) | 3 | 5 | 0 |
| 7 | Astro | 14,354 (13,923–14,584) | 3 | 5 | 0 |
| 8 | NestJS (Fastify platform) | 14,069 (14,042–14,211) | 3 | 5 | 0 |
| 9 | React Router | 13,277 (12,245–13,395) | 3 | 6 | 0 |
| 10 | Next.js | 12,941 (12,640–12,971) | 3 | 7 | 0 |

Devora.js is first (17,752 req/s).

## Memory, start and build

| Framework | Idle MB | After load MB | Start ms (median) | Build cold ms | Build warm ms |
|---|---|---|---|---|---|
| Devora.js | 161 | 276 | 198 | 222 | 219 |
| Express 5 | 138 | 218 | 139 | 101 | 99 |
| Fastify 5 | 143 | 178 | 166 | 101 | 101 |
| Hono | 136 | 201 | 139 | 103 | 106 |
| NestJS (Express platform) | 171 | 249 | 220 | 368 | 366 |
| NestJS (Fastify platform) | 166 | 239 | 245 | 513 | 517 |
| Next.js | 175 | 410 | 241 | 1,956 | 1,233 |
| SvelteKit | 142 | 614 | 141 | 972 | 1,000 |
| React Router | 153 | 345 | 178 | 407 | 406 |
| Astro | 161 | 347 | 169 | 588 | 546 |

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

Devora.js is first in: G. Behind in: D (Hono, 52% ahead); E (Fastify 5, 66% ahead); F1 (Fastify 5, 60% ahead); F2 (Fastify 5, 61% ahead).

Devora.js sends CSP, HSTS and X-Frame-Options on every response and runs a real session layer for the authenticated scenario; the bare backend frameworks do neither. See the header bytes above and `backend/CONTRACT.md`.

