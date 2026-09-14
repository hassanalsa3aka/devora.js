import path from "node:path";
import type { ProjectConfig } from "@devorajs/core";

/**
 * `devora split <app-name|backend>` / `devora sync <name>` both take either
 * a real app name (looked up in devora.config.ts, same as every other
 * per-app CLI command) or the literal `"backend"` (packages/backend has no
 * entry of its own in devora.config.ts's `apps` array — it's named via
 * `shared.backend` instead) — resolved explicitly here so both commands
 * agree on what a name means, rather than each re-implementing the same
 * special case.
 */
export function resolveSplitTarget(root: string, project: ProjectConfig, name: string): string {
  if (name === "backend") {
    return path.join(root, project.shared.backend);
  }
  const app = project.apps.find((a) => a.name === name);
  if (!app) {
    throw new Error(`[devora] no app named "${name}" in devora.config.ts (and it isn't "backend" either)`);
  }
  return path.join(root, app.dir);
}
