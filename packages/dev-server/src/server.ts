/**
 * The experimental dev server: loopback only, refuses production, the host check on every request and upgrade, request
 * limits, the confined module route (esbuild transforms, React Fast Refresh, CSS and assets), pre-bundled dependencies,
 * `public/`, and the HMR channel with a file watcher that decides between a Fast Refresh update and a full reload.
 * Pages and API routes are not rendered here: requests this server does not own go to `fallback`, which the CLI wires
 * to the same page and API handlers `devora dev` uses.
 */
import http from "node:http";
import { watch, type FSWatcher } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { assertDevOnly, createDevHostCheck, generateDevToken, tokenMatches } from "./guards.js";
import { resolveServedFile, type ServedRoot } from "./files.js";
import { createTransformCache, isTransformable } from "./transform.js";
import { createHmrChannel, HMR_PATH } from "./hmr.js";
import { CSS_EXT, resolveFile, scanImports } from "./core.mjs";
import { createDepsManager, DEPS_PREFIX, depKey, type DepsManager } from "./deps.js";
import { createClientModules, type ClientModules } from "./clientModules.js";
import { HMR_CLIENT, preambleScript } from "./clientScripts.js";

export const MODULE_PREFIX = "/_devora/m/";
export const PREAMBLE_PATH = "/_devora/preamble.js";

export interface DevServerOptions {
  roots: ServedRoot[];
  allowedHosts?: string[];
  port?: number;
  host?: "127.0.0.1" | "::1";
  fallback?: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>;
  /** Watch the roots and tell clients about a change (default true). */
  watch?: boolean;
  env?: NodeJS.ProcessEnv;
  /** An app: turns on dependency bundling, Fast Refresh and the preamble. */
  app?: {
    appRoot: string;
    /** Folder served at the site root, as in production (default: none). */
    publicDir?: string;
    /** A backend-only app has no browser code: no dependency bundling, no client modules. */
    backendOnly?: boolean;
    /** Content-Security-Policy for an .svg file (the core's SVG_CSP); a sandboxing default otherwise. */
    svgCsp?: string;
    /** Extra browser dependencies to bundle up front. */
    clientDeps?: string[];
    /** Called for every changed file before clients are told (the CLI invalidates the server modules here). */
    onChange?: (file: string) => void;
  };
}

export interface DevServer {
  server: http.Server;
  port: number;
  token: string;
  origin: string;
  /** URL of the script the page loads first (refresh runtime and HMR connection); carries the launch token. */
  preambleUrl: string;
  hmr: ReturnType<typeof createHmrChannel>;
  clientModules: ClientModules | undefined;
  deps: DepsManager | undefined;
  /** What a change to this file means for browsers; also used by the watcher. */
  changed(file: string): Promise<void>;
  close(): Promise<void>;
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};

const FILE_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
const TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const IGNORED_DIRS = new Set(["node_modules", "dist", ".vercel", ".netlify", "netlify"]);
const FRAMEWORK_CLIENT_DEPS = ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "react-refresh/runtime", "@devorajs/core/client"];

async function walkScripts(dir: string, out: string[], depth = 0): Promise<void> {
  if (depth > 8) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || IGNORED_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkScripts(full, out, depth + 1);
    else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) out.push(full);
  }
}

