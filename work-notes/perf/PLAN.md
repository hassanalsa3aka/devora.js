# Performance plan, release/0.4.0-final (phase 3B)

**Measured in a cloud container: re-measure on local hardware before publishing.** Nothing here changes the live
/performance page.

## What already exists (read first)

- `benchmarks/` has a fair harness: pages A to C (`run.mjs`: Devora.js, Next.js, Astro, SvelteKit, React Router) and
  backend D to G (`run-backend.mjs`: Devora.js, Express 5, Fastify 5, Hono, NestJS on Express and on Fastify, and the
  API routes of Next.js, SvelteKit, React Router and Astro), fairness rules in `benchmarks/README.md`, the contract in
  `benchmarks/backend/CONTRACT.md`, results of published 0.3.4 and 0.3.5.
- The docs /performance page reads `apps/docs/data/benchmarks.json` and `backend-benchmarks.json`, copied by
  `scripts/sync-benchmarks.mjs` from those results.
- ROADMAP perf notes: S1 fixed in 0.3.5; S2 (behind Fastify, Hono, NestJS-Fastify on JSON), S3 (structuredClone
  in the memory session store, ~8% of an authenticated request), S4 (memory after load) open.

## Methodology (unchanged from the harness, so results compare with the published ones)

- One container, one Node (22.23.4) for every framework, `NODE_ENV=production`, each framework's documented
  production build and server, its defaults, no tuning; security defaults ON for Devora.js (CSRF, headers, body
  limits, timeouts, sessions). No "security off" row was made.
- autocannon, 50 connections, 5 s warm-up, then 5 runs of 10 s; median with min–max. Overlapping ranges are a tie.
- Build: 3 runs (backend) / cold and warm (pages). Start: 5 runs. Memory: RSS of the process tree, idle and after
  load. JavaScript sent: Chromium, gzip -9 and brotli 11.
- Raw JSON for every run in `benchmarks/results/` with the tag `container-2026-11-05-<framework>`; environment in
  each file (CPU model, cores, RAM, OS, Node, package versions).
- Devora.js measured twice: the published 0.3.5 packages (the apps' lockfiles) and this branch's build laid over them
  (`benchmarks/scripts/use-local-build.sh`), so the before/after is the same harness on the same machine.
- One framework at a time: `npm ci`, run, then its `node_modules` removed before the next (disk).

## Scope decisions (recorded, not hidden)

- The brief asks for more frameworks (Nuxt) and more scenarios (streaming, ISR hit, CRUD, WebSocket, cold start,
  install time, dev start/HMR, Node 20/24, Bun, package-manager build times). In the order of the brief's
  priorities and the usage left, this pass runs the existing 8 scenarios over the existing 10 frameworks first.
  Every extra row that is not measured is listed as "not measured" in RESULTS.md, never estimated.
- WebSocket: Devora.js has no WebSocket server by design; the row says "needs your own server" (docs: Live updates).
- Profiling: `node --cpu-prof` on the Devora.js API app under scenarios D and E; a fix ships only if it changes no
  behaviour and keeps every test green; anything else goes to ROADMAP with the profile evidence.

## Reproduce

```bash
cd benchmarks && npm ci
for app in apps/*; do (cd "$app" && npm ci); done
scripts/use-local-build.sh            # only to measure a working tree instead of the published packages
CHROME_PATH=<chromium> node run.mjs --tag=<name>
node run-backend.mjs --tag=<name>
```
