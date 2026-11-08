#!/usr/bin/env node
// Markdown tables from the merged container raw files (pages and backend): node tables.mjs <pages.json> <backend.json>
import { readFileSync } from "node:fs";
const [pagesFile, backendFile] = process.argv.slice(2);
const n = (x) => Math.round(x).toLocaleString("en-US");
const out = [];
const rank = (title, rows) => {
  rows.sort((a, b) => b.median - a.median);
  out.push(`### ${title}`, "", "| # | Framework | Requests/s, median (min–max) |", "|---|---|---|");
  rows.forEach((r, i) => out.push(`| ${i + 1} | ${r.name} | ${n(r.median)} (${n(r.min)}–${n(r.max)}) |`));
  out.push("");
};
const pages = JSON.parse(readFileSync(pagesFile, "utf8"));
for (const [key, title] of [["static", "A. Pre-rendered page"], ["items", "B. Server-rendered page (100 items)"], ["form", "C. Form POST"]]) {
  rank(title, Object.values(pages.frameworks).filter((f) => f.load?.[key]).map((f) => ({ name: `${f.name} ${f.version}`, ...f.load[key].rps })));
}
out.push("### Pages apps: build, start, memory, JavaScript sent", "", "| Framework | Build cold ms | Start ms | Idle MB | After load MB | JS sent /items, gzip B | Hydration ms |", "|---|---|---|---|---|---|---|");
for (const f of Object.values(pages.frameworks)) {
  const js = f.browser?.["/items"]?.jsGzip;
  out.push(`| ${f.name} ${f.version} | ${n(f.build?.coldMs?.median ?? NaN)} | ${n(f.startMs?.median ?? NaN)} | ${n(f.idleMemoryMb?.median ?? f.idleMemoryMb ?? NaN)} | ${n(f.memoryAfterLoadMb ?? NaN)} | ${js === undefined ? "see raw" : n(js)} | ${f.browser?.["/items"]?.hydrationMs ? n(f.browser["/items"].hydrationMs.median) : "-"} |`);
}
out.push("");
const backend = JSON.parse(readFileSync(backendFile, "utf8"));
for (const [key, title] of [["items", "D. JSON list"], ["me", "E. Authenticated GET"], ["postValid", "F1. POST, valid body"], ["postInvalid", "F2. POST, invalid body"], ["slow", "G. One awaited 2 ms step"]]) {
  rank(title, Object.values(backend.frameworks).filter((f) => f.load?.[key]).map((f) => ({ name: f.name, ...(f.load[key].rps ?? f.load[key]) })));
}
console.log(out.join("\n"));
