# Performance results, release/0.4.0-final (phase 3B)

**Measured in a cloud container: relative only. Re-measure on local hardware before publishing any of these
numbers.** Nothing here changed the live /performance page.

Machine: Intel Xeon @ 2.10 GHz, 4 cores, 16 GB, Linux 6.18 (x64), Node 22.23.4, one container for every framework,
load tool on the same machine. Harness: `benchmarks/` unchanged (autocannon, 50 connections, 5 s warm-up, 5 runs of
10 s, median with min–max; overlapping ranges are a tie). Raw data: `benchmarks/results/*-2026-11-05-container-*.json`
(one file per framework run, plus the merged `backend-raw-2026-11-05-container-{0.3.5,branch}.json` and
`raw-2026-11-05-container-{0.3.5,branch}.json`). Versions: Next.js 16.4.1, Astro 7.3.8, SvelteKit 3.0.1, React
Router 8.4.0, Express 5.3.0, Fastify 5.12.7, Hono 4.13.13, NestJS 12.1.3 (each app's lockfile). Security defaults
stayed on for Devora.js (CSRF, headers, body limits, timeouts, sessions); no "security off" row was measured.

The Devora.js "branch build" is this branch laid over the published 0.3.5 packages
(`benchmarks/scripts/use-local-build.sh`), measured before the two optimizations below, with the request-handling
code of phase 4. The report labels it with the installed package version (0.3.5); that label is wrong for this run.

## Ranking per scenario (branch build, before the phase 3B optimizations)

### A. Pre-rendered page

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Devora.js (release/0.4.0-final build) | 28,799 (27,291–29,414) |
| 2 | Astro 7.3.8 | 6,739 (6,618–6,764) |
| 3 | SvelteKit 3.0.1 | 6,513 (6,334–6,856) |
| 4 | React Router 8.4.0 | 3,628 (3,534–3,704) |
| 5 | Next.js 16.4.1 | 1,578 (1,437–1,700) |

### B. Server-rendered page (100 items)

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Devora.js (release/0.4.0-final build) | 3,778 (3,567–3,952) |
| 2 | SvelteKit 3.0.1 | 1,314 (1,263–1,334) |
| 3 | Astro 7.3.8 | 1,291 (1,228–1,294) |
| 4 | React Router 8.4.0 | 543 (527–570) |
| 5 | Next.js 16.4.1 | 318 (298–324) |

### C. Form POST

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Devora.js (release/0.4.0-final build) | 15,618 (15,198–17,422) |
| 2 | SvelteKit 3.0.1 | 5,583 (5,460–5,716) |
| 3 | Astro 7.3.8 | 2,440 (2,210–2,606) |
| 4 | React Router 8.4.0 | 1,862 (1,752–1,994) |
| 5 | Next.js 16.4.1 | 758 (706–787) |

### Pages apps: build, start, memory, JavaScript sent

| Framework | Build cold ms | Start ms | Idle MB | After load MB | JS sent /items, gzip B | Hydration ms |
|---|---|---|---|---|---|---|
| Devora.js (release/0.4.0-final build) | 1,228 | 333 | 161 | 247 | 46,657 | 79 |
| Astro 7.3.8 | 2,165 | 350 | 158 | 676 | 69,060 | 78 |
| Next.js 16.4.1 | 5,239 | 538 | 156 | 352 | 135,218 | 123 |
| React Router 8.4.0 | 1,381 | 334 | 147 | 273 | 111,241 | 110 |
| SvelteKit 3.0.1 | 3,211 | 226 | 132 | 265 | 34,209 | 84 |

### D. JSON list

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Hono | 19,204 (18,267–19,737) |
| 2 | Fastify 5 | 19,019 (18,403–19,287) |
| 3 | NestJS (Fastify platform) | 17,900 (16,139–18,083) |
| 4 | Devora.js (release/0.4.0-final build) | 13,372 (12,966–13,730) |
| 5 | SvelteKit | 7,350 (7,260–7,566) |
| 6 | Express 5 | 7,051 (6,820–7,598) |
| 7 | NestJS (Express platform) | 5,612 (5,305–5,712) |
| 8 | Astro | 3,633 (2,495–3,695) |
| 9 | React Router | 1,642 (1,626–1,682) |
| 10 | Next.js | 1,246 (1,196–1,274) |

### E. Authenticated GET

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Fastify 5 | 47,408 (43,251–53,869) |
| 2 | Hono | 40,138 (39,034–41,001) |
| 3 | NestJS (Fastify platform) | 30,681 (29,377–32,202) |
| 4 | Devora.js (release/0.4.0-final build) | 17,995 (17,384–19,506) |
| 5 | Express 5 | 9,201 (8,888–9,366) |
| 6 | SvelteKit | 8,202 (5,194–8,810) |
| 7 | NestJS (Express platform) | 7,185 (7,103–7,561) |
| 8 | Astro | 4,044 (3,923–4,323) |
| 9 | React Router | 1,786 (1,395–1,817) |
| 10 | Next.js | 1,290 (1,270–1,317) |

### F1. POST, valid body

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Fastify 5 | 26,706 (25,932–28,497) |
| 2 | Hono | 25,297 (24,450–26,405) |
| 3 | NestJS (Fastify platform) | 21,922 (21,075–22,734) |
| 4 | Devora.js (release/0.4.0-final build) | 16,425 (15,730–16,608) |
| 5 | Express 5 | 7,088 (6,812–7,369) |
| 6 | NestJS (Express platform) | 6,018 (5,844–6,342) |
| 7 | SvelteKit | 5,899 (5,684–6,185) |
| 8 | Astro | 2,826 (2,784–3,006) |
| 9 | React Router | 1,736 (1,679–1,823) |
| 10 | Next.js | 1,082 (911–1,103) |

### F2. POST, invalid body

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Fastify 5 | 27,829 (26,233–28,929) |
| 2 | Hono | 26,103 (25,326–27,496) |
| 3 | Devora.js (release/0.4.0-final build) | 16,569 (15,831–17,381) |
| 4 | NestJS (Fastify platform) | 16,489 (16,385–17,287) |
| 5 | Express 5 | 7,319 (6,957–7,761) |
| 6 | SvelteKit | 5,864 (5,507–5,992) |
| 7 | NestJS (Express platform) | 4,967 (4,896–5,374) |
| 8 | Astro | 2,872 (2,701–2,989) |
| 9 | React Router | 1,733 (1,712–1,759) |
| 10 | Next.js | 1,085 (1,065–1,138) |

### G. One awaited 2 ms step

| # | Framework | Requests/s, median (min–max) |
|---|---|---|
| 1 | Fastify 5 | 16,533 (15,860–16,845) |
| 2 | NestJS (Fastify platform) | 15,177 (14,159–15,404) |
| 3 | Hono | 14,974 (14,654–15,252) |
| 4 | Devora.js (release/0.4.0-final build) | 13,591 (13,546–14,151) |
| 5 | SvelteKit | 8,663 (8,283–8,798) |
| 6 | Express 5 | 7,915 (7,634–8,330) |
| 7 | NestJS (Express platform) | 7,797 (7,393–7,903) |
| 8 | Astro | 4,785 (4,578–4,870) |
| 9 | React Router | 2,357 (2,273–2,521) |
| 10 | Next.js | 1,905 (1,782–1,982) |


## Devora.js: published 0.3.5 against this branch

| Scenario | Sequential harness runs, 0.3.5 → branch | Interleaved A/B, 5 runs each, 0.3.5 → branch | Verdict |
|---|---|---|---|
| D. JSON list | 15,428 → 13,372 (−13%) | 14,820 (14,344–15,364) → 14,833 (14,360–15,253) | Tie. The −13% was drift between two runs 10 minutes apart |
| F1. POST valid | 17,405 → 16,425 | 17,918 (17,318–18,514) → 17,457 (16,065–18,367) | Tie |
| E, F2, G | ranges overlap | not re-run | Tie |
| B. SSR page | 3,947 → 3,778 | 3,978 (3,819–4,271) → 4,210 (3,662–4,511) | Tie |
| C. Form POST | 19,054 → 15,618 (−18%) | 18,699 (10,299–19,282) → 15,939 (15,804–16,344) | **Slower, real**: cause found and fixed below |

Lesson for the harness: on a shared machine, frameworks measured minutes apart drift by 10% or more. An A/B of two
builds should be interleaved (`work-notes/perf/scripts/ab.mjs`), and a cross-framework ranking read with that
spread in mind.

## Profiled, fixed (each its own commit, no behaviour change, full suite green)

| Commit | Profile finding | Cause | Before → after (interleaved, 5 runs) |
|---|---|---|---|
| `483d7d4` | `warnIfSessionReadWithoutAuth` 1.5% of all CPU on GET /api/items in production | its first line read `process.env.NODE_ENV` (a native lookup) on every request | D 14,013 (13,214–14,606) → 14,177 (14,109–14,700), +1.2%, inside the spread: CPU gone, throughput within noise |
| `d749abc` | `redirectRefusal` about 8% of all CPU on a form POST that redirects (2.1% self, 5.4% native URL parsing, 0.9% URL objects) | the 0.4.0 open-redirect check (H4) parsed every target up to four times, twice per redirect | C 16,402 (15,120–16,686) → 17,767 (17,695–17,941), **+8.3%**, beyond the spread; B inside the spread |

After `d749abc`, the form POST is about 5% below published 0.3.5 measured the same way (17,767 against 18,699).
The rest is the 0.4.0 security work on that path (form part counting, CSRF default check, nosniff); not changed.

## What stays slower, and why

- **JSON scenarios D to G: 4th of 10** (3rd on F2, tied with NestJS on Fastify), behind Fastify, Hono and NestJS on
  Fastify. Profile of D: the app's own `JSON.stringify` is 26% and the socket write 27% of all CPU (the same in every
  framework); Devora.js's own code is about 10 to 12%: a request context with session and CSRF methods, security
  headers on every response, route matching. The bare frameworks do none of that. Finding S2, still open.
