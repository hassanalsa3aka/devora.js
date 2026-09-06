import path from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type { ProjectConfig } from "./config.js";

/**
 * Loads devora.config.ts from the given project root.
 * Uses jiti (transpile-on-require) rather than eval — see DEPENDENCIES.md.
 */
export async function loadProjectConfig(root: string = process.cwd()): Promise<ProjectConfig> {
  const configPath = path.join(root, "devora.config.ts");
  if (!existsSync(configPath)) {
    throw new Error(
      `[devora] no devora.config.ts found at ${configPath}. ` +
        `Every Devora.js project must declare its apps here — see architecture doc §3.`
    );
  }

  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const mod = (await jiti.import(configPath)) as { default: ProjectConfig };
  const config = mod.default;

  if (!config?.apps?.length) {
    throw new Error(`[devora] devora.config.ts must declare at least one app.`);
  }

  return config;
}

export function resolveAppDir(root: string, appDir: string): string {
  return path.join(root, appDir);
}