/** The bare imports browser code of this app needs: from the framework's client scripts, island targets and csr routes. */
async function discoverClientDeps(appRoot: string, extra: string[]): Promise<string[]> {
  const files: string[] = [];
  await walkScripts(appRoot, files);
  const entries = new Set<string>();
  for (const name of ["island-client.tsx", "csr-client.tsx"]) {
    const f = path.join(appRoot, name);
    if (files.includes(f)) entries.add(f);
  }
  const sources = new Map<string, string>();
  for (const f of files) {
    const src = await readFile(f, "utf8");
    sources.set(f, src);
    if (/renderMode\s*=\s*["']csr["']/.test(src)) entries.add(f);
    if (src.includes("island")) {
      const re = /island(?:<[^>]*>)?\(\s*\(\s*\)\s*=>\s*import\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const target = m[1]!;
        if (target.startsWith(".")) {
          const resolved = await resolveFile(path.resolve(path.dirname(f), target));
          if (resolved) entries.add(resolved);
        }
      }
    }
  }
  const deps = new Set<string>(extra);
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = sources.get(file) ?? (await readFile(file, "utf8").catch(() => ""));
    for (const spec of scanImports(src)) {
      if (spec.startsWith(".")) {
        const resolved = await resolveFile(path.resolve(path.dirname(file), spec.split("?")[0]!));
        if (resolved && /\.(tsx|ts|jsx|js|mjs)$/.test(resolved)) queue.push(resolved);
      } else if (!spec.startsWith("/") && !spec.startsWith("node:") && !spec.startsWith("data:") && !/^https?:/.test(spec)) {
        deps.add(spec);
      }
    }
  }
  return [...deps];
}

export async function startExperimentalDevServer(options: DevServerOptions): Promise<DevServer> {
  const bindHost = options.host ?? "127.0.0.1";
  assertDevOnly(options.env ?? process.env, bindHost);
  for (const r of options.roots) {
    if (!r.prefix.startsWith(MODULE_PREFIX) || !r.prefix.endsWith("/")) throw new Error(`[devora dev-server] root prefix must start with ${MODULE_PREFIX} and end with "/": ${r.prefix}`);
  }
  const hostAllowed = createDevHostCheck(options.allowedHosts);
  const token = generateDevToken();
  const hmr = createHmrChannel({ token, hostAllowed });
  const transforms = createTransformCache();
  const app = options.app;

  let deps: DepsManager | undefined;
  let clientModules: ClientModules | undefined;
  if (app && !app.backendOnly) {
    const resolvable: string[] = [];
    const { createRequire } = await import("node:module");
    const req = createRequire(path.join(app.appRoot, "package.json"));
    for (const d of FRAMEWORK_CLIENT_DEPS) {
      if (d === "react-refresh/runtime") {
        resolvable.push(d);
        continue;
      }
      try {
        req.resolve(d);
        resolvable.push(d);
      } catch {
        // an app without this dependency simply does not get it
      }
    }
    const found = await discoverClientDeps(app.appRoot, [...resolvable, ...(app.clientDeps ?? [])]);
    deps = await createDepsManager(app.appRoot, found);
    // Files are looked up by real path (symlinks followed), so the URL table is keyed by real paths too.
    const realRoots = await Promise.all(options.roots.map(async (r) => ({ ...r, dir: await realpath(r.dir).catch(() => r.dir) })));
    clientModules = createClientModules({ roots: realRoots, deps: () => deps });
  }

  const send = (res: http.ServerResponse, status: number, body: string | Buffer, type = "text/plain; charset=utf-8", extra: Record<string, string> = {}) => {
    res.statusCode = status;
    for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) res.setHeader(k, v);
    res.setHeader("Content-Type", type);
    res.end(body);
  };

  let addingDeps: Promise<unknown> = Promise.resolve();
  const ensureDeps = async (specs: string[]) => {
    if (!deps || specs.every((s) => deps!.has(s))) return;
    const run = addingDeps.then(async () => {
      if (await deps!.add(specs)) hmr.broadcast({ type: "full-reload" });
    });
    addingDeps = run.catch(() => {});
    await run;
  };

  const serveModule = async (req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> => {
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed");
    const resolved = await resolveServedFile(url.pathname, options.roots);
    if (!("file" in resolved)) return send(res, resolved.refused === "missing" ? 404 : 403, resolved.refused === "missing" ? "Not Found" : "Forbidden");
    const file = resolved.file;
    const wantsModule = url.searchParams.has("import");
    if (wantsModule && (CSS_EXT.test(file) || TYPES[path.extname(file)] !== undefined)) {
      const served = url.pathname;
      if (CSS_EXT.test(file)) {
        const code = `const url = ${JSON.stringify(served)};
if (!Array.from(document.querySelectorAll("link[rel=stylesheet]")).some((l) => new URL(l.href, location.href).pathname === url)) {
  const link = document.createElement("link"); link.rel = "stylesheet"; link.href = url; document.head.appendChild(link);
}
export default undefined;`;
        return send(res, 200, code, "text/javascript; charset=utf-8");
      }
      if (path.extname(file) === ".json") return send(res, 200, `export default ${await readFile(file, "utf8")};`, "text/javascript; charset=utf-8");
      return send(res, 200, `export default ${JSON.stringify(served)};`, "text/javascript; charset=utf-8");
    }
    if (isTransformable(file)) {
      if (clientModules) {
        const mod = await clientModules.load(file);
        // Only what this module asks for: other modules were transformed to decide what a change means, never loaded.
        const bare = mod.bare.filter((s) => !deps?.has(s));
        if (bare.length > 0) await ensureDeps(bare);
        clientModules.markServed(file);
        return send(res, 200, mod.code, "text/javascript; charset=utf-8");
      }
      return send(res, 200, await transforms.load(file), "text/javascript; charset=utf-8");
    }
    const type = TYPES[path.extname(file)];
    if (!type) return send(res, 403, "Forbidden");
    // A file the page loads, not a page: nothing in it may run on this origin.
    return send(res, 200, await readFile(file), type, { "Content-Security-Policy": FILE_CSP });
  };

  const publicDirReal = app?.publicDir ? await realpath(app.publicDir).catch(() => undefined) : undefined;
  const servePublic = async (req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> => {
    if (!publicDirReal || (req.method !== "GET" && req.method !== "HEAD")) return false;
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return false;
    }
    if (decoded.includes("\0") || decoded.includes("\\")) return false;
    const segments = decoded.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((s) => s === ".." || s === "." || s.startsWith("."))) return false;
    try {
      const real = await realpath(path.join(publicDirReal, ...segments));
      if (!real.startsWith(publicDirReal + path.sep) || !(await stat(real)).isFile()) return false;
      const type = TYPES[path.extname(real).toLowerCase()];
      if (!type) return false;
      send(res, 200, await readFile(real), type, path.extname(real).toLowerCase() === ".svg" ? { "Content-Security-Policy": app?.svgCsp ?? FILE_CSP } : { "Content-Security-Policy": SECURITY_HEADERS["Content-Security-Policy"]! });
      return true;
    } catch {
      return false;
    }
  };

  // connectionsCheckingInterval: Node checks headersTimeout/requestTimeout only every 30 s by default (as adapter-node does).
  const server = http.createServer({ maxHeaderSize: 16 * 1024, connectionsCheckingInterval: 1_000 }, async (req, res) => {
    try {
      if (!hostAllowed(req.headers.host)) return send(res, 400, "Bad Request: unknown host");
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = url.pathname;
      if (pathname.startsWith(MODULE_PREFIX)) return await serveModule(req, res, url);
      if (app && pathname.startsWith(DEPS_PREFIX)) {
        const name = pathname.slice(DEPS_PREFIX.length);
        const code = /^[\w.-]+$/.test(name) ? deps?.file(name) : undefined;
        return code === undefined ? send(res, 404, "Not Found") : send(res, 200, code, "text/javascript; charset=utf-8");
      }
      if (app && pathname === "/_devora/hmr-client.js") return send(res, 200, HMR_CLIENT, "text/javascript; charset=utf-8");
      if (deps && pathname === PREAMBLE_PATH) {
        if (!tokenMatches(token, url.searchParams.get("token") ?? undefined)) return send(res, 403, "Forbidden");
        return send(res, 200, preambleScript(token, `${DEPS_PREFIX}${depKey("react-refresh/runtime")}.js`), "text/javascript; charset=utf-8");
      }
      if (pathname.startsWith("/_devora/")) return send(res, 404, "Not Found");
      if (await servePublic(req, res, pathname)) return;
      if (options.fallback) return await options.fallback(req, res);
      send(res, 404, "Not Found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[devora dev-server]", error);
      if (!res.headersSent) send(res, 500, `Internal Server Error\n\n${message}`);
      else res.end();
    }
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 60_000;
  server.on("upgrade", (req, socket) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname === HMR_PATH) hmr.handleUpgrade(req, socket);
    else socket.destroy();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, bindHost, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  /** The real path of a changed file (a deleted file has none: its folder's real path plus its name). */
  const realPathOf = async (file: string) =>
    (await realpath(file).catch(async () => path.join(await realpath(path.dirname(file)).catch(() => path.dirname(file)), path.basename(file))));

  async function changed(changedFile: string): Promise<void> {
    const file = await realPathOf(changedFile);
    transforms.invalidate(file);
    clientModules?.invalidate(file);
    app?.onChange?.(file);
    const t = Date.now();
    if (!clientModules) return hmr.broadcast({ type: "full-reload" });
    const urlOf = clientModules.urlOf;
    if (CSS_EXT.test(file)) {
      const u = urlOf(file);
      return u ? hmr.broadcast({ type: "css-update", url: u, t }) : hmr.broadcast({ type: "full-reload" });
    }
    if (!/\.(tsx|ts|jsx|js|mjs)$/.test(file)) return hmr.broadcast({ type: "full-reload" });
    try {
      await clientModules.load(file); // a syntax error is reported to the overlay instead of reloading into a 500
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return hmr.broadcast({ type: "full-reload" }); // deleted or renamed
      return hmr.broadcast({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
    if (!clientModules.wasLoaded(file)) return hmr.broadcast({ type: "full-reload" });
    // Fast Refresh: the nearest modules that accept updates; any path that reaches a module that does not -> full reload.
    const boundaries = new Set<string>();
    const seen = new Set<string>();
    let reload = false;
    const visit = (f: string) => {
      if (seen.has(f)) return;
      seen.add(f);
      if (clientModules!.isBoundary(f)) {
        boundaries.add(f);
        return;
      }
      const parents = clientModules!.importersOf(f).filter((p) => clientModules!.wasLoaded(p));
      if (parents.length === 0) reload = true;
      for (const p of parents) visit(p);
    };
    visit(file);
    const urls = [...boundaries].map((f) => urlOf(f)).filter((u): u is string => u !== undefined);
    if (reload || urls.length === 0) return hmr.broadcast({ type: "full-reload" });
    hmr.broadcast({ type: "update", urls, t });
  }

  const watchers: FSWatcher[] = [];
  if (options.watch !== false) {
    const pending = new Map<string, NodeJS.Timeout>();
    for (const r of options.roots) {
      try {
        watchers.push(
          watch(r.dir, { recursive: true }, (_event, file) => {
            if (!file) return;
            const parts = String(file).split(path.sep);
            if (parts.some((s) => s.startsWith(".") || IGNORED_DIRS.has(s))) return;
            const full = path.join(r.dir, String(file));
            clearTimeout(pending.get(full));
            pending.set(
              full,
              setTimeout(() => {
                pending.delete(full);
                void changed(full).catch((error) => console.error("[devora dev-server]", error));
              }, 15)
            );
          })
        );
      } catch {
        // A root that cannot be watched still serves; changes then need a manual reload.
      }
    }
  }

  return {
    server,
    port,
    token,
    origin: `http://${bindHost === "::1" ? "[::1]" : bindHost}:${port}`,
    preambleUrl: `${PREAMBLE_PATH}?token=${token}`,
    hmr,
    clientModules,
    deps,
    changed,
    close: async () => {
      for (const w of watchers) w.close();
      hmr.closeAll();
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
