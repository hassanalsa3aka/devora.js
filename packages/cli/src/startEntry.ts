/**
 * `devora start` without the rest of the CLI. The `devora` launcher (dist/devora.js) loads this file when the command is `start`, so a
 * production server does not load, compile or initialise the dev, build, desktop and scaffold code it never uses: about 8 MB less
 * resident memory for an API app (measured: 70.4 MB with the full CLI, 62.2 MB with this entry).
 */
import { Command } from "commander";
import { addStartCommand } from "./startCommand.js";
import { CLI_VERSION, setQuiet } from "./terminal/output.js";
import { reportFatal } from "./fatal.js";

const program = new Command();
program.name("devora").description("Devora.js CLI — the multi-app, security-first framework").version(CLI_VERSION);
program.hook("preAction", (_program, command) => setQuiet(command.opts().quiet));
addStartCommand(program);

// same normalisation as index.ts: a stray "--" from a package manager is dropped
program.parseAsync(process.argv.filter((arg) => arg !== "--")).catch((err) => {
  if (reportFatal(err)) return;
  throw err;
});
