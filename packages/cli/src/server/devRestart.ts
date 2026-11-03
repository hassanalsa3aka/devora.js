/**
 * What makes `devora dev` restart itself, and what only earns a message.
 *
 * Restart (all servers are closed and booted again, config and `.env`
 * re-read):
 *  - `app.config.ts` of any app, and `devora.config.ts`: read once at boot;
 *  - `.env`, `.env.local`, `.env.development`, `.env.development.local` in the
 *    project root: loaded into process.env once at boot;
 *  - a route file added, removed or renamed in an app's routes folder or API
 *    folder: the boot summary, the sitemap and the island/CSR manifests are
 *    built from the folder listing. (Editing a route's contents is not a
 *    restart: Vite already hot-reloads it.)
 *
 * Message only (a restart cannot help, because Node keeps the generated
 * client in memory for the life of the process): a Prisma schema or
 * migration changed.
 */
import fs from "node:fs";
import path from "node:path";

export type DevChange =
  | { kind: "restart"; reason: string }
  | { kind: "notice"; message: string }
  | undefined;

export interface DevWatchTargets {
  projectRoot: string;
  /** Absolute app folders. */
  appRoots: string[];
  /** Absolute routes and API folders (route files live here). */
  routeDirs: string[];
  /** Absolute folders that hold a Prisma schema. */
  prismaDirs: string[];
}

const ENV_FILES = new Set([".env", ".env.local", ".env.development", ".env.development.local"]);
const ROUTE_FILE = /\.(tsx?|jsx?|mjs|cjs|mdx?)$/;

const rel = (root: string, file: string) => path.relative(root, file).split(path.sep).join("/");

/**
 * Decides what one file-system event means. `existsNow`/`knownRoute` let a
 * route "rename" event be told apart: an editor that saves by writing a temp
 * file and renaming it over the route reports a rename for a file that was
 * there before and still is, which must not restart anything.
 */
export function classifyDevChange(
  targets: DevWatchTargets,
  file: string,
  state: { existsNow: boolean; knownRoute: boolean }
): DevChange {
  const name = path.basename(file);
  const dir = path.dirname(file);

  if (dir === targets.projectRoot) {
    if (ENV_FILES.has(name)) return { kind: "restart", reason: `${name} changed` };
    if (name === "devora.config.ts") return { kind: "restart", reason: "devora.config.ts changed" };
  }
  if (name === "app.config.ts" && targets.appRoots.includes(dir)) {
    return { kind: "restart", reason: `${rel(targets.projectRoot, file)} changed` };
  }
  for (const prismaDir of targets.prismaDirs) {
    if (file === path.join(prismaDir, "schema.prisma") || file.startsWith(path.join(prismaDir, "migrations") + path.sep)) {
      const where = rel(targets.projectRoot, file);
      return {
        kind: "notice",
        message:
          `${where} changed. Restarting does not reload @prisma/client: run \`prisma generate\` (and \`prisma migrate dev\` ` +
          `for a schema change), then stop and start \`devora dev\` so the new client is loaded.`,
      };
    }
  }
  for (const routeDir of targets.routeDirs) {
    if (!file.startsWith(routeDir + path.sep)) continue;
    if (!ROUTE_FILE.test(name) || name.startsWith(".") || name.endsWith("~")) return undefined;
    if (state.existsNow && !state.knownRoute) return { kind: "restart", reason: `route added: ${rel(targets.projectRoot, file)}` };
    if (!state.existsNow && state.knownRoute) return { kind: "restart", reason: `route removed: ${rel(targets.projectRoot, file)}` };
    return undefined;
  }
  return undefined;
}

function listFiles(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") listFiles(full, out);
    } else if (ROUTE_FILE.test(entry.name)) out.push(full);
  }
  return out;
}

export interface DevWatcher {
  close(): void;
}

/**
 * Watches the targets and calls `onChange` (debounced: several events inside
 * `debounceMs` become one) with the strongest change seen: a restart wins
 * over notices. Watches only what exists; call again after a restart so new
 * folders are picked up.
 */
export function watchDevChanges(
  targets: DevWatchTargets,
  onChange: (changes: { restart: string[]; notices: string[] }) => void,
  debounceMs = 250
): DevWatcher {
  const known = new Set(targets.routeDirs.flatMap((d) => listFiles(d)));
  const watchers: fs.FSWatcher[] = [];
  let pending: { restart: Set<string>; notices: Set<string> } | undefined;
  let timer: NodeJS.Timeout | undefined;
  let closed = false;

  const flush = () => {
    timer = undefined;
    const batch = pending;
    pending = undefined;
    if (!batch || closed) return;
    onChange({ restart: [...batch.restart], notices: [...batch.notices] });
  };

  const handle = (baseDir: string, filename: string | Buffer | null) => {
    if (closed || !filename) return;
    const file = path.join(baseDir, filename.toString());
    const existsNow = fs.existsSync(file);
    const knownRoute = known.has(file);
    const change = classifyDevChange(targets, file, { existsNow, knownRoute });
    if (existsNow) known.add(file);
    else known.delete(file);
    if (!change) return;
    pending ??= { restart: new Set(), notices: new Set() };
    if (change.kind === "restart") pending.restart.add(change.reason);
    else pending.notices.add(change.message);
    timer ??= setTimeout(flush, debounceMs);
  };

  const watch = (dir: string, recursive: boolean) => {
    if (!fs.existsSync(dir)) return;
    try {
      const watcher = fs.watch(dir, { recursive }, (_event, filename) => handle(dir, filename));
      watcher.on("error", () => {});
      watchers.push(watcher);
    } catch {
      // A platform without recursive watching: nothing to watch here, dev still works.
    }
  };

  watch(targets.projectRoot, false);
  for (const appRoot of targets.appRoots) watch(appRoot, false);
  for (const dir of [...targets.routeDirs, ...targets.prismaDirs]) watch(dir, true);

  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    },
  };
}
