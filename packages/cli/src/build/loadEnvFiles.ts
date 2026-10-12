import path from "node:path";
import { existsSync } from "node:fs";
import { loadEnv } from "vite";
import { info } from "../terminal/output.js";

/**
 * Loads the project root's .env files into process.env before a command
 * reads config or starts servers (round 3: nothing loaded them, so people
 * ran the CLI through `node --env-file`). Same files and precedence as Vite
 * — highest first:
 *
 *   .env.<mode>.local  >  .env.<mode>  >  .env.local  >  .env
 *
 * with mode "development" for `devora dev` and "production" for build,
 * start and deploy. A variable already set in the environment (by the
 * shell, Docker, Vercel/Netlify) always wins over every file. Only the
 * project root is read: `devora dev` runs every app in one process, so
 * per-app files would overwrite each other. Values are never printed.
 */
export function loadProjectEnv(root: string, mode: "development" | "production"): string[] {
  const files = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`].filter((f) => existsSync(path.join(root, f)));
  if (files.length === 0) return [];
  const before = new Set(Object.keys(process.env));
  // prefix "" = every variable, not just VITE_* (it also returns process.env's, which is why `before` is checked).
  const loaded = loadEnv(mode, root, "");
  for (const [key, value] of Object.entries(loaded)) {
    if (!before.has(key)) process.env[key] = value;
  }
  info(`[devora] loaded ${files.join(", ")}`);
  return files;
}
