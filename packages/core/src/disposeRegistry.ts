/**
 * Real evaluation result for architecture-v2.md §3.5's native-driver reload
 * hazard (ROADMAP.md #6, `packages/backend/DATABASE.md`): `import.meta.hot`
 * is `undefined` inside a module loaded via `vite.ssrLoadModule` (confirmed
 * directly, recorded in DATABASE.md), so there is no working *module-side*
 * HMR API to hook a cleanup callback into. This registry is the plugin-side
 * alternative that IS feasible: `moduleDisposePlugin.ts` runs on the Vite
 * dev *server*, not inside the reloaded module, and its `handleHotUpdate`
 * hook fires with a real file path whenever Vite is about to invalidate
 * that module — exactly the moment a registered cleanup needs to run,
 * before the next `ssrLoadModule` call re-executes the file and creates a
 * second connection.
 *
 * Stored on `globalThis`, not module scope — same reasoning DATABASE.md's
 * existing `globalThis.__db` pattern already uses: this file itself gets
 * reloaded along with everything else in the SSR module graph, so anything
 * living in its own module scope would be wiped out at exactly the moment
 * it's needed.
 *
 * Real, honest scope limit: this fixes the *mechanism* gap (there's now a
 * real place to register a callback that fires on reload) — it does not
 * itself guarantee closing every native handle safely, since that's driver-
 * specific cleanup code the framework can't write generically (bring your
 * own DB client, §6/§11 unchanged). DATABASE.md's `globalThis` singleton
 * pattern remains the recommended default; this is an additional, opt-in
 * tool for a driver whose client object needs an explicit `.close()` call
 * before being replaced, not a replacement for that pattern.
 */

declare global {
  // eslint-disable-next-line no-var
  var __devoraDisposables: Map<string, () => void> | undefined;
}

function registry(): Map<string, () => void> {
  if (!globalThis.__devoraDisposables) {
    globalThis.__devoraDisposables = new Map();
  }
  return globalThis.__devoraDisposables;
}

function normalizeKey(fileUrlOrPath: string): string {
  return fileUrlOrPath.startsWith("file://") ? new URL(fileUrlOrPath).pathname : fileUrlOrPath;
}

/**
 * Registers `dispose` to run right before the file at `fileUrlOrPath` (pass
 * `import.meta.url` from the module holding the resource) is about to be
 * reloaded by Vite's dev server. Overwrites any previously registered
 * callback for the same file — a module re-executing and calling this again
 * is the normal case (it just registered a NEW connection's cleanup), not a
 * leak of the old registration.
 */
export function registerDisposable(fileUrlOrPath: string, dispose: () => void): void {
  registry().set(normalizeKey(fileUrlOrPath), dispose);
}

/** Used by moduleDisposePlugin.ts — not typically called directly. */
export function runAndClearDisposable(filePath: string): void {
  const key = normalizeKey(filePath);
  const dispose = registry().get(key);
  if (!dispose) return;
  registry().delete(key);
  dispose();
}
