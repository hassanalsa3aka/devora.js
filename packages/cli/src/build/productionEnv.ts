/**
 * `devora build`/`deploy`/`start` always mean production (see build.ts for
 * the "jsxDEV is not a function" bug that made this unconditional) — but
 * replacing the caller's NODE_ENV shouldn't be silent. `start` reports any
 * change, since it decides how the server behaves at runtime (Secure
 * cookies, required secrets); `build`/`deploy` only report overriding a
 * value someone explicitly set, so a normal CI build stays quiet.
 */
export function forceProductionNodeEnv(command: "build" | "deploy" | "start"): void {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  if (previous === "production") return;
  const wasUnset = previous === undefined || previous === "";
  if (wasUnset && command !== "start") return;
  console.log(
    `[devora] NODE_ENV=production (${wasUnset ? "was unset" : `overriding "${previous}"`}) — ` +
      `devora ${command} always runs in production mode`
  );
}

/** A port from `--port`/`PORT`: an integer 1–65535, or undefined after printing why not. */
export function parsePort(raw: string, source: string): number | undefined {
  const trimmed = raw.trim();
  const port = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[devora] ${source} must be a port number from 1 to 65535 (got "${raw}")`);
    return undefined;
  }
  return port;
}
