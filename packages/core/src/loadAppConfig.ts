import path from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type { AppRuntimeConfig } from "./config.js";

/**
 * Loads apps/<name>/app.config.ts, same jiti (no eval) approach as
 * loadProjectConfig.ts. Nothing read this file before ROADMAP.md #5 — it's
 * where `security` (CSP/HSTS/frameOptions overrides) lives.
 */
export async function loadAppConfig(appRoot: string): Promise<AppRuntimeConfig> {
  const configPath = path.join(appRoot, "app.config.ts");
  if (!existsSync(configPath)) return {};

  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const mod = (await jiti.import(configPath)) as { default: AppRuntimeConfig };
  return mod.default ?? {};
}
