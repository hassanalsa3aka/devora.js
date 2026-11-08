// Child process for graph.test.ts: loads modules through the real server hooks, applies the steps it is given, prints the results.
import fs from "node:fs";
import path from "node:path";
import { createServerModuleHost } from "../serverModules.js";

const spec = JSON.parse(process.argv[2]!) as { dir: string; steps: Record<string, any>[] };
const dir = fs.realpathSync(spec.dir);
const host = await createServerModuleHost({ appId: "t", projectRoot: dir, roots: [{ prefix: "/_devora/m/app/", dir }] });
const abs = (f: string) => path.join(dir, f);
const rel = (files: string[]) => files.map((f) => path.relative(dir, f)).sort();
const results: unknown[] = [];
(globalThis as any).__runs = {};
for (const step of spec.steps) {
  if (step.write) fs.writeFileSync(abs(step.write), step.content);
  else if (step.rm) fs.rmSync(abs(step.rm));
  else if (step.rename) fs.renameSync(abs(step.rename[0]), abs(step.rename[1]));
  else if (step.invalidate) results.push({ invalidated: rel(host.invalidate(abs(step.invalidate))) });
  else if (step.load) {
    try {
      const m = await host.ssrLoadModule(abs(step.load));
      const exports: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(m)) exports[k] = typeof v === "function" ? (v as () => unknown)() : v;
      results.push({ load: step.load, exports, runs: { ...(globalThis as any).__runs } });
    } catch (error) {
      results.push({ load: step.load, error: String((error as Error).message).split("\n")[0] });
    }
  }
}
console.log("RESULT " + JSON.stringify(results));
