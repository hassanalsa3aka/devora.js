#!/usr/bin/env node
/**
 * Merges the per-framework raw files of the container run (results/*-raw-<date>-container-<tag>.json or
 * raw-<date>-container-<tag>.json) into one file per suite and Devora.js variant, so report-backend.mjs, report.mjs
 * and compare.mjs can read them:
 *   node work-notes/perf/scripts/merge-container-runs.mjs <date>
 * writes benchmarks/results/{backend-raw,raw}-<date>-container-{0.3.5,branch}.json
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const date = process.argv[2];
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../benchmarks/results");
for (const [prefix, devoraKey] of [["backend-raw", "devora-api"], ["raw", "devora"]]) {
  const files = readdirSync(dir).filter((f) => f.startsWith(`${prefix}-${date}-container-`) && f.endsWith(".json") && !/-container-(0\.3\.5|branch)\.json$/.test(f));
  const others = files.filter((f) => !f.includes(`-container-${devoraKey}-`));
  for (const variant of ["0.3.5", "branch"]) {
    const own = files.find((f) => f.includes(`-container-${devoraKey}-${variant}.json`));
    if (!own) continue;
    const merged = JSON.parse(readFileSync(path.join(dir, own), "utf-8"));
    merged.sources = [own];
    for (const f of others) {
      const data = JSON.parse(readFileSync(path.join(dir, f), "utf-8"));
      Object.assign(merged.frameworks, data.frameworks);
      merged.sources.push(f);
    }
    const out = `${prefix}-${date}-container-${variant}.json`;
    writeFileSync(path.join(dir, out), JSON.stringify(merged, null, 2) + "\n");
    console.log(`${out}: ${Object.keys(merged.frameworks).join(", ")}`);
  }
}
