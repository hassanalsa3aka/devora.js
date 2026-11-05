// Self time per function and per file from a .cpuprofile: node summarize-profile.mjs <file> [top=30]
import { readFileSync } from "node:fs";
const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const top = Number(process.argv[3] ?? 30);
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
for (let i = 0; i < profile.samples.length; i++) self.set(profile.samples[i], (self.get(profile.samples[i]) ?? 0) + (dt[i] ?? 0));
const total = [...self.values()].reduce((a, b) => a + b, 0);
const fn = new Map();
const file = new Map();
for (const [id, t] of self) {
  const n = byId.get(id);
  const url = (n.callFrame.url || "(native)").replace(/^.*node_modules\//, "nm/").replace(/^file:\/\/.*\/benchmarks\//, "");
  const key = `${n.callFrame.functionName || "(anonymous)"}  ${url}:${n.callFrame.lineNumber + 1}`;
  fn.set(key, (fn.get(key) ?? 0) + t);
  const f = url.split(":")[0];
  file.set(f, (file.get(f) ?? 0) + t);
}
const pct = (t) => ((100 * t) / total).toFixed(1).padStart(5) + "%";
console.log(`total sampled ${(total / 1000).toFixed(0)} ms`);
console.log("\n## by function (self)");
for (const [k, t] of [...fn].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(pct(t), k);
console.log("\n## by file (self)");
for (const [k, t] of [...file].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(pct(t), k);
