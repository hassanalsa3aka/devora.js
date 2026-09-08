#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  resolveAuthChoice,
  scaffoldAppFiles,
  scaffoldProjectFiles,
  type ScaffoldProjectApp,
} from "@devorajs/scaffold";
import { detectPackageManager, installCommand, runScriptCommand } from "./detectPackageManager.js";

/**
 * `runScriptCommand`/`installCommand` return a `[cmd, args]` tuple (meant
 * to be destructured for `spawnSync`) — a real bug here called `.join(" ")`
 * directly on that tuple without flattening first, which stringifies the
 * nested `args` array with its own default comma separator instead of
 * spaces (`"npm run,dev"` instead of `"npm run dev"`), caught by actually
 * running this and reading the printed output, not just reading the code.
 */
function formatCommand([cmd, args]: [string, string[]]): string {
  return [cmd, ...args].join(" ");
}

/**
 * The standalone `npx create-devora`/`yarn create devora`/`pnpm create
 * devora` installer — works from a completely empty directory, before any
 * devora.config.ts exists, unlike `devora new`/`add` (packages/cli/src/
 * commands/new.ts), which only ever run *inside* an already-scaffolded
 * project. Shares its actual file-generation with that command via
 * `@devorajs/scaffold`, not a second copy of the same templates — see that
 * package's `scaffoldAppFiles`/`scaffoldProjectFiles` doc comments for why
 * project-root scaffolding and one-app scaffolding stay two functions
 * rather than one.
 *
 * `@devorajs/core`/`@devorajs/cli` are pinned to a real semver range here
 * (CORE_VERSION/CLI_VERSION below), not `"*"` — inside the devora.js
 * monorepo itself they're sibling workspace packages; here, for a
 * genuinely standalone scaffolded project, they're ordinary published npm
 * packages (see `ScaffoldAppOptions`'s doc comment in `@devorajs/scaffold`
 * for the same distinction from the other direction).
 */
const CORE_VERSION = "^0.1.0";
const CLI_VERSION = "^0.1.0";

function parseArgs(argv: string[]) {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === "--skip-install") {
      flags["skip-install"] = "true";
    } else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) {
        flags[arg.slice(2)] = "true";
      } else {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

async function prompt(question: string, fallback: string): Promise<string> {
  if (!process.stdin.isTTY) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} (default: ${fallback}): `)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));

  const projectName = positional[0] ?? (await prompt("Project name?", "my-devora-app"));
  const projectRoot = path.resolve(process.cwd(), projectName);

  if (existsSync(projectRoot)) {
    console.error(`[create-devora] "${projectName}" already exists — pick a different name or remove it first.`);
    process.exit(1);
  }

  const appNamesRaw =
    flags.apps ?? (await prompt("App names (comma-separated)?", "marketing,dashboard,admin"));
  const appNames = appNamesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (appNames.length === 0) {
    console.error("[create-devora] at least one app name is required.");
    process.exit(1);
  }

  // --auth=name1:mode1,name2:mode2 skips the per-app prompt for named apps;
  // any app not covered still gets asked (or falls back to "shared" — same
  // non-TTY default resolveAuthChoice already uses for `devora new`/`add`).
  const authOverrides = new Map<string, string>();
  for (const pair of (flags.auth ?? "").split(",")) {
    const [name, mode] = pair.split(":");
    if (name && mode) authOverrides.set(name.trim(), mode.trim());
  }

  const apps: ScaffoldProjectApp[] = [];
  for (const name of appNames) {
    const auth = await resolveAuthChoice(authOverrides.get(name), name);
    apps.push({ name, domain: `${name}.example.com`, auth });
  }

  console.log(`\n[create-devora] scaffolding "${projectName}" (${apps.length} app${apps.length === 1 ? "" : "s"})...`);

  await scaffoldProjectFiles(projectRoot, {
    projectName,
    apps,
    coreVersion: CORE_VERSION,
    cliVersion: CLI_VERSION,
  });

  for (const app of apps) {
    await scaffoldAppFiles(path.join(projectRoot, "apps", app.name), app.name, {
      authMode: app.auth,
      coreVersion: CORE_VERSION,
      cliInvocation: "standalone",
    });
  }

  console.log(`[create-devora] wrote ${projectRoot}`);

  const pm = (flags.pm as "npm" | "yarn" | "pnpm" | undefined) ?? detectPackageManager();

  if (flags["skip-install"]) {
    const [cmd] = installCommand(pm);
    console.log(`\n[create-devora] skipped install (--skip-install). Next steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  ${cmd} install`);
    console.log(`  ${formatCommand(runScriptCommand(pm, "dev"))}`);
    return;
  }

  console.log(`\n[create-devora] installing dependencies with ${pm}...`);
  const [installCmd, installArgs] = installCommand(pm);
  const installResult = spawnSync(installCmd, installArgs, { cwd: projectRoot, stdio: "inherit" });

  if (installResult.status !== 0) {
    console.error(
      `\n[create-devora] "${installCmd} ${installArgs.join(" ")}" failed (exit ${installResult.status}). ` +
        `The project was scaffolded at ${projectRoot} — fix the install manually, then run "${formatCommand(runScriptCommand(pm, "dev"))}".`
    );
    process.exit(1);
  }

  console.log(`\n[create-devora] done. Next steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  ${formatCommand(runScriptCommand(pm, "dev"))}`);
}

main().catch((err) => {
  console.error("[create-devora] failed:", err);
  process.exit(1);
});
