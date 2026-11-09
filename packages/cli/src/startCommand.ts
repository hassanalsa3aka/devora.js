import type { Command } from "commander";
import { start } from "./commands/start.js";

export const QUIET_HELP = "only warnings, errors and the app URLs — no header, route tables or progress lines";

/** The `devora start` command, defined once for the full CLI (index.ts) and for the start-only entry (startEntry.ts). */
export function addStartCommand(program: Command): void {
  program
    .command("start")
    .description("Serve a production build (adapter-node) — run `devora build` first")
    .option("--app <name>", "serve only this app")
    .option("--port <port>", "starting port (default: $PORT, else 4173; increments per app)")
    .option("--host <host>", "interface to bind (default: $HOST, else all interfaces)")
    .option("--quiet", QUIET_HELP)
    .action(async (opts) => start(opts));
}
