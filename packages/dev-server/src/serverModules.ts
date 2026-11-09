/**
 * The server side of the experimental dev server: pages and API routes run in this Node process, loaded by the in-thread
 * hooks in hooks.mjs. A module of the app has its own version; `invalidate()` gives a changed file and the modules that import
 * it a new one, so the next import runs exactly those again while `node_modules` and the framework's own packages stay loaded.
 * No module of a request's making is ever imported: callers pass files their own router already matched.
 */
import { findSourceMap, registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServerHooks } from "./hooks.mjs";
import type { ServedRoot } from "./files.js";

const FRAMEWORK_DIRS = ["packages/core", "packages/cli", "packages/dev-server", "packages/desktop", "packages/scaffold", "adapters", "create-devora"];

type Hooks = ReturnType<typeof createServerHooks>;
let registered: { projectRoot: string; hooks: Hooks } | undefined;

function ensureRegistered(projectRoot: string): Hooks {
  if (registered) {
    if (registered.projectRoot !== projectRoot) throw new Error("[devora dev-server] one project per process (the module hooks are registered for " + registered.projectRoot + ")");
    return registered.hooks;
  }
  if (typeof registerHooks !== "function") {
    throw new Error("[devora dev-server] the experimental dev server needs Node 22.15 or later (module.registerHooks); this is " + process.version);
  }
  const hooks = createServerHooks({ projectRoot, frozen: FRAMEWORK_DIRS.map((d) => path.join(projectRoot, d)) });
  registerHooks(hooks.hooks as unknown as Parameters<typeof registerHooks>[0]);
  registered = { projectRoot, hooks };
  return hooks;
}

export interface ServerModuleHost {
  /** Imports a route, entry or store file the framework's own router matched, at its current version. */
  ssrLoadModule(file: string): Promise<Record<string, unknown>>;
  /** A file changed: it and the modules that import it run again at the next import. Returns those files. */
  invalidate(file: string): string[];
  /** Compiles these files in parallel ahead of the first request (best effort). */
  prewarm(files: string[]): Promise<void>;
  /** Files whose modules have been loaded (tests and trace). */
  loaded(): string[];
  ssrFixStacktrace(error: Error): void;
}

export async function createServerModuleHost(options: { appId: string; projectRoot: string; roots: ServedRoot[]; compileCacheDir?: string; aliases?: unknown }): Promise<ServerModuleHost> {
  const hooks = ensureRegistered(path.resolve(options.projectRoot));
  hooks.addApp(options.appId, options.roots, options.compileCacheDir, options.aliases);
  return {
    // `devora-src:` is the scheme the hooks own (see hooks.mjs): nothing else compiles these files.
    ssrLoadModule: (file) => import(hooks.entryUrl(options.appId, file)) as Promise<Record<string, unknown>>,
    invalidate: (file) => hooks.invalidate(options.appId, file),
    loaded: () => hooks.loaded(options.appId),
    prewarm: (files) => hooks.prewarm(options.appId, files),
    ssrFixStacktrace(error) {
      // Frames name `devora-src://<file>.devora-module?devora=...:line:col` (generated code); show the file and line written.
      if (typeof error?.stack !== "string") return;
      try {
        error.stack = error.stack.replace(/devora-src:\/\/(\S+?)\.devora-module(\?devora=[^:)\s]+):(\d+):(\d+)/g, (whole, file: string, _query: string, line: string, col: string) => {
          let plain = file;
          try {
            plain = decodeURIComponent(file);
          } catch {
            // keep the encoded name
          }
          const entry = findSourceMap(whole.split(":").slice(0, -2).join(":"))?.findEntry(Number(line) - 1, Number(col) - 1);
          return entry && "originalLine" in entry ? `${plain}:${entry.originalLine + 1}:${entry.originalColumn + 1}` : `${plain}:${line}:${col}`;
        });
      } catch {
        // an error whose stack cannot be rewritten (a frozen or internal error) is reported as it is
      }
    },
  };
}
