import { resolveAuthMode } from "@devora/core";
import { loadProjectConfig } from "@devora/core/config-loader";

/**
 * `devora list` — a real, previously-missing gap: there was no way to see
 * what's actually registered in devora.config.ts without opening the file.
 * Read-only, no filesystem writes — the safest kind of "useful command" to
 * add without asking first.
 */
export async function list(): Promise<void> {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  if (project.apps.length === 0) {
    console.log("[devora] no apps registered in devora.config.ts");
    return;
  }

  console.log(`[devora] ${project.apps.length} app(s) in devora.config.ts:\n`);
  for (const app of project.apps) {
    const authMode = resolveAuthMode(project, app.name);
    console.log(`  ${app.name}`);
    console.log(`    dir:    ${app.dir}`);
    console.log(`    domain: ${app.domain}`);
    console.log(`    auth:   ${authMode}${app.auth ? "" : " (project default)"}`);
  }
}
