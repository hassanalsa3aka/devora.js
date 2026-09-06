import { loadProjectConfig } from "@devora/core/config-loader";
import { buildAppForAdapter } from "../build/buildForAdapter.js";
import { isVercelLinked, deployToVercel } from "@devora/adapter-vercel";
import { isNetlifyLinked, deployToNetlify } from "@devora/adapter-netlify";

/**
 * Multi-app-aware deploy orchestration (ROADMAP.md's §13 N:N item —
 * previously `devora build --adapter=X` produced N completely independent,
 * uncoordinated per-app output directories and nothing ever actually
 * deployed anything). Rebuilds each app fresh, then shells out to the real
 * platform CLI for every app that's already linked to a Vercel project /
 * Netlify site (see adapters/*\/src/deploy.ts) — apps that aren't linked
 * yet are skipped with a clear instruction, not silently ignored or hard-
 * failed, since "not linked yet" is the normal state for a freshly
 * scaffolded app. One app's failure doesn't abort the rest.
 */
export async function deploy(opts: { adapter?: string; app?: string; prod?: boolean }): Promise<void> {
  if (opts.adapter !== "vercel" && opts.adapter !== "netlify") {
    console.error(`[devora] --adapter must be "vercel" or "netlify"`);
    process.exit(1);
  }
  const adapter = opts.adapter;

  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  const isLinked = adapter === "vercel" ? isVercelLinked : isNetlifyLinked;
  const deployFn = adapter === "vercel" ? deployToVercel : deployToNetlify;
  const linkCmd = adapter === "vercel" ? "vercel link" : "netlify link";

  const deployed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const app of apps) {
    try {
      const { appRoot } = await buildAppForAdapter(root, project, app, adapter);

      if (!isLinked(appRoot)) {
        console.log(
          `[devora] "${app.name}" isn't linked to a ${adapter} project yet — run \`cd ${app.dir} && ${linkCmd}\` first. Skipping.`
        );
        skipped.push(app.name);
        continue;
      }

      console.log(
        `[devora] deploying "${app.name}" to ${adapter} (${opts.prod ? "production" : "preview"})...`
      );
      const { ok } = await deployFn(appRoot, { prod: opts.prod });
      if (ok) {
        deployed.push(app.name);
      } else {
        console.error(`[devora] "${app.name}" deploy failed — see ${adapter} CLI output above.`);
        failed.push(app.name);
      }
    } catch (err) {
      console.error(`[devora] "${app.name}" failed before deploy could run:`, err);
      failed.push(app.name);
    }
  }

  console.log(`\n[devora] deploy summary (${adapter}):`);
  console.log(`  deployed: ${deployed.length > 0 ? deployed.join(", ") : "none"}`);
  console.log(`  skipped (not linked): ${skipped.length > 0 ? skipped.join(", ") : "none"}`);
  console.log(`  failed: ${failed.length > 0 ? failed.join(", ") : "none"}`);

  // A single explicitly-requested app that didn't deploy means nothing
  // happened at all — a real failure, unlike "deploy everything" where some
  // apps not being linked yet is a normal, expected state.
  if (opts.app && deployed.length === 0) process.exit(1);
  if (failed.length > 0) process.exit(1);
}
