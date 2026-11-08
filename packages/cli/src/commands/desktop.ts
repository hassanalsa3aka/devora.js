/**
 * `devora desktop dev|build|serve --experimental --app <name>`: the experimental, opt-in desktop target
 * (see ROADMAP.md). Nothing here runs unless the command is typed with --experimental.
 *
 *   build   devora build for the app, then write apps/<app>/desktop/src-tauri/ (Tauri 2 config, capabilities
 *           with the IPC allowlist, the Rust shell). Bundling needs Rust and the Tauri CLI on your machine.
 *   serve   the sidecar: serves the built app behind the desktop rules. Reads the token from
 *           DEVORA_DESKTOP_TOKEN and the port from PORT (both set by the shell); 127.0.0.1 only. It stops when the
 *           process that started it (DEVORA_DESKTOP_PARENT_PID) is gone.
 *   dev     build, write the Tauri project, and open the window with `cargo run` when Xcode tools (macOS), Rust and
 *           cargo are present. The shell starts this CLI's `serve` as its sidecar on a random port with a fresh
 *           token. When something is missing it says what, and serves the app on its own (server-only mode, as
 *           before) with a launch URL for a browser; it never pretends a window exists. `--no-window` forces that mode.
 *
 * The app's desktop settings live in apps/<app>/desktop.json: { "productName", "identifier", "ipc": [] }.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createProdRequestHandler, resolveAuthMode, validateCorsConfig } from "@devorajs/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import {
  DESKTOP_HOST,
  DESKTOP_LAUNCH_PATH,
  DESKTOP_TOKEN_ENV,
  generateLaunchToken,
  DESKTOP_PARENT_PID_ENV,
  checkDesktopPrerequisites,
  describeMissing,
  generateTauriBinaryFiles,
  generateTauriProject,
  isWellFormedToken,
  parseIpcAllowlist,
  parseParentPid,
  startDesktopServer,
  watchParent,
} from "@devorajs/desktop";
import { build } from "./build.js";
import { forceProductionNodeEnv, parsePort } from "../build/productionEnv.js";
import { loadProjectEnv } from "../build/loadEnvFiles.js";
import { printHeader } from "../terminal/output.js";

interface DesktopOptions {
  app?: string;
  experimental?: boolean;
  /** `--no-window` sets this to false: serve only. */
  window?: boolean;
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
    fail("the desktop target is experimental and off by default: run it with --experimental (see ROADMAP.md)");
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
  const parent = parseParentPid(process.env[DESKTOP_PARENT_PID_ENV]);
  if (parent !== undefined) {
    // The shell kills this process on exit; this covers a shell that is gone without having done so.
    watchParent(parent, () => {
      console.log("[devora desktop] the window's process is gone: stopping");
      void server.close().finally(() => process.exit(0));
    });
  }
}

export async function desktopDev(opts: DesktopOptions) {
  printHeader("desktop dev · experimental");
  const { app, appRoot, root } = await resolveApp(opts);
  await build({ app: app.name });
  if (opts.window === false) {
    console.log("[devora desktop] --no-window: serving the app on its own, no window.");
  } else {
    const report = checkDesktopPrerequisites();
    if (report.ready) return openWindow(app.name, appRoot, root);
    console.log("[devora desktop] NO WINDOW WILL OPEN: this machine is missing what the window needs:");
    for (const line of describeMissing(report)) console.log(line);
    console.log("[devora desktop] after installing it, run this command again. Until then the app is served on its own (server-only mode):");
  }
  const token = generateLaunchToken();
  // PORT pins the port of the server-only mode (default: a random free one).
  const pinned = process.env.PORT ? parsePort(process.env.PORT, "PORT") : undefined;
  if (process.env.PORT && pinned === undefined) process.exit(1);
  const server = await serveBuiltApp(opts, token, pinned);
  console.log(`[devora desktop] "${app.name}" is served on ${server.origin} behind the desktop rules (127.0.0.1 only, per-launch token).`);
  console.log(`[devora desktop] open this once in a browser on this machine to check the app as the window will show it:`);
  console.log(`  ${server.origin}${DESKTOP_LAUNCH_PATH}?token=${token}`);
  console.log(`[devora desktop] the token changes every launch; without it every request gets a 403.`);
}

