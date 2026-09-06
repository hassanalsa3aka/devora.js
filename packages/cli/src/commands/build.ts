import { loadProjectConfig } from "@devora/core/config-loader";
import { buildAppForAdapter } from "../build/buildForAdapter.js";

export async function build(opts: { app?: string; adapter?: string }) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  for (const app of apps) {
    await buildAppForAdapter(root, project, app, opts.adapter);
  }
}
