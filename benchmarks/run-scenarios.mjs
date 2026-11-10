#!/usr/bin/env node
/**
 * Extra scenarios for the pages-suite apps (same apps and same `npm start` as run.mjs, so build first with run.mjs or the
 * apps' own build):
 *
 *   cold      time from `npm start` to the first byte of the first server-rendered page (/items), and the time that first
 *             response takes on its own (what the first visitor waits for after the server says it is up)
 *   ttfb      time to first byte of /items, one request at a time, 300 requests after a warm-up: p50, p99, max
 *   conn1000  1,000 concurrent connections on /static and on /items (10 s, autocannon), with the server's memory after
 *
 * Streaming first chunk, incremental static regeneration hits, multipart upload and WebSocket need a route in every app and
 * are not measured here: see docs in benchmarks/README.md for what each framework would have to implement.
 *
 * Usage: node run-scenarios.mjs [--only=devora-pages-vite,next] [--runs=5] [--port=4400]
 *   CHROME_PATH is not needed. Writes results/scenarios-<date>.json.
 */
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import autocannon from "autocannon";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const PORT = Number(args.port ?? 4400);
const RUNS = Number(args.runs ?? 5);
const ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const KEYS = ["devora-pages-vite", "devora-pages-sekhem", "next", "astro", "sveltekit", "react-router", "nuxt"].filter((k) => !args.only || args.only.split(",").includes(k));
const NAMES = { "devora-pages-vite": "Devora.js with Vite", "devora-pages-sekhem": "Devora.js with Sekhem", next: "Next.js", astro: "Astro", sveltekit: "SvelteKit", "react-router": "React Router", nuxt: "Nuxt" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sorted = (xs) => [...xs].sort((a, b) => a - b);
const pct = (xs, p) => sorted(xs)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const median = (xs) => pct(xs, 50);
const summary = (xs) => ({ median: median(xs), min: Math.min(...xs), max: Math.max(...xs), runs: xs });

function treeRssKb(pid) {
  let total = 0;
  const visit = (p) => {
    try { total += Number(execFileSync("ps", ["-o", "rss=", "-p", String(p)]).toString().trim()) || 0; } catch {}
    let kids = [];
    try { kids = execFileSync("pgrep", ["-P", String(p)]).toString().trim().split("\n").filter(Boolean); } catch {}
    kids.forEach(visit);
  };
  visit(pid);
  return total;
}

/** One GET, timed to the first byte and to the end. */
function timed(p) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const req = http.request({ host: "localhost", port: PORT, path: p, headers: { accept: ACCEPT }, agent: false }, (res) => {
      let first = 0;
      res.once("data", () => (first = performance.now() - t0));
      res.on("data", () => {});
      res.on("end", () => resolve({ status: res.statusCode, firstByteMs: first || performance.now() - t0, totalMs: performance.now() - t0 }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function portFree() {
  for (let i = 0; i < 200; i++) {
    try { await timed("/"); await sleep(50); } catch { return; }
  }
  throw new Error(`port ${PORT} is still in use`);
}

function stop(child) {
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 3000).unref();
}

async function spawnServer(dir) {
  await portFree();
  const t0 = performance.now();
  const child = spawn("npm", ["start"], { cwd: dir, detached: true, stdio: "ignore", env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" } });
  // wait until the port answers, without sending any page request (so /items is untouched): a TCP connect is enough
  const open = () => new Promise((resolve) => { const s = http.get({ host: "localhost", port: PORT, path: "/__nonexistent_probe__", agent: false }, (r) => { r.resume(); r.on("end", () => resolve(true)); }); s.on("error", () => resolve(false)); });
  for (let i = 0; i < 1200; i++) {
    if (await open()) return { child, upMs: performance.now() - t0, t0 };
    await sleep(10);
  }
  stop(child);
  throw new Error(`${dir}: server never answered`);
}

const results = { date: new Date().toISOString(), machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()} (${process.platform} ${process.arch})`, node: process.version }, config: { runs: RUNS, ttfbRequests: 300, connections: 1000, loadSeconds: 10 }, frameworks: {} };

for (const key of KEYS) {
  const dir = path.join(HERE, "apps", key);
  console.log(`\n== ${NAMES[key]}`);
  const r = { name: NAMES[key] };

  // cold: a fresh server each run; the first page request is /items
  const coldFirstByte = [];
  const firstPage = [];
  for (let i = 0; i < RUNS; i++) {
    const s = await spawnServer(dir);
    const reqStart = performance.now();
    const first = await timed("/items");
    if (first.status !== 200) throw new Error(`${key}: /items answered ${first.status}`);
    firstPage.push(first.firstByteMs);
    coldFirstByte.push(reqStart - s.t0 + first.firstByteMs);
    stop(s.child);
    await sleep(300);
  }
  r.cold = { startToFirstPageByteMs: summary(coldFirstByte), firstPageRequestMs: summary(firstPage) };
  console.log(`cold: start to first page byte ${Math.round(r.cold.startToFirstPageByteMs.median)} ms, first page request ${Math.round(r.cold.firstPageRequestMs.median)} ms`);

  // ttfb and 1,000 connections on one running server
  const s = await spawnServer(dir);
  try {
    for (let i = 0; i < 100; i++) await timed("/items");
    const ttfb = [];
    for (let i = 0; i < 300; i++) ttfb.push((await timed("/items")).firstByteMs);
    r.ttfb = { p50: pct(ttfb, 50), p99: pct(ttfb, 99), max: Math.max(...ttfb) };
    console.log(`ttfb /items: p50 ${r.ttfb.p50.toFixed(2)} ms, p99 ${r.ttfb.p99.toFixed(2)} ms`);

    r.conn1000 = {};
    for (const [name, p] of [["static", "/static"], ["items", "/items"]]) {
      const rps = [];
      const errors = [];
      const non2xx = [];
      const p99 = [];
      for (let i = 0; i < 2; i++) {
        if (i > 0) await sleep(35000); // let the closed connections leave TIME_WAIT: the next run must not run out of local ports
        const out = await new Promise((resolve, reject) => autocannon({ url: `http://localhost:${PORT}${p}`, connections: 1000, duration: 10, pipelining: 1, headers: { accept: ACCEPT } }, (e, x) => (e ? reject(e) : resolve(x))));
        rps.push(out.requests.average);
        errors.push(out.errors + out.timeouts);
        non2xx.push(out.non2xx);
        p99.push(out.latency.p99);
      }
      await sleep(35000);
      r.conn1000[name] = { rps: summary(rps), p99Ms: summary(p99), errors, non2xx };
      console.log(`1000 connections ${p}: ${Math.round(median(rps))} req/s, p99 ${median(p99)} ms, errors ${errors.join("/")}, non-2xx ${non2xx.join("/")}`);
    }
    await sleep(1000);
    r.conn1000.memoryAfterMb = treeRssKb(s.child.pid) / 1024;
    console.log(`memory after the 1,000-connection runs: ${Math.round(r.conn1000.memoryAfterMb)} MB`);
    const alive = await timed("/static");
    r.conn1000.answersAfter = alive.status === 200;
  } finally {
    stop(s.child);
    await sleep(500);
  }
  results.frameworks[key] = r;
}

mkdirSync(path.join(HERE, "results"), { recursive: true });
const out = path.join(HERE, "results", `scenarios-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`\nwrote ${out}`);
