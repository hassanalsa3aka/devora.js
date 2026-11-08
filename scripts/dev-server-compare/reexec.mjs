#!/usr/bin/env node
// What it costs, per edit, to re-execute the server module graph: the 200-module app, one edit of the leaf component, then
// the first page request that shows the edit. Vite invalidates the edited module and its importers; the experimental server
// re-executes the whole app graph. Reported per edit, for both servers: edit -> first response with the new text, and the
// duration of that response alone, against a steady-state request without an edit. Starts both servers itself (port 11021).
//   node scripts/dev-server-compare/reexec.mjs [--edits=10] [--vite-watch='{"usePolling":false,"useFsEvents":false}']
import fs from "node:fs";
import { PORT_BIG as PORT, get, makeSyntheticProject, now, sleep, startServer } from "./lib.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const EDITS = Number(arg("edits", 10));
const viteWatch = arg("vite-watch", '{"usePolling":false,"useFsEvents":false}'); // Vite's default file watcher on macOS adds about 100 ms; see RESULTS
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const range = (xs) => `${Math.min(...xs).toFixed(0)}-${Math.max(...xs).toFixed(0)}`;

const project = makeSyntheticProject({ name: "reexec", port: PORT, modules: 200 });
const original = fs.readFileSync(project.leaf, "utf8");
const failures = [];
const summary = {};
try {
  for (const experimental of [false, true]) {
    const name = experimental ? "own" : "vite";
    const server = await startServer({ root: project.root, experimental, port: PORT, env: experimental ? {} : { COMPARE_VITE_WATCH: viteWatch } });
    try {
      const url = `http://localhost:${PORT}/`;
      for (let i = 0; i < 3; i++) if (!(await get(url)).ok) failures.push(`${name}: warm-up request failed`);
      const steady = [];
      for (let i = 0; i < 15; i++) {
        const t = now();
        const r = await get(url);
        if (!r.ok || r.status !== 200) failures.push(`${name}: steady request failed (${r.error ?? r.status})`);
        steady.push(now() - t);
        await sleep(30);
      }
      const visible = [];
      const response = [];
      for (let i = 0; i < EDITS; i++) {
        const text = `leaf-edit-${i}`;
        const written = now();
        fs.writeFileSync(project.leaf, original.replace("leaf-v1", text));
        let found = false;
        for (let tries = 0; tries < 400 && !found; tries++) {
          const t = now();
          const r = await get(url, { timeout: 20000 });
          const dt = now() - t;
          if (!r.ok || r.status !== 200) {
            failures.push(`${name}: request failed after edit ${i} (${r.error ?? r.status})`);
            break;
          }
          if (r.body.includes(text)) {
            visible.push(now() - written);
            response.push(dt);
            found = true;
          } else await sleep(5);
        }
        if (!found) failures.push(`${name}: edit ${i} never showed up in the page`);
        await sleep(200);
      }
      summary[name] = { steady_ms: median(steady), steadyRange: range(steady), response_ms: median(response), responseRange: range(response), visible_ms: median(visible), visibleRange: range(visible), n: response.length };
    } finally {
      fs.writeFileSync(project.leaf, original);
      await server.stop();
    }
  }
} catch (error) {
  failures.push(String(error.message ?? error));
} finally {
  project.cleanup();
}
console.log(`\n200-module app, ${EDITS} edits of the leaf component (Vite watch options: ${viteWatch}); medians, ranges in brackets, milliseconds`);
for (const [name, s] of Object.entries(summary)) {
  console.log(`  ${name.padEnd(5)} steady request ${s.steady_ms.toFixed(0)} (${s.steadyRange})   first response after an edit ${s.response_ms.toFixed(0)} (${s.responseRange})   edit -> new text in the page ${s.visible_ms.toFixed(0)} (${s.visibleRange})   n=${s.n}`);
  console.log(`        cost of the edit on the server side (first response minus steady): ${(s.response_ms - s.steady_ms).toFixed(0)} ms`);
}
if (failures.length > 0) {
  console.log(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nPASS");
