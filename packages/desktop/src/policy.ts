/**
 * The window's navigation and IPC policy as data, so the generated shell configuration and the tests read the
 * same rules.
 */

/** The window may show only the sidecar's own origin. */
export function isAllowedNavigation(target: string, origin: string): boolean {
  try {
    return new URL(target).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

/** A link to another origin may go to the system browser only when it is plain https (never file:, javascript:, data:, custom schemes). */
export function mayOpenExternally(target: string): boolean {
  try {
    const url = new URL(target);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

const COMMAND_NAME = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * `desktop.ipc` from app.config.ts: the commands the window may call. Default none. Every entry must be a plain
 * command name; anything else (a wildcard, a path, a plugin permission string) is refused, so the list cannot grant
 * more than it names.
 */
export function parseIpcAllowlist(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("[devora desktop] desktop.ipc must be a list of command names");
  const names = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !COMMAND_NAME.test(entry)) {
      throw new Error(`[devora desktop] desktop.ipc entry ${JSON.stringify(entry)} is not a command name such as "open_file_dialog"`);
    }
    names.add(entry);
  }
  return [...names];
}
