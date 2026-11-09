#!/usr/bin/env node
// Where the time goes in the experimental dev server: runs it under `node --cpu-prof` (no tsx wrapper process), drives a
// scenario (first page, a browser load of the page and its modules, a few edits) and prints the start-up steps and the
// self time of the profile grouped by what it was spent on.
//   node scripts/dev-server-compare/profile.mjs [--modules=0|200|1000] [--edits=10] [--server=own|vite]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PORT_BIG, REPO, get, makeSyntheticProject, makeTemp, sleep } from "./lib.mjs";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const MODULES = Number(arg("modules", 200));
const EDITS = Number(arg("edits", 10));
const SERVER = arg("server", "own");
const PORT = PORT_BIG;

let chromium;
try { ({ chromium } = await import("playwright-core")); } catch { console.error("playwright-core missing"); process.exit(2); }
const { chromePath } = await import("./lib.mjs");

const project = makeSyntheticProject({ name: "profile", port: PORT, modules: MODULES });
const profDir = makeTemp("cpuprof");
const original = fs.readFileSync(project.leaf, "utf8");
const child = spawn(process.execPath, ["--cpu-prof", `--cpu-prof-dir=${profDir.dir}`, "--import", "tsx", path.join(REPO, "packages/cli/src/index.ts"), "dev", ...(SERVER === "own" ? ["--experimental-dev-server"] : [])], {
  cwd: project.root,
  env: { ...process.env, NODE_ENV: "development", NO_COLOR: "1", DEVORA_DEV_TRACE: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef", COMPARE_VITE_WATCH: '{"usePolling":false,"useFsEvents":false}' },
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
child.stdout.on("data", (c) => (out += c));
child.stderr.on("data", (c) => (out += c));
const t0 = performance.now();
while (!out.includes("Local:")) {
  if (child.exitCode !== null) throw new Error(out);
  await sleep(10);
}
const readyMs = performance.now() - t0;
const browser = await chromium.launch({ executablePath: chromePath(), headless: true });
const page = await (await browser.newContext()).newPage();
const t1 = performance.now();
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => Object.keys(document.querySelector("[data-island]") ?? {}).some((k) => k.startsWith("__reactContainer")), null, { timeout: 60000 });
const interactiveMs = performance.now() - t1;
await sleep(500);
const hmr = [];
for (let i = 0; i < EDITS; i++) {
  const text = `leaf-prof-${i}`;
  const t = Date.now();
  fs.writeFileSync(project.leaf, original.replace("leaf-v1", text));
  await page.waitForFunction((x) => document.querySelector("#leaf")?.textContent === x, text, { polling: "raf", timeout: 20000 });
  hmr.push(Date.now() - t);
  await sleep(200);
}
const serverEdit = [];
for (let i = 0; i < EDITS; i++) {
  const text = `leaf-ssr-${i}`;
  const t = performance.now();
  fs.writeFileSync(project.leaf, original.replace("leaf-v1", text));
  for (;;) {
    const r = await get(`http://localhost:${PORT}/`);
    if (r.ok && r.body.includes(text)) break;
    await sleep(2);
  }
  serverEdit.push(performance.now() - t);
  await sleep(100);
}
fs.writeFileSync(project.leaf, original);
await browser.close();
await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(resolve, 8000); });
await sleep(500);

const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`\n=== ${SERVER}, ${MODULES || "small"} modules`);
console.log(`ready (spawn -> address printed): ${readyMs.toFixed(0)} ms   interactive in a browser: ${interactiveMs.toFixed(0)} ms   client HMR median ${med(hmr)} ms   server edit -> new page median ${med(serverEdit).toFixed(0)} ms`);
console.log("\nstart-up steps and the first requests:");
for (const line of out.split("\n").filter((l) => l.includes("trace]")).slice(0, 40)) console.log(" ", line.replace("[devora dev-server trace] ", ""));

console.log("\nthe last server-edit rounds (change event handling, then the page request that shows it):");
for (const line of out.split("\n").filter((l) => /change |GET \/ ->/.test(l)).slice(-16)) console.log(" ", line.replace("[devora dev-server trace] ", ""));

const files = fs.readdirSync(profDir.dir).filter((f) => f.endsWith(".cpuprofile")).map((f) => path.join(profDir.dir, f));
const biggest = files.map((f) => ({ f, size: fs.statSync(f).size })).sort((a, b) => b.size - a.size)[0];
if (biggest) {
  const profile = JSON.parse(fs.readFileSync(biggest.f, "utf8"));
  const self = new Map();
  const dt = profile.timeDeltas;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)));
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const groups = new Map();
  const classify = (n) => {
    const url = n.callFrame.url || "";
    const name = n.callFrame.functionName || "(anonymous)";
    if (name === "(idle)") return "idle";
    if (name === "(garbage collector)") return "garbage collection";
    if (name === "(program)") return "native / program";
    if (url.includes("/esbuild/")) return "esbuild (JS side)";
    if (url.includes("/acorn/")) return "acorn (parsing)";
    if (url.includes("react-dom")) return "react-dom (rendering)";
    if (url.includes("/vite/")) return "vite";
    if (url.includes("rollup")) return "rollup";
    if (url.includes("/dev-server/")) return "dev-server code";
    if (url.includes("/packages/cli/")) return "cli code";
    if (url.includes("/packages/core/")) return "core code";
    if (url.startsWith("node:")) return `node internals (${url.replace("node:", "").split("/")[0]})`;
    if (url.includes("tsx")) return "tsx (loader)";
    return url ? `other (${url.split("/node_modules/").pop().split("/")[0].slice(0, 28)})` : "other";
  };
  for (const [id, t] of self) groups.set(classify(byId.get(id)), (groups.get(classify(byId.get(id))) ?? 0) + t);
  console.log(`\nCPU profile (${path.basename(biggest.f)}), total ${(total / 1000).toFixed(0)} ms of samples; self time by what it was spent on (idle excluded from the percentage):`);
  const busy = total - (groups.get("idle") ?? 0);
  for (const [k, t] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${k.padEnd(34)} ${(t / 1000).toFixed(0).padStart(6)} ms  ${k === "idle" ? "" : ((t / busy) * 100).toFixed(1) + "%"}`);
  const top = [...self].sort((a, b) => b[1] - a[1]).filter(([id]) => !["(idle)", "(program)", "(garbage collector)"].includes(byId.get(id).callFrame.functionName)).slice(0, 12);
  console.log("\ntop functions by self time:");
  for (const [id, t] of top) { const n = byId.get(id); console.log(`  ${(t / 1000).toFixed(1).padStart(7)} ms  ${n.callFrame.functionName || "(anonymous)"}  ${(n.callFrame.url || "").split("/").slice(-3).join("/")}:${n.callFrame.lineNumber + 1}`); }
}
project.cleanup();
profDir.cleanup();