- **E (authenticated GET): 18,000 against 47,000 for Fastify.** Devora.js runs its real session layer (a store
  lookup, cookie and Bearer handling; the memory store clones each record, finding S3); the others look up a `Map`.
  Not changed: S3 needs a decision on mutability.
- **Memory after load:** 248 MB for the API app, against 156 to 197 MB for Hono, Fastify, NestJS on Fastify and
  Express (finding S4, open).
- **Pages:** Devora.js is 1st on A, B and C in this container, and has the shortest cold build of the five
  (1,228 ms; React Router 1,381 ms). SvelteKit starts faster (226 ms against 333 ms), uses less idle memory
  (132 MB against 161 MB) and sends less JavaScript on /items (34,209 B against 46,657 B gzip).

## Not measured (and why)

- Nuxt: not in the harness; adding a framework fairly means writing its three pages and the API to the contract
  (benchmarks/backend/CONTRACT.md) and checking them; not done in this pass.
- Streaming response, ISR cache hit, REST CRUD, cold start, install time, dev server start and HMR, Node 20/24,
  Bun, npm/Yarn/pnpm build times: not run in this pass (time). Nothing is estimated in their place.
- WebSocket: Devora.js has no WebSocket server by design. The row is "needs your own server" (docs: Live updates).

## Plan for 0.4.1 and later

1. Interleave the harness (run each framework's scenarios in alternation, or at least Devora.js twice, first and
   last) so drift shows up as spread instead of a ranking.
2. S3: decide whether the memory store may return the stored record (frozen) instead of a clone.
3. Form POST: count URL-encoded fields in the same pass as parsing; measure the CSRF default and nosniff costs
   separately (a labelled "security off" row for Devora.js only).
4. Add the missing scenarios above, Node 20/24 and Bun, and Nuxt, on local hardware.
