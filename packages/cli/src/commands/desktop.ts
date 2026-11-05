/**
 * `devora desktop dev|build|serve --experimental --app <name>`: the experimental, opt-in desktop target
 * (work-notes/desktop/DESIGN.md). Nothing here runs unless the command is typed with --experimental.
 *
 *   build   devora build for the app, then write apps/<app>/desktop/src-tauri/ (Tauri 2 config, capabilities
 *           with the IPC allowlist, a Rust shell template). Building the window itself needs Rust and the
 *           Tauri CLI on your machine (work-notes/desktop/MANUAL-CHECK.md).
 *   serve   the sidecar: serves the built app behind the desktop rules. Reads the token from
 *           DEVORA_DESKTOP_TOKEN and the port from PORT (both set by the shell); 127.0.0.1 only.
 *   dev     build, then serve with a fresh token and a random port, and print the launch URL, so the app can be
 *           checked in a browser on this machine before the window exists.
 *
 * The app's desktop settings live in apps/<app>/desktop.json: { "productName", "identifier", "ipc": [] }.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createProdRequestHandler, resolveAuthMode, validateCorsConfig } from "@devorajs/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import {
  DESKTOP_HOST,
  DESKTOP_LAUNCH_PATH,
  DESKTOP_TOKEN_ENV,
  generateLaunchToken,
  generateTauriProject,
  isWellFormedToken,
  parseIpcAllowlist,
  startDesktopServer,
} from "@devorajs/desktop";
import { build } from "./build.js";
import { forceProductionNodeEnv, parsePort } from "../build/productionEnv.js";
import { loadProjectEnv } from "../build/loadEnvFiles.js";
import { printHeader } from "../terminal/output.js";

interface DesktopOptions {
  app?: string;
  experimental?: boolean;
}

interface DesktopSettings {
  productName: string;
  identifier: string;
  ipc: string[];
}

function fail(message: string): never {
  console.error(`[devora desktop] ${message}`);
  process.exit(1);
}

async function resolveApp(opts: DesktopOptions) {
  if (!opts.experimental) {
    fail("the desktop target is experimental and off by default: run it with --experimental (see work-notes/desktop/DESIGN.md)");
  }
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const app = opts.app ? project.apps.find((a) => a.name === opts.app) : project.apps.length === 1 ? project.apps[0] : undefined;
  if (!app) fail(opts.app ? `no app named "${opts.app}" in devora.config.ts` : "pass --app <name>: the desktop target builds one app");
  const appRoot = resolveAppDir(root, app.dir);
  return { root, project, app, appRoot };
}

function readSettings(appRoot: string, appName: string): DesktopSettings {
  const file = path.join(appRoot, "desktop.json");
  const raw = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Partial<DesktopSettings>) : {};
  return {
    productName: typeof raw.productName === "string" ? raw.productName : appName,
    identifier: typeof raw.identifier === "string" ? raw.identifier : `com.example.${appName.replace(/_/g, "-")}`,
    ipc: parseIpcAllowlist(raw.ipc),
  };
}

async function serveBuiltApp(opts: DesktopOptions, token: string, port: number | undefined) {
  forceProductionNodeEnv("start");
  const { root, project, app, appRoot } = await resolveApp(opts);
  loadProjectEnv(root, "production");
  const appConfig = await loadAppConfig(appRoot);
  validateCorsConfig(app.name, appConfig.cors);
  const handle = createProdRequestHandler(
    appRoot,
    app.name,
    resolveAuthMode(project, app.name),
    app.domain,
    appConfig.security,
    false,
    appConfig.defaultRenderMode,
    {
      apiDir: appConfig.apiDir,
      head: appConfig.head,
      maxBodyBytes: appConfig.maxBodyBytes,
      maxFormFields: appConfig.maxFormFields,
      maxFormFiles: appConfig.maxFormFiles,
      // The window is the only client: no proxy in front, one host.
      trustProxy: false,
      allowedHosts: [DESKTOP_HOST],
    }
  );
  const server = await startDesktopServer({
    token,
    port,
    handler: async (req, res) => {
      if (!(await handle(req, res))) {
        res.statusCode = 404;
        res.end("Not found");
      }
    },
  });
  return server;
}

export async function desktopServe(opts: DesktopOptions) {
  const token = process.env[DESKTOP_TOKEN_ENV];
  if (!isWellFormedToken(token)) fail(`${DESKTOP_TOKEN_ENV} must hold the launch token the desktop shell created`);
  delete process.env[DESKTOP_TOKEN_ENV];
  const port = process.env.PORT ? parsePort(process.env.PORT, "PORT") : undefined;
  if (process.env.PORT && port === undefined) process.exit(1);
  const server = await serveBuiltApp(opts, token, port);
  console.log(`[devora desktop] serving on ${server.origin} (token required)`);
}

export async function desktopDev(opts: DesktopOptions) {
  printHeader("desktop dev · experimental");
  const { app } = await resolveApp(opts);
  await build({ app: app.name });
  const token = generateLaunchToken();
  const server = await serveBuiltApp(opts, token, undefined);
  console.log(`[devora desktop] "${app.name}" is served on ${server.origin} behind the desktop rules (127.0.0.1 only, per-launch token).`);
  console.log(`[devora desktop] open this once in a browser on this machine to check the app as the window will show it:`);
  console.log(`  ${server.origin}${DESKTOP_LAUNCH_PATH}?token=${token}`);
  console.log(`[devora desktop] the token changes every launch; without it every request gets a 403.`);
}

export async function desktopBuild(opts: DesktopOptions) {
  printHeader("desktop build · experimental");
  const { app, appRoot } = await resolveApp(opts);
  const settings = readSettings(appRoot, app.name);
  await build({ app: app.name });
  const version = (() => {
    try {
      return (JSON.parse(readFileSync(path.join(appRoot, "package.json"), "utf8")) as { version?: string }).version ?? "0.1.0";
    } catch {
      return "0.1.0";
    }
  })();
  const files = generateTauriProject({ productName: settings.productName, identifier: settings.identifier, version, ipc: settings.ipc });
  const out = path.join(appRoot, "desktop", "src-tauri");
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(out, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  console.log(`[devora desktop] wrote ${path.relative(process.cwd(), out)} (${Object.keys(files).length} files; IPC commands allowed: ${settings.ipc.length ? settings.ipc.join(", ") : "none"})`);
  console.log("[devora desktop] next, on a machine with Rust and the Tauri CLI: build the server sidecar binary and run `cargo tauri build` in that folder (work-notes/desktop/MANUAL-CHECK.md).");
}
