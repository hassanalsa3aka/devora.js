import path from "node:path";
import type { ProjectConfig } from "@devorajs/core";
import { assertInsideRoot } from "./gitHelpers.js";

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
    const target = path.join(root, project.shared.backend);
    assertInsideRoot(root, target, "shared.backend");
    return target;
  }
  const app = project.apps.find((a) => a.name === name);
  if (!app) {
    throw new Error(`[devora] no app named "${name}" in devora.config.ts (and it isn't "backend" either)`);
  }
  const target = path.join(root, app.dir);
  assertInsideRoot(root, target, `apps.${name}.dir`);
  return target;
}

/**
 * The inverse of `resolveSplitTarget` — given a real directory (e.g. a
 * `.gitmodules` entry's path, relative to `root`), finds the name `devora
 * sync`/`split` would actually accept for it. Real bug this fixes:
 * `status.ts` used to print `devora sync <submodule-path> ...` as a
 * suggested next command — `<submodule-path>` (e.g. `apps/admin`) is not
 * what `sync`'s own name resolution accepts (an app's `name` field, e.g.
 * `admin`, which isn't guaranteed to match its directory's basename; or the
 * literal `backend` for `packages/backend`, never that literal path) — so a
 * copy-pasted suggested command could fail with "no app named ... in
 * devora.config.ts" even though the submodule genuinely exists. Falls back
 * to the raw relative path only if nothing in the project config actually
 * matches it (shouldn't happen for a real `devora split`-created entry, but
 * failing to print a garbage suggestion beats throwing here).
 */
export function nameForSplitTarget(root: string, project: ProjectConfig, relativePath: string): string {
  if (path.normalize(project.shared.backend) === path.normalize(relativePath)) {
    return "backend";
  }
  const app = project.apps.find((a) => path.normalize(a.dir) === path.normalize(relativePath));
  return app?.name ?? relativePath;
}
