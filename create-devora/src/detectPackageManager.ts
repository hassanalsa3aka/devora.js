export type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * `npm create devora@latest`, `yarn create devora@latest`, and `pnpm create
 * devora@latest` all set `npm_config_user_agent` to identify which tool
 * invoked this script (e.g. `pnpm/9.9.0 npm/? node/v20...`) — the same
 * mechanism create-vite/create-next-app use to pick the right follow-up
 * install command without asking. Falls back to `npm` if run directly
 * (`node dist/index.js`, no such env var at all).
 */
export function detectPackageManager(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  return "npm";
}

export function installCommand(pm: PackageManager): [string, string[]] {
  if (pm === "pnpm") return ["pnpm", ["install"]];
  if (pm === "yarn") return ["yarn", ["install"]];
  return ["npm", ["install"]];
}

export function runScriptCommand(pm: PackageManager, script: string): [string, string[]] {
  if (pm === "pnpm") return ["pnpm", ["run", script]];
  if (pm === "yarn") return ["yarn", [script]];
  return ["npm", ["run", script]];
}
