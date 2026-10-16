#!/usr/bin/env node
/**
 * Backend benchmark: the same API (backend/CONTRACT.md) in ten apps, each built and
 * served with its documented production setup. Scenarios D (JSON list), E (Bearer
 * lookup), F (POST with validation: valid and invalid), G (one async step).
 * Measures build time, start time, idle and after-load memory (RSS of the process
 * tree), requests/second and p50/p99 (autocannon, same method as run.mjs), and the
 * bytes on the wire per scenario. Writes results/backend-raw-<date>.json.
 *
 * Usage: node run-backend.mjs [--only=express,fastify] [--quick]
 */
import http from "node:http";
import { spawn, execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import autocannon from "autocannon";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const QUICK = "quick" in args;
const CONFIG = {
  buildRuns: QUICK ? 1 : 3,
  startRuns: QUICK ? 1 : 5,
  loadRuns: QUICK ? 1 : 5,
  loadSeconds: QUICK ? 3 : 10,
  warmupSeconds: QUICK ? 1 : 5,
  connections: 50,
};
const PORT = 4310;
const BASE = `http://localhost:${PORT}`;
const JSON_HEADERS = { "content-type": "application/json", accept: "application/json" };

const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));

const FRAMEWORKS = [
  { key: "devora-api", name: "Devora.js", pkg: "@devorajs/cli", kind: "backend+pages", clean: ["apps/api/dist"], env: { DEVORA_SESSION_SECRET: "bench-secret-bench-secret-bench-secret" }, extra: ["@devorajs/core"] },
  { key: "express", name: "Express 5", pkg: "express", kind: "backend", clean: [] },
  { key: "fastify", name: "Fastify 5", pkg: "fastify", kind: "backend", clean: [] },
  { key: "hono", name: "Hono", pkg: "hono", kind: "backend", clean: [] },
  { key: "nest-express", name: "NestJS (Express platform)", pkg: "@nestjs/core", kind: "backend", clean: ["dist"] },
  { key: "nest-fastify", name: "NestJS (Fastify platform)", pkg: "@nestjs/core", kind: "backend", clean: ["dist"] },
  { key: "next", name: "Next.js", pkg: "next", kind: "pages", clean: [".next"] },
  { key: "sveltekit", name: "SvelteKit", pkg: "@sveltejs/kit", kind: "pages", clean: ["build", ".svelte-kit", "node_modules/.vite"], env: { ORIGIN: BASE } },
  { key: "react-router", name: "React Router", pkg: "react-router", kind: "pages", clean: ["build", ".react-router", "node_modules/.vite"] },
  { key: "astro", name: "Astro", pkg: "astro", kind: "pages", clean: ["dist", ".astro", "node_modules/.astro", "node_modules/.vite"] },
].filter((f) => !args.only || args.only.split(",").includes(f.key));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const summary = (xs) => ({ median: median(xs), min: Math.min(...xs), max: Math.max(...xs), runs: xs });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const installedVersion = (dir, pkg) => JSON.parse(readFileSync(path.join(dir, "node_modules", pkg, "package.json"), "utf-8")).version;

function timeBuild(dir, env) {
  const t0 = performance.now();
  execSync("npm run build", { cwd: dir, stdio: "ignore", env: { ...process.env, NODE_ENV: "production", ...env } });
  return performance.now() - t0;
}

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

async function startServer(dir, env) {
  const t0 = performance.now();
  const child = spawn("npm", ["start"], { cwd: dir, detached: true, stdio: "ignore", env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", ...env } });
  for (let i = 0; i < 1200; i++) {
    try {
      const res = await fetch(`${BASE}/api/items`);
      if (res.ok) return { child, ms: performance.now() - t0 };
    } catch {}
    await sleep(25);
  }
  stopServer(child);
  throw new Error(`${dir}: server never answered`);
}
function stopServer(child) { try { process.kill(-child.pid, "SIGTERM"); } catch {} }
async function waitPortFree() {
  for (let i = 0; i < 200; i++) {
    try { await fetch(`${BASE}/`); await sleep(50); } catch { return; }
  }
  throw new Error(`port ${PORT} is still in use`);
}

/** Raw request: status, headers, body bytes and header bytes exactly as received. */
function rawRequest(pathname, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "localhost", port: PORT, path: pathname, method, headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const headerBytes = res.rawHeaders.reduce((n, h, i) => n + Buffer.byteLength(h) + (i % 2 ? 2 : 2), 0);
        resolve({ status: res.statusCode, contentEncoding: res.headers["content-encoding"] ?? null, bodyBytes: buf.length, headerBytes, body: buf.toString("utf8") });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function scenarios() {
  const login = await rawRequest("/api/session", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ username: "bench" }) });
  if (login.status !== 201) throw new Error(`login answered ${login.status}`);
  const token = JSON.parse(login.body).token;
  const validBody = JSON.stringify({ name: "Bench", price: 9.5 });
  const invalidBody = JSON.stringify({ name: "", price: -1 });
  return {
    items: { path: "/api/items", method: "GET", headers: { accept: "application/json" }, expect: (s, b) => s === 200 && isDeepStrictEqual(JSON.parse(b), { items: ITEMS }) },
    me: { path: "/api/me", method: "GET", headers: { accept: "application/json", authorization: `Bearer ${token}` }, expect: (s, b) => s === 200 && isDeepStrictEqual(JSON.parse(b), { user: "bench" }) },
    postValid: { path: "/api/items", method: "POST", headers: JSON_HEADERS, body: validBody, expect: (s, b) => { const j = JSON.parse(b); return s === 201 && j.name === "Bench" && j.price === 9.5 && Number.isInteger(j.id); } },
    postInvalid: { path: "/api/items", method: "POST", headers: JSON_HEADERS, body: invalidBody, expect: (s, b) => s === 422 && isDeepStrictEqual(JSON.parse(b), { error: "validation", fields: ["name", "price"] }) },
    slow: { path: "/api/slow", method: "GET", headers: { accept: "application/json" }, expect: (s, b) => s === 200 && isDeepStrictEqual(JSON.parse(b), { item: ITEMS[0] }) },
  };
}

