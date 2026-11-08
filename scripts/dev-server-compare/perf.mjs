#!/usr/bin/env node
// The performance comparison: the experimental dev server against Vite (default settings and its fastest watch settings), on
// generated apps with an island page (small, 200 modules, 1000 modules). Starts every server itself (port 11021) and drives
// real Chrome. Two passes per server and scenario, N runs each (median and range are printed and written to --out):
//   start pass: cold (dependency caches removed) and warm (caches kept): ready, first HTML, interactive, RSS
//   edit pass:  client HMR (edit -> DOM), server edit -> new page, RSS after load, idle CPU
// "ready" counts from spawning the CLI (tsx included, common to every server) to the address being printed.
//   node scripts/dev-server-compare/perf.mjs [--runs=5] [--scenarios=small,200,1000] [--servers=own,vite,vite-tuned] [--idle=20] [--out=file.json]
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PORT_BIG as PORT, REPO, chromePath, get, listeningPid, makeSyntheticProject, now, sleep } from "./lib.mjs";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=") ?? d;
const RUNS = Number(arg("runs", 5));
const SCENARIOS = arg("scenarios", "small,200,1000").split(",");
const SERVERS = arg("servers", "own,vite,vite-tuned").split(",");
const IDLE = Number(arg("idle", 20));
const OUT = arg("out", "");
const TUNED = '{"usePolling":false,"useFsEvents":false}';
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rssMb = (pid) => Number(execFileSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" }).trim()) / 1024;
const cpuSeconds = (pid) => execFileSync("ps", ["-o", "time=", "-p", String(pid)], { encoding: "utf8" }).trim().split(":").map(Number).reduce((a, p) => a * 60 + p, 0);

let chromium;
try { ({ chromium } = await import("playwright-core")); } catch { console.error("playwright-core is not installed"); process.exit(2); }
const browser = await chromium.launch({ executablePath: chromePath(), headless: true });

async function run(project, server, { cold, edits, idle }) {
  const app = project.appDir;
  if (cold) {
    fs.rmSync(path.join(app, "node_modules", ".vite"), { recursive: true, force: true });
    fs.rmSync(path.join(app, "node_modules", ".devora"), { recursive: true, force: true });
  }
  const env = { ...process.env, NODE_ENV: "development", NO_COLOR: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef", COMPARE_VITE_WATCH: server === "vite-tuned" ? TUNED : "{}" };
  const t0 = now();
  const child = spawn(path.join(REPO, "node_modules/.bin/tsx"), [path.join(REPO, "packages/cli/src/index.ts"), "dev", ...(server === "own" ? ["--experimental-dev-server"] : [])], { cwd: project.root, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  const r = {};
  const original = fs.readFileSync(project.leaf, "utf8");
  let context;
  try {
    while (!out.includes("Local:")) {
      if (child.exitCode !== null) throw new Error(`server exited:\n${out}`);
      if (now() - t0 > 60000) throw new Error(`no start:\n${out}`);
      await sleep(3);
    }
    r.ready_ms = now() - t0;
    const t1 = now();
    const first = await get(`http://localhost:${PORT}/`);
    if (!first.ok || first.status !== 200) throw new Error(`first page: ${first.error ?? first.status}`);
    r.firstHtml_ms = now() - t1;
    context = await browser.newContext();
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push(e.message));
    const t2 = now();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
    await page.waitForFunction(() => Object.keys(document.querySelector("[data-island]") ?? {}).some((k) => k.startsWith("__reactContainer")), null, { timeout: 90000, polling: "raf" });
    const before = await page.textContent("#inc");
    await page.click("#inc");
    await page.waitForFunction((b) => document.querySelector("#inc")?.textContent !== b, before, { polling: "raf" });
    r.interactive_ms = now() - t2;
    if (problems.length) throw new Error(`page errors: ${problems[0]}`);
    await sleep(1200);
    const pid = listeningPid(PORT);
    r.rss_mb = rssMb(pid);
    if (edits > 0) {
      const hmr = [];
      for (let i = 0; i < edits; i++) {
        const text = `leaf-edit-${i}`;
        const t = Date.now();
        fs.writeFileSync(project.leaf, original.replace("leaf-v1", text));
        await page.waitForFunction((s) => document.querySelector("#leaf")?.textContent === s, text, { polling: "raf", timeout: 30000 });
        hmr.push(Date.now() - t);
        await sleep(250);
      }
      r.hmr_ms = median(hmr);
      const edit = [];
      for (let i = 0; i < edits; i++) {
        const text = `leaf-ssr-${i}`;
        const t = now();
        fs.writeFileSync(project.leaf, original.replace("leaf-v1", text));
        for (let n = 0; n < 5000; n++) {
          const res = await get(`http://localhost:${PORT}/`);
          if (!res.ok || res.status !== 200) throw new Error(`page after edit: ${res.error ?? res.status}`);
          if (res.body.includes(text)) break;
          await sleep(2);
        }
        edit.push(now() - t);
        await sleep(150);
      }
      r.serverEdit_ms = median(edit);
      fs.writeFileSync(project.leaf, original);
      await sleep(1000);
    }
    if (idle > 0) {
      const c0 = cpuSeconds(pid);
      await sleep(idle * 1000);
      r.idle_cpu_pct = ((cpuSeconds(pid) - c0) / idle) * 100;
    }
  } finally {
    fs.writeFileSync(project.leaf, original);
    await context?.close();
    await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(resolve, 6000); });
    const left = listeningPid(PORT);
    if (left) process.kill(left, "SIGTERM");
    await sleep(500);
  }
  return r;
}

const results = {};
const failures = [];
for (const scenario of SCENARIOS) {
  const modules = scenario === "small" ? 0 : Number(scenario);
  const project = makeSyntheticProject({ name: `perf${scenario}`, port: PORT, modules });
  try {
    for (const server of SERVERS) {
      const key = `${scenario}/${server}`;
      results[key] = { cold: [], warm: [], edit: [] };
      try {
        await run(project, server, { cold: true, edits: 0, idle: 0 }); // warm-up, not counted (file cache, browser)
        for (let i = 0; i < RUNS; i++) results[key].cold.push(await run(project, server, { cold: true, edits: 0, idle: 0 }));
        for (let i = 0; i < RUNS; i++) results[key].warm.push(await run(project, server, { cold: false, edits: 0, idle: 0 }));
        for (let i = 0; i < RUNS; i++) results[key].edit.push(await run(project, server, { cold: false, edits: 5, idle: IDLE }));
      } catch (error) {
        failures.push(`${key}: ${String(error.message ?? error).split("\n")[0]}`);
      }
      const f = (rows, m) => (rows.length ? `${median(rows.map((x) => x[m])).toFixed(0)} (${Math.min(...rows.map((x) => x[m])).toFixed(0)}-${Math.max(...rows.map((x) => x[m])).toFixed(0)})` : "n/a");
      const R = results[key];
      console.log(`${key.padEnd(18)} cold: ready ${f(R.cold, "ready_ms")} html ${f(R.cold, "firstHtml_ms")} interactive ${f(R.cold, "interactive_ms")} | warm: ready ${f(R.warm, "ready_ms")} html ${f(R.warm, "firstHtml_ms")} interactive ${f(R.warm, "interactive_ms")} | hmr ${f(R.edit, "hmr_ms")} serverEdit ${f(R.edit, "serverEdit_ms")} rss ${f(R.edit, "rss_mb")} idle% ${R.edit.length ? median(R.edit.map((x) => x.idle_cpu_pct)).toFixed(1) : "n/a"}`);
    }
  } finally {
    project.cleanup();
  }
}
await browser.close();
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), runs: RUNS, node: process.version, results }, null, 2));
if (failures.length) {
  console.log(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
