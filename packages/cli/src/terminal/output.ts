import { createPaint, formatHeader, terminalInfo, type Paint } from "@devorajs/scaffold";

// Replaced with package.json's version by build.mjs (esbuild `define`);
// undefined only when running from source via tsx.
declare const __DEVORA_CLI_VERSION__: string | undefined;

export const CLI_VERSION = typeof __DEVORA_CLI_VERSION__ === "string" ? __DEVORA_CLI_VERSION__ : "0.0.0-source";

/**
 * `--quiet` on dev/build/start: no header, no route tables, no progress
 * lines, and Vite at "warn". Warnings and errors still print.
 */
let quiet = false;

export function setQuiet(value: boolean | undefined): void {
  quiet = value === true;
}

export function isQuiet(): boolean {
  return quiet;
}

/** Vite's logLevel for the current output mode (undefined = Vite's default). */
export function viteLogLevel(): "warn" | undefined {
  return quiet ? "warn" : undefined;
}

/** A progress line, dropped under --quiet. */
export function info(message: string): void {
  if (!quiet) console.log(message);
}

export function stdoutPaint(): Paint {
  return createPaint(terminalInfo(process.stdout).level);
}

/** The branded header (see @devorajs/scaffold's terminal.ts), with a blank line either side. */
export function printHeader(detail: string): void {
  if (quiet) return;
  console.log(`\n${formatHeader({ version: CLI_VERSION, detail }, terminalInfo(process.stdout))}\n`);
}

/** "1 app" / "3 apps". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** 812 → "812 ms", 4210 → "4.2 s". */
export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