/** Writes (or refreshes) the Tauri project next to the app. The icon is only written when there is none, so yours stays. */
function writeTauriProject(appRoot: string, settings: DesktopSettings, version: string): string {
  const files = generateTauriProject({ productName: settings.productName, identifier: settings.identifier, version, ipc: settings.ipc });
  const out = path.join(appRoot, "desktop", "src-tauri");
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(out, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  for (const [name, content] of Object.entries(generateTauriBinaryFiles())) {
    const file = path.join(out, name);
    if (existsSync(file)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return out;
}

function appVersion(appRoot: string): string {
  try {
    return (JSON.parse(readFileSync(path.join(appRoot, "package.json"), "utf8")) as { version?: string }).version ?? "0.1.0"; // version-ok: the app's own version, not Devora's
  } catch {
    return "0.1.0"; // version-ok: the app's own version, not Devora's
  }
}

/**
 * The window: `cargo run` in the generated project. The Rust shell starts this CLI's `desktop serve` as its sidecar (the
 * command is handed over in the environment: node, its flags and this script, so it works from source and from the bundle).
 */
async function openWindow(appName: string, appRoot: string, root: string) {
  const settings = readSettings(appRoot, appName);
  const out = writeTauriProject(appRoot, settings, appVersion(appRoot));
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
  if (!entry) fail("cannot tell which script started this command, so the window cannot start the server");
  const serverArgv = [...process.execArgv, entry, "desktop", "serve", "--experimental", "--app", appName];
  console.log(`[devora desktop] opening a window for "${appName}": cargo run in ${path.relative(root, out)}`);
  console.log("[devora desktop] the first run downloads and compiles the Tauri crates: several minutes. Later runs start in seconds.");
  const child = spawn("cargo", ["run", "--manifest-path", path.join(out, "Cargo.toml")], {
    cwd: out,
    stdio: "inherit",
    env: {
      ...process.env,
      DEVORA_DESKTOP_NODE: process.execPath,
      DEVORA_DESKTOP_SERVER_ARGV: serverArgv.join("\n"),
      DEVORA_DESKTOP_ROOT: root,
      // PORT, when set, pins the shell's port too (debug builds only honour it).
      ...(process.env.PORT ? { DEVORA_DESKTOP_PORT: process.env.PORT } : {}),
    },
  });
  const forward = (signal: NodeJS.Signals) => () => {
    child.kill(signal);
  };
  process.once("SIGINT", forward("SIGINT"));
  process.once("SIGTERM", forward("SIGTERM"));
  child.on("error", (error) => fail(`could not run cargo: ${error.message}`));
  child.on("exit", (code, signal) => {
    console.log(`[devora desktop] the window closed${code ? ` (cargo exited with ${code})` : ""}${signal ? ` (${signal})` : ""}`);
    process.exit(code ?? (signal ? 130 : 1));
  });
}

export async function desktopBuild(opts: DesktopOptions) {
  printHeader("desktop build · experimental");
  const { app, appRoot } = await resolveApp(opts);
  const settings = readSettings(appRoot, app.name);
  await build({ app: app.name });
  const out = writeTauriProject(appRoot, settings, appVersion(appRoot));
  console.log(`[devora desktop] wrote ${path.relative(process.cwd(), out)} (IPC commands allowed: ${settings.ipc.length ? settings.ipc.join(", ") : "none"})`);
  const report = checkDesktopPrerequisites(undefined, { forBuild: true });
  if (!report.ready) {
    console.log("[devora desktop] this machine cannot bundle it yet:");
    for (const line of describeMissing(report)) console.log(line);
  }
  console.log("[devora desktop] bundling also needs the server as a binary next to the app (packaging is not decided yet; see ROADMAP.md): `devora desktop dev` is the supported way to see the window.");
}
