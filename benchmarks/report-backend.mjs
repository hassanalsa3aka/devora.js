#!/usr/bin/env node
/** Turns the newest results/backend-raw-<date>.json into results/backend-report.md and backend-latest.json. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(HERE, "results");
const rawName = process.argv[2] ?? readdirSync(dir).filter((f) => /^backend-raw-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const data = JSON.parse(readFileSync(path.join(dir, rawName), "utf-8"));
const fws = Object.entries(data.frameworks);
const SC = [
  ["items", "D. GET /api/items (JSON list, 100 items)"],
  ["me", "E. Authenticated GET (Bearer lookup, then JSON)"],
  ["postValid", "F1. POST JSON, valid body (201)"],
  ["postInvalid", "F2. POST JSON, invalid body (422)"],
  ["slow", "G. One awaited 2 ms step, then JSON"],
];
const n = (x) => Math.round(x).toLocaleString("en-US");
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const out = [];
const summary = {};

out.push("# Backend benchmark report", "");
out.push(`Generated from \`results/${rawName}\` (never edited by hand). Run: ${data.date}.`, "");
out.push(`Machine: ${data.machine.cpu}, ${data.machine.cores} cores, ${data.machine.memoryGb} GB, ${data.machine.os}, Node ${data.machine.node}. Load tool: ${data.config.tool}, ${data.config.connections} connections, ${data.config.warmupSeconds} s warm-up, ${data.config.loadRuns} runs of ${data.config.loadSeconds} s, median reported. The load tool and the server share one machine.`, "");
out.push("Contract: [backend/CONTRACT.md](../backend/CONTRACT.md). Every response was checked against it before measuring.", "");

out.push("## Versions", "", "| Framework | Version | Kind |", "|---|---|---|");
for (const [, f] of fws) out.push(`| ${f.name} | ${f.version}${f.coreVersion ? ` (core ${f.coreVersion})` : ""} | ${f.kind === "backend" ? "backend framework" : f.kind === "pages" ? "full-stack framework, API route" : "Devora.js backend-only app"} |`);
out.push("");

for (const [key, title] of SC) {
  const rows = fws.filter(([, f]) => f.load?.[key]).map(([k, f]) => ({ k, name: f.name, ...f.load[key] })).sort((a, b) => b.rps.median - a.rps.median);
  out.push(`## ${title}`, "", "| # | Framework | Requests/s (median, min–max) | p50 ms | p99 ms | Errors or unexpected |", "|---|---|---|---|---|---|");
  rows.forEach((r, i) => out.push(`| ${i + 1} | ${r.name} | ${n(r.rps.median)} (${n(r.rps.min)}–${n(r.rps.max)}) | ${f1(r.p50.median)} | ${f1(r.p99.median)} | ${r.errorsOrUnexpected.reduce((a, b) => a + b, 0)} |`));
  const d = rows.find((r) => r.k === "devora-api");
  const leader = rows[0];
  // A difference inside the run-to-run spread is a tie: ranges (min to max of the runs) that overlap.
  const overlaps = (a, b) => a.rps.min <= b.rps.max && b.rps.min <= a.rps.max;
  const beyond = rows.filter((r) => r.k !== "devora-api" && r.rps.min > d.rps.max);
  const tied = rows.filter((r) => r.k !== "devora-api" && overlaps(r, d));
  summary[key] = { leader: leader?.name, devoraRank: rows.indexOf(d) + 1, of: rows.length, devoraRps: d.rps.median, leaderRps: leader.rps.median, behindPercent: Math.round((1 - d.rps.median / leader.rps.median) * 100), beyondCount: beyond.length, tiedWith: tied.map((r) => r.name), kind: beyond.length ? "behind" : tied.length ? "tie" : "first" };
  out.push("", beyond.length
    ? `Leader: **${leader.name}**. Devora.js is behind ${beyond.length} framework${beyond.length === 1 ? "" : "s"} beyond its run-to-run spread (median ${n(d.rps.median)} against ${n(leader.rps.median)} req/s, ${summary[key].behindPercent}% lower)${tied.length ? `, and level with ${tied.map((r) => r.name).join(", ")}` : ""}.`
    : tied.length ? `Devora.js is not behind anyone beyond the spread; it is level with ${tied.map((r) => r.name).join(", ")} (median ${n(d.rps.median)} req/s).` : `Devora.js is ahead of every other framework (${n(d.rps.median)} req/s).`, "");
}

out.push("## Memory, start and build", "", "| Framework | Idle MB | After load MB | Start ms (median) | Build cold ms | Build warm ms |", "|---|---|---|---|---|---|");
for (const [, f] of fws) out.push(`| ${f.name} | ${n(f.idleMemoryMb.median)} | ${n(f.memoryAfterLoadMb)} | ${n(f.startMs.median)} | ${n(f.build.coldMs.median)} | ${n(f.build.warmMs.median)} |`);
out.push("", "Backend frameworks written in plain JavaScript have no build step; their \"build\" is a no-op command.", "");

out.push("## Response bytes on the wire", "", "Body bytes, header bytes and `Content-Encoding` for one request per scenario, sent with only the load tool's headers (what the timed runs used) and with a browser's `Accept-Encoding: gzip, deflate, br`.", "");
out.push("| Framework | Scenario | Load tool: body B / header B / encoding | Browser: body B / header B / encoding |", "|---|---|---|---|");
for (const [, f] of fws) for (const [key] of SC) {
  const w = f.wire?.[key];
  if (!w) continue;
  out.push(`| ${f.name} | ${key} | ${w.loadTool.bodyBytes} / ${w.loadTool.headerBytes} / ${w.loadTool.contentEncoding ?? "identity"} | ${w.browser.bodyBytes} / ${w.browser.headerBytes} / ${w.browser.contentEncoding ?? "identity"} |`);
}
out.push("", "## Contract conformance", "", "| Framework | " + SC.map(([k]) => k).join(" | ") + " |", "|---|" + SC.map(() => "---").join("|") + "|");
for (const [, f] of fws) out.push(`| ${f.name} | ${SC.map(([k]) => (f.conforms?.[k] ? "yes" : "NO")).join(" | ")} |`);

out.push("", "## Where Devora.js is ahead, level or behind", "", "A difference inside the run-to-run spread (ranges of the runs that overlap) is a tie.", "");
const label = (k) => SC.find(([x]) => x === k)[1].split(".")[0];
const grp = (kind) => SC.filter(([k]) => summary[k]?.kind === kind).map(([k]) => (kind === "behind" ? `${label(k)} (${summary[k].leader})` : kind === "tie" ? `${label(k)} (with ${summary[k].tiedWith.join(", ")})` : label(k)));
out.push(`Ahead of every other framework: ${grp("first").join("; ") || "no scenario"}.`, "", `Level: ${grp("tie").join("; ") || "no scenario"}.`, "", `Behind: ${grp("behind").join("; ") || "no scenario"}.`, "");
out.push("Devora.js sends CSP, HSTS and X-Frame-Options on every response and runs a real session layer for the authenticated scenario; the bare backend frameworks do neither. See the header bytes above and `backend/CONTRACT.md`.", "");

writeFileSync(path.join(dir, "backend-report.md"), out.join("\n") + "\n");
writeFileSync(path.join(dir, "backend-latest.json"), JSON.stringify({ source: rawName, summary, ...data }, null, 2) + "\n");
console.log("wrote results/backend-report.md");