function cannon(opts) {
  return new Promise((resolve, reject) => autocannon({ connections: CONFIG.connections, pipelining: 1, ...opts }, (e, r) => (e ? reject(e) : resolve(r))));
}
async function load(sc) {
  const req = { url: BASE + sc.path, method: sc.method, headers: sc.headers, ...(sc.body ? { body: sc.body } : {}) };
  await cannon({ ...req, duration: CONFIG.warmupSeconds });
  const rps = [], p50 = [], p99 = [], bad = [];
  for (let i = 0; i < CONFIG.loadRuns; i++) {
    const r = await cannon({ ...req, duration: CONFIG.loadSeconds });
    rps.push(r.requests.average); p50.push(r.latency.p50); p99.push(r.latency.p99);
    // 2xx counts as success; the 422 scenario is expected to be non-2xx, so count only
    // errors and timeouts, plus non-2xx for the scenarios that must be 2xx.
    bad.push(r.errors + r.timeouts + (sc.expectNon2xx ? 0 : r.non2xx));
  }
  return { rps: summary(rps), p50: summary(p50), p99: summary(p99), errorsOrUnexpected: bad };
}

const results = {
  date: new Date().toISOString(),
  machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()} (${process.platform} ${process.arch})`, node: process.version },
  config: { ...CONFIG, tool: `autocannon ${JSON.parse(readFileSync(path.join(HERE, "node_modules/autocannon/package.json"), "utf-8")).version}` },
  frameworks: {},
};

const outFile = path.join(HERE, "results", `backend-raw-${results.date.slice(0, 10)}${QUICK ? "-quick" : ""}${args.tag ? "-" + args.tag : ""}.json`);
for (const fw of FRAMEWORKS) {
  const dir = path.join(HERE, "apps", fw.key);
  console.log(`\n== ${fw.name}`);
  const r = { name: fw.name, kind: fw.kind, version: installedVersion(dir, fw.pkg), loadAvgAtStart: os.loadavg()[0] };
  if (fw.extra) r.coreVersion = installedVersion(dir, fw.extra[0]);
  const cold = [], warm = [];
  for (let i = 0; i < CONFIG.buildRuns; i++) {
    for (const c of fw.clean) rmSync(path.join(dir, c), { recursive: true, force: true });
    cold.push(timeBuild(dir, fw.env));
    warm.push(timeBuild(dir, fw.env));
  }
  r.build = { coldMs: summary(cold), warmMs: summary(warm) };
  console.log(`build cold ${Math.round(r.build.coldMs.median)} ms, warm ${Math.round(r.build.warmMs.median)} ms`);

  const starts = [], idle = [];
  for (let i = 0; i < CONFIG.startRuns; i++) {
    await waitPortFree();
    const { child, ms } = await startServer(dir, fw.env);
    starts.push(ms);
    await sleep(2000);
    idle.push(treeRssKb(child.pid) / 1024);
    stopServer(child);
  }
  r.startMs = summary(starts);
  r.idleMemoryMb = summary(idle);
  console.log(`start ${Math.round(r.startMs.median)} ms, idle ${Math.round(r.idleMemoryMb.median)} MB`);

  await waitPortFree();
  const { child } = await startServer(dir, fw.env);
  try {
    const sc = await scenarios();
    sc.postInvalid.expectNon2xx = true;
    r.load = {};
    r.wire = {};
    r.conforms = {};
    for (const [k, s] of Object.entries(sc)) {
      const tool = await rawRequest(s.path, { method: s.method, headers: s.headers, body: s.body });
      const browser = await rawRequest(s.path, { method: s.method, headers: { ...s.headers, "accept-encoding": "gzip, deflate, br" }, body: s.body });
      r.conforms[k] = s.expect(tool.status, tool.body);
      r.wire[k] = { loadTool: { status: tool.status, contentEncoding: tool.contentEncoding, bodyBytes: tool.bodyBytes, headerBytes: tool.headerBytes }, browser: { status: browser.status, contentEncoding: browser.contentEncoding, bodyBytes: browser.bodyBytes, headerBytes: browser.headerBytes } };
      if (!r.conforms[k]) { console.log(`!! ${k} does not match the contract (status ${tool.status}): ${tool.body.slice(0, 120)}`); continue; }
      r.load[k] = await load(s);
      console.log(`${k}: ${Math.round(r.load[k].rps.median)} req/s, p50 ${r.load[k].p50.median} ms, p99 ${r.load[k].p99.median} ms, ${tool.bodyBytes} B body + ${tool.headerBytes} B headers (${tool.contentEncoding ?? "identity"})`);
    }
    r.memoryAfterLoadMb = treeRssKb(child.pid) / 1024;
    console.log(`memory after load ${Math.round(r.memoryAfterLoadMb)} MB`);
  } finally {
    stopServer(child);
  }
  results.frameworks[fw.key] = r;
  save();
}

save();
console.log(`\nwrote ${path.relative(HERE, outFile)}`);

function save() {
  mkdirSync(path.join(HERE, "results"), { recursive: true });
  writeFileSync(outFile, JSON.stringify(results, null, 2) + "\n");
}
