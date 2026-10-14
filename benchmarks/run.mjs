#!/usr/bin/env node
/**
 * Benchmarks the same three pages in five frameworks (apps/*), each built
 * and served with its own documented production setup:
 *
 *   /static  a page with no data, pre-rendered at build time
 *   /items   server-rendered per request: a loader returning 100 items and
 *            one interactive counter
 *   /form    a form; POST with a name redirects (303), without one it's a 400
 *
 * Measures: cold and warm build time, server start time, idle memory,
 * requests/second and p50/p99 latency (autocannon), JavaScript sent to the
 * browser (gzip and brotli) and time until the counter responds, in
 * Chromium. Writes results/raw-<date>.json; `npm run report` turns the
 * newest one into results/report.md.
 *
 * Usage: node run.mjs [--only=devora,next] [--quick]
 *   CHROME_PATH=/path/to/chrome   use this Chromium instead of Playwright's
 */
import { spawn, execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync, brotliCompressSync, constants as zc } from "node:zlib";
import autocannon from "autocannon";
import { chromium } from "playwright";

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
  browserRuns: QUICK ? 1 : 5,
};

const PORT = 4300;
// What a browser sends for a page or a form submission. SvelteKit answers a
// form POST that accepts any type with JSON (its JS-enhanced path), so the
// header matters.
const ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
// SvelteKit's build reads ORIGIN (its paths.origin, see apps/sveltekit/vite.config.js).

// Build outputs and caches to delete for a cold build.
const FRAMEWORKS = [
  { key: "devora", name: "Devora.js", pkg: "@devorajs/cli", clean: ["apps/bench/dist", "apps/bench/node_modules/.vite", "node_modules/.vite"] },
  { key: "next", name: "Next.js", pkg: "next", clean: [".next"] },
  { key: "astro", name: "Astro", pkg: "astro", clean: ["dist", ".astro", "node_modules/.astro", "node_modules/.vite"] },
  { key: "sveltekit", name: "SvelteKit", pkg: "@sveltejs/kit", clean: ["build", ".svelte-kit", "node_modules/.vite"] },
  { key: "react-router", name: "React Router", pkg: "react-router", clean: ["build", ".react-router", "node_modules/.vite"] },
].filter((f) => !args.only || args.only.split(",").includes(f.key));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const summary = (xs) => ({ median: median(xs), min: Math.min(...xs), max: Math.max(...xs), runs: xs });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function installedVersion(dir, pkg) {
  return JSON.parse(readFileSync(path.join(dir, "node_modules", pkg, "package.json"), "utf-8")).version;
}

function timeBuild(dir) {
  const t0 = performance.now();
  execSync("npm run build", { cwd: dir, stdio: "ignore", env: { ...process.env, NODE_ENV: "production", ORIGIN: `http://localhost:${PORT}` } });
  return performance.now() - t0;
}

function treeRssKb(pid) {
  let total = 0;
  const visit = (p) => {
    try {
      total += Number(execFileSync("ps", ["-o", "rss=", "-p", String(p)]).toString().trim()) || 0;
    } catch {}
    let kids = [];
    try {
      kids = execFileSync("pgrep", ["-P", String(p)]).toString().trim().split("\n").filter(Boolean);
    } catch {}
    kids.forEach(visit);
  };
  visit(pid);
  return total;
}

