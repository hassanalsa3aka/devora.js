/**
 * The server side of the experimental dev server: pages, entry-server and API routes run in this Node process, loaded
 * by the hooks in hooks.mjs. A module of the app is imported as `file:///…/route.tsx?devora=<app>.<n>`; the hooks pass
 * that query on to its imports, so `invalidate()` (n + 1) makes the next import execute the app's whole module graph
 * again, while `node_modules` and the framework's own packages stay loaded once. No module of a request's making is
 * ever imported: callers pass files their own router already matched.
 */
import { findSourceMap, register } from "node:module";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ServedRoot } from "./files.js";

interface Registration {
  port: MessagePort;
  projectRoot: string;
  edges: Map<string, Set<string>>; // imported file -> files that import it (app modules only)
  pongs: Map<number, () => void>;
  counter: number;
}

let registration: Registration | undefined;

const FRAMEWORK_DIRS = ["packages/core", "packages/cli", "packages/dev-server", "packages/desktop", "packages/scaffold", "adapters", "create-devora"];

function ensureRegistered(projectRoot: string): Registration {
  if (registration) {
    if (registration.projectRoot !== projectRoot) throw new Error("[devora dev-server] one project per process (the module loader is registered for " + registration.projectRoot + ")");
    return registration;
  }
  const { port1, port2 } = new MessageChannel();
  const reg: Registration = { port: port1, projectRoot, edges: new Map(), pongs: new Map(), counter: 0 };
  port1.on("message", (message: { edge?: [string, string]; pong?: number }) => {
    if (message.edge) {
      const [parent, child] = message.edge;
      let set = reg.edges.get(child);
      if (!set) reg.edges.set(child, (set = new Set()));
      set.add(parent);
    }
    if (message.pong !== undefined) reg.pongs.get(message.pong)?.();
  });
  port1.unref();
  register(new URL("./hooks.mjs", import.meta.url), {
    parentURL: import.meta.url,
    data: { projectRoot, frozen: FRAMEWORK_DIRS.map((d) => path.join(projectRoot, d)), port: port2 },
    transferList: [port2],
  });
  registration = reg;
  return reg;
}

export interface ServerModuleHost {
  /** Imports a route, entry or store file the framework's own router matched, at the current epoch. */
  ssrLoadModule(file: string): Promise<Record<string, unknown>>;
  /** The next import re-executes the app's module graph. Returns the changed file plus the files that import it. */
  invalidate(file: string): string[];
  ssrFixStacktrace(error: Error): void;
}

export async function createServerModuleHost(options: { appId: string; projectRoot: string; roots: ServedRoot[] }): Promise<ServerModuleHost> {
  const reg = ensureRegistered(path.resolve(options.projectRoot));
  const id = ++reg.counter;
  // The port is unref'd so it never keeps the process alive; hold it while waiting for the hooks thread's answer.
  reg.port.ref();
  await new Promise<void>((resolve) => {
    reg.pongs.set(id, resolve);
    reg.port.postMessage({ app: { id: options.appId, roots: options.roots } });
    reg.port.postMessage({ ping: id });
  });
  reg.port.unref();
  reg.pongs.delete(id);
  let epoch = 0;
  return {
    // `devora-src:` is the scheme the hooks own (see hooks.mjs): nothing else compiles these files.
    ssrLoadModule: (file) => import(`devora-src://${pathToFileURL(file).pathname}.devora-module?devora=${options.appId}.${epoch}`) as Promise<Record<string, unknown>>,
    invalidate(file) {
      epoch += 1;
      const seen = new Set<string>([file]);
      const queue = [file];
      while (queue.length > 0) {
        for (const parent of reg.edges.get(queue.pop()!) ?? []) {
          if (!seen.has(parent)) {
            seen.add(parent);
            queue.push(parent);
          }
        }
      }
      return [...seen];
    },
    ssrFixStacktrace(error) {
      // Frames name `devora-src://<file>.devora-module?devora=…:line:col` (generated code); show the file and line written.
      if (typeof error.stack !== "string") return;
      error.stack = error.stack.replace(/devora-src:\/\/(\S+?)\.devora-module(\?devora=[^:)\s]+):(\d+):(\d+)/g, (whole, file: string, query: string, line: string, col: string) => {
        let plain = file;
        try {
          plain = decodeURIComponent(file);
        } catch {
          // keep the encoded name
        }
        const entry = findSourceMap(whole.split(":").slice(0, -2).join(":"))?.findEntry(Number(line) - 1, Number(col) - 1);
        void query;
        return entry && "originalLine" in entry ? `${plain}:${entry.originalLine + 1}:${entry.originalColumn + 1}` : `${plain}:${line}:${col}`;
      });
    },
  };
}
