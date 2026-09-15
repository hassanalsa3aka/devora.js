#!/usr/bin/env node
import { Command } from "commander";
import { dev } from "./commands/dev.js";
import { build } from "./commands/build.js";
import { start } from "./commands/start.js";
import { deploy } from "./commands/deploy.js";
import { newApp, scaffoldApp } from "./commands/new.js";
import { removeApp } from "./commands/remove.js";
import { list } from "./commands/list.js";
import { generateProxy } from "./commands/generate-proxy.js";
import { split } from "./commands/split.js";
import { sync } from "./commands/sync.js";
import { status } from "./commands/status.js";

const program = new Command();

program
  .name("devora")
  .description("Devora.js CLI — the multi-app, security-first framework")
  .version("0.1.0");

program
  .command("dev")
  .description("Run all apps in dev mode (or one with --app)")
  .option("--app <name>", "run only this app")
  .action(async (opts) => dev(opts));

program
  .command("build")
  .description("Build all apps (or one with --app)")
  .option("--app <name>", "build only this app")
  .option("--adapter <target>", "also write output for this adapter: vercel or netlify")
  .action(async (opts) => build(opts));

program
  .command("start")
  .description("Serve a production build (adapter-node) — run `devora build` first")
  .option("--app <name>", "serve only this app")
  .option("--port <port>", "starting port (default 4173, increments per app)")
  .action(async (opts) => start(opts));

program
  .command("deploy")
  .description(
    "Build and deploy to Vercel or Netlify (all apps, or one with --app) — each app must already be linked (`vercel link` / `netlify link`) to its own project/site"
  )
  .requiredOption("--adapter <target>", "vercel or netlify")
  .option("--app <name>", "deploy only this app")
  .option("--prod", "deploy to production (default: preview)")
  .action(async (opts) => deploy(opts));

program
  .command("new <appName>")
  .description("Scaffold a new app inside the project")
  .option("--domain <domain>", "domain to register in devora.config.ts")
  .option("--auth <mode>", 'auth mode for this app: "shared", "isolated", or "none" (prompts if omitted)')
  .action(async (appName, opts) => newApp(appName, opts));

program
  .command("add <appName>")
  .description("Scaffold a new app inside the project and register it in devora.config.ts (alias for `new`)")
  .option("--domain <domain>", "domain to register in devora.config.ts")
  .option("--auth <mode>", 'auth mode for this app: "shared", "isolated", or "none" (prompts if omitted)')
  .action(async (appName, opts) => scaffoldApp(appName, opts));

program
  .command("remove <appName>")
  .alias("rm")
  .description("Delete apps/<name> and its devora.config.ts entry (undoes new/add)")
  .action(async (appName) => removeApp(appName));

program
  .command("list")
  .alias("ls")
  .description("List every app registered in devora.config.ts")
  .action(async () => list());

program
  .command("split <name>")
  .description(
    "Convert apps/<name> (or the literal \"backend\") into a git submodule pointing at --repo (create the empty remote yourself first)"
  )
  .requiredOption("--repo <url>", "the empty remote repo's URL")
  .option("--yes", "skip the confirmation prompt (for scripted use)")
  .action(async (name, opts) => split(name, opts));

program
  .command("sync [names...]")
  .description("Pull/push a split-off app or backend against its own remote — one of --from-main or --to-main is required")
  .option("--from-main", "merge the split repo's latest into the local checkout")
  .option("--to-main", "push local commits made inside the split repo's checkout")
  .option("--all", "every split-off app/backend, instead of naming them")
  .option("--yes", "skip the confirmation prompt (for scripted use)")
  .action(async (names, opts) => sync(names, opts));

program
  .command("status")
  .description("Sync state (up to date / unpushed / unpulled / diverged) across every split-off app/backend")
  .action(async () => status());

program
  .command("generate:proxy")
  .description("Generate a reverse-proxy config from devora.config.ts domains")
  .requiredOption("--target <target>", "nginx or caddy")
  .option("--out <path>", "output file path")
  .action(async (opts) => generateProxy(opts));

// pnpm (unlike npm/Yarn) forwards a literal "--" through `pnpm run <script> --
// <args>` instead of stripping it as an end-of-options marker, which made
// `--app=admin` land as a positional argument and get ignored — starting
// every app instead of just one. This CLI has no positional arguments for
// any command, so "--" has no legitimate use here; stripped unconditionally
// rather than special-cased per package manager.
const argv = process.argv.filter((arg) => arg !== "--");

program.parseAsync(argv);