async function startServer(dir) {
  const t0 = performance.now();
  const child = spawn("npm", ["start"], {
    cwd: dir,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  });
  for (let i = 0; i < 600; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/static`);
      if (res.ok) return { child, ms: performance.now() - t0 };
    } catch {}
    await sleep(25);
  }
  stopServer(child);
  throw new Error(`${dir}: server never answered`);
}

function stopServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
}

// Never start a server while an earlier one still answers on the port: the
// numbers would silently belong to the wrong framework.
async function waitPortFree() {
  for (let i = 0; i < 200; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      await sleep(50);
    } catch {
      return;
    }
  }
  throw new Error(`port ${PORT} is still in use`);
}

/** The form exactly as a browser without JavaScript would submit it. */
async function formRequest() {
  const base = `http://localhost:${PORT}`;
  const html = await (await fetch(`${base}/form`, { headers: { accept: ACCEPT } })).text();
  const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0];
  if (!form) throw new Error("no <form> on /form");
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
  const tag = form.match(/<form[^>]*>/)[0];
  const action = attr(tag, "action") && !attr(tag, "action").startsWith("javascript") ? attr(tag, "action") : "/form";
  const fields = [];
  for (const input of form.match(/<input[^>]*>/g) ?? []) {
    if (attr(input, "type") === "hidden") fields.push([attr(input, "name"), (attr(input, "value") ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&")]);
  }
  const multipart = (attr(tag, "enctype") ?? "").includes("multipart");
  const boundary = "----benchboundary";
  const encode = (name) => {
    const all = [...fields, ["name", name]];
    return multipart
      ? all.map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`).join("") + `--${boundary}--\r\n`
      : new URLSearchParams(all).toString();
  };
  const contentType = multipart ? `multipart/form-data; boundary=${boundary}` : "application/x-www-form-urlencoded";
  const headers = { "content-type": contentType, origin: base, accept: ACCEPT };
  const body = encode("Bench");
  const check = await fetch(base + action, { method: "POST", headers, body, redirect: "manual" });
  const empty = await fetch(base + action, { method: "POST", headers, body: encode(""), redirect: "manual" });
  const emptyHtml = await empty.text();
  return {
    path: action,
    method: "POST",
    headers,
    body,
    expectStatus: check.status,
    location: check.headers.get("location"),
    emptyNameStatus: empty.status,
    emptyNameShowsError: emptyHtml.includes("Name is required"),
  };
}

function cannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon({ connections: CONFIG.connections, pipelining: 1, headers: { accept: ACCEPT }, ...opts }, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

async function load(url, extra = {}) {
  await cannon({ url, duration: CONFIG.warmupSeconds, ...extra });
  const rps = [], p50 = [], p99 = [], errors = [], non2xx = [];
  for (let i = 0; i < CONFIG.loadRuns; i++) {
    const r = await cannon({ url, duration: CONFIG.loadSeconds, ...extra });
    rps.push(r.requests.average);
    p50.push(r.latency.p50);
    p99.push(r.latency.p99);
    errors.push(r.errors + r.timeouts);
    non2xx.push(r.non2xx);
  }
  return { rps: summary(rps), p50: summary(p50), p99: summary(p99), errors, non2xx };
}

async function browserMetrics(browser) {
  const base = `http://localhost:${PORT}`;
  const out = {};
  for (const page of ["/static", "/items"]) {
    const bytes = [], gzip = [], brotli = [], hydration = [];
    for (let i = 0; i < CONFIG.browserRuns; i++) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      const scripts = [];
      p.on("response", async (res) => {
        if (res.request().resourceType() === "script") scripts.push(res);
      });
      await p.goto(base + page, { waitUntil: "commit" });
      if (page === "/items") {
        // Time from navigation start until a click on the counter changes it.
        const t = await p.evaluate(async () => {
          for (;;) {
            const b = document.getElementById("counter");
            if (b) {
              const before = b.textContent;
              b.click();
              await new Promise((r) => setTimeout(r, 0));
              if (document.getElementById("counter").textContent !== before) return performance.now();
            }
            await new Promise((r) => setTimeout(r, 5));
          }
        });
        hydration.push(t);
      }
      await p.waitForLoadState("networkidle");
      let raw = 0, gz = 0, br = 0;
      for (const res of scripts) {
        const buf = await res.body().catch(() => Buffer.alloc(0));
        raw += buf.length;
        gz += gzipSync(buf, { level: 9 }).length;
        br += brotliCompressSync(buf, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }).length;
      }
      bytes.push(raw);
      gzip.push(gz);
      brotli.push(br);
      await ctx.close();
    }
    out[page] = { jsBytes: median(bytes), jsGzip: median(gzip), jsBrotli: median(brotli), ...(hydration.length ? { hydrationMs: summary(hydration) } : {}) };
  }
  return out;
}

const results = {
  date: new Date().toISOString(),
  machine: {
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 2 ** 30),
    os: `${os.type()} ${os.release()} (${process.platform} ${process.arch})`,
    node: process.version,
  },
  config: { ...CONFIG, tool: `autocannon ${JSON.parse(readFileSync(path.join(HERE, "node_modules/autocannon/package.json"), "utf-8")).version}` },
  frameworks: {},
};

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
try {
  for (const fw of FRAMEWORKS) {
    const dir = path.join(HERE, "apps", fw.key);
    console.log(`\n== ${fw.name}`);
    const r = { name: fw.name, version: installedVersion(dir, fw.pkg) };
    if (fw.key === "devora") r.coreVersion = installedVersion(dir, "@devorajs/core");

    const cold = [], warm = [];
    for (let i = 0; i < CONFIG.buildRuns; i++) {
      for (const c of fw.clean) rmSync(path.join(dir, c), { recursive: true, force: true });
      cold.push(timeBuild(dir));
      warm.push(timeBuild(dir));
    }
    r.build = { coldMs: summary(cold), warmMs: summary(warm) };
    console.log(`build cold ${Math.round(r.build.coldMs.median)} ms, warm ${Math.round(r.build.warmMs.median)} ms`);

    const starts = [], idle = [];
    for (let i = 0; i < CONFIG.startRuns; i++) {
      await waitPortFree();
      const { child, ms } = await startServer(dir);
      starts.push(ms);
      await sleep(2000);
      idle.push(treeRssKb(child.pid) / 1024);
      stopServer(child);
    }
    r.startMs = summary(starts);
    r.idleMemoryMb = summary(idle);
    console.log(`start ${Math.round(r.startMs.median)} ms, idle ${Math.round(r.idleMemoryMb.median)} MB`);

    await waitPortFree();
    const { child } = await startServer(dir);
    try {
      const form = await formRequest();
      r.form = { status: form.expectStatus, location: form.location, emptyNameStatus: form.emptyNameStatus, emptyNameShowsError: form.emptyNameShowsError };
      // Benchmark the URL that actually serves the page (React Router
      // redirects /static to /static/, its pre-rendered directory).
      const staticRes = await fetch(`http://localhost:${PORT}/static`, { redirect: "manual" });
      const staticPath = staticRes.status >= 300 && staticRes.status < 400 ? new URL(staticRes.headers.get("location"), `http://localhost:${PORT}`).pathname : "/static";
      r.staticPath = staticPath;
      r.load = {
        static: await load(`http://localhost:${PORT}${staticPath}`),
        items: await load(`http://localhost:${PORT}/items`),
        form: await load(`http://localhost:${PORT}${form.path}`, { method: "POST", headers: form.headers, body: form.body }),
      };
      for (const [k, v] of Object.entries(r.load)) console.log(`${k}: ${Math.round(v.rps.median)} req/s, p50 ${v.p50.median} ms, p99 ${v.p99.median} ms`);
      r.memoryAfterLoadMb = treeRssKb(child.pid) / 1024;
      r.browser = await browserMetrics(browser);
      console.log(`items JS ${r.browser["/items"].jsGzip} B gzip, hydration ${Math.round(r.browser["/items"].hydrationMs.median)} ms`);
    } finally {
      stopServer(child);
    }
    results.frameworks[fw.key] = r;
  }
} finally {
  await browser.close();
}

mkdirSync(path.join(HERE, "results"), { recursive: true });
const file = path.join(HERE, "results", `raw-${results.date.slice(0, 10)}${QUICK ? "-quick" : ""}.json`);
writeFileSync(file, JSON.stringify(results, null, 2) + "\n");
console.log(`\nwrote ${path.relative(HERE, file)}`);
