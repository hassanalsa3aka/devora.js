#!/usr/bin/env node
// Prints markdown tables from run-backend.mjs result files. Several files for one machine and Node (a full run plus a rerun of
// some frameworks) are merged. Usage: node report-engines.mjs <title> <file.json> [more.json ...]
import fs from "node:fs";

const [title, ...files] = process.argv.slice(2);
const runs = files.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const frameworks = Object.assign({}, ...runs.map((r) => r.frameworks));
const m = runs[0].machine;
const c = runs[0].config;
const SCEN = [["items", "JSON list"], ["me", "authenticated GET"], ["postValid", "POST valid"], ["postInvalid", "POST invalid"], ["slow", "one async step"]];
const f0 = (n) => Math.round(n).toLocaleString("en-US");
console.log(`### ${title}\n`);
console.log(`${m.cpu}, ${m.cores} cores, ${m.memoryGb} GB, ${m.os}, Node ${m.node}; autocannon ${c.connections} connections, ${c.warmupSeconds} s warm-up, ${c.loadRuns} runs of ${c.loadSeconds} s, median (min to max); loadavg at start: ${runs.map((r) => Object.values(r.frameworks)[0]?.loadAvgAtStart?.toFixed(2)).join(", ")}\n`);
console.log(`| Framework | ${SCEN.map((s) => s[1] + " req/s").join(" | ")} | build cold ms | start ms | idle MB | after load MB |`);
console.log(`|---|${SCEN.map(() => "---:").join("|")}|---:|---:|---:|---:|`);
for (const f of Object.values(frameworks)) {
  const cells = SCEN.map(([k]) => (f.load?.[k] ? `${f0(f.load[k].rps.median)} (${f0(f.load[k].rps.min)}-${f0(f.load[k].rps.max)})` : "-"));
  console.log(`| ${f.name} | ${cells.join(" | ")} | ${f0(f.build?.coldMs?.median ?? 0)} | ${f0(f.startMs?.median ?? 0)} | ${f0(f.idleMemoryMb?.median ?? 0)} | ${f.afterLoadMemoryMb ? f0(f.afterLoadMemoryMb.median ?? f.afterLoadMemoryMb) : "-"} |`);
}
console.log("");
