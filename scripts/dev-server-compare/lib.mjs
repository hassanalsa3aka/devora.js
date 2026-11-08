// Shared helpers for the dev-server comparison scripts (parity, security, browser, re-execution cost).
// Every script starts the servers it needs, on ports 11000-11099, in a temporary project it creates; none edits the repository.
// A request that fails or times out is a failure everywhere here: helpers return `ok: false` with the reason, never a fake status.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const now = () => performance.now();

export const APP_PORTS = { marketing: 11001, dashboard: 11002, admin: 11003, "api-only": 11004 };
export const PORT_ATTACK = 11010;
export const PORT_SMALL = 11020;
export const PORT_BIG = 11021;
export const PORT_BROWSER = 11022;

export function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

/** A temporary folder this run owns (removed by the returned cleanup). */
export function makeTemp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `devora-compare-${prefix}-`));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const SKIP = new Set(["node_modules", "dist", ".vercel", ".netlify", "netlify"]);

/** Copies an app's sources and links its node_modules, so the copy resolves exactly what the original does. */
export function copyApp(srcApp, destApp) {
  fs.cpSync(srcApp, destApp, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
  const modules = path.join(srcApp, "node_modules");
  if (fs.existsSync(modules)) fs.symlinkSync(fs.realpathSync(modules), path.join(destApp, "node_modules"));
}

/** The repository's four apps, copied into a temporary project whose config gives them ports in 11001-11004. */
export function makeRepoAppsProject() {
  const tmp = makeTemp("apps");
  const root = tmp.dir;
  fs.symlinkSync(path.join(REPO, "node_modules"), path.join(root, "node_modules"));
  write(path.join(root, "package.json"), '{ "name": "compare-apps", "private": true, "type": "module" }\n');
  fs.cpSync(path.join(REPO, "assets"), path.join(root, "assets"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "tsconfig.base.json"), path.join(root, "tsconfig.base.json")); // the apps' tsconfig.json extend it (Vite reads it)
  const entries = [
    ["marketing", 'auth: "none"'],
    ["dashboard", ""],
    ["admin", 'auth: "isolated"'],
    ["api-only", 'auth: "none"'],
  ];
  for (const [name] of entries) copyApp(path.join(REPO, "apps", name), path.join(root, "apps", name));
  write(
    path.join(root, "devora.config.ts"),
    `import { defineProject } from "@devorajs/core/config";
export default defineProject({
  apps: [
${entries.map(([name, extra]) => `    { name: "${name}", dir: "apps/${name}", domain: "${name}.example.com", devPort: ${APP_PORTS[name]}${extra ? `, ${extra}` : ""} },`).join("\n")}
  ],
  shared: { core: "packages/core", backend: "packages/backend", auth: "shared", sessions: { store: "memory" } },
});
`
  );
  return { root, cleanup: tmp.cleanup };
}

/**
 * A one-app project: a page with an island, a stylesheet and (for "big") an island whose component tree is 200 modules.
 * `public/icons` is copied from the repository so the shared header's logo resolves like it does in the real apps.
 */
export function makeSyntheticProject({ name, port, modules = 0 }) {
  const tmp = makeTemp(name);
  const proj = tmp.dir;
  const app = path.join(proj, "apps", "web");
  fs.mkdirSync(path.join(app, "node_modules"), { recursive: true });
  fs.symlinkSync(path.join(REPO, "node_modules"), path.join(proj, "node_modules"));
  write(path.join(proj, "package.json"), `{ "name": "compare-${name}", "private": true, "type": "module" }\n`);
  write(path.join(app, "package.json"), `{ "name": "compare-${name}-web", "private": true, "type": "module" }\n`);
  // The app's own node_modules is a real folder (so Vite's cache is local to this app) holding links to the dashboard's.
  const dash = path.join(REPO, "apps", "dashboard", "node_modules");
  for (const entry of fs.readdirSync(dash)) {
    if (entry.startsWith(".")) continue;
    if (entry.startsWith("@")) {
      fs.mkdirSync(path.join(app, "node_modules", entry), { recursive: true });
      for (const sub of fs.readdirSync(path.join(dash, entry))) fs.symlinkSync(fs.realpathSync(path.join(dash, entry, sub)), path.join(app, "node_modules", entry, sub));
    } else fs.symlinkSync(fs.realpathSync(path.join(dash, entry)), path.join(app, "node_modules", entry));
  }
  write(
    path.join(proj, "devora.config.ts"),
    `import { defineProject } from "@devorajs/core/config";
export default defineProject({
  apps: [{ name: "web", dir: "apps/web", domain: "web.example.com", auth: "none", devPort: ${port} }],
  shared: { core: "packages/core", backend: "packages/backend", auth: "shared", sessions: { store: "memory" } },
});
`
  );
  // COMPARE_VITE_WATCH: a JSON object merged into Vite's server.watch (used to find where Vite's HMR delay comes from).
  write(
    path.join(app, "vite.config.ts"),
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const watch = process.env.COMPARE_VITE_WATCH ? JSON.parse(process.env.COMPARE_VITE_WATCH) : {};
export default defineConfig({ plugins: [react()], build: { target: "es2022" }, server: { watch } });
`
  );
  write(path.join(proj, "tsconfig.base.json"), fs.readFileSync(path.join(REPO, "tsconfig.base.json"), "utf8"));
  write(path.join(app, "tsconfig.json"), '{ "extends": "../../tsconfig.base.json", "include": ["**/*.ts", "**/*.tsx"] }\n');
  write(path.join(app, "app.config.ts"), 'import { defineApp } from "@devorajs/core/config";\nexport default defineApp({});\n');
  for (const f of ["entry-server.tsx", "island-client.tsx", "csr-client.tsx"]) fs.copyFileSync(path.join(REPO, "apps", "dashboard", f), path.join(app, f));
  fs.cpSync(path.join(REPO, "assets", "icons"), path.join(app, "public", "icons"), { recursive: true });
  write(path.join(app, "components", "style.css"), "h1 { color: teal; }\n");
  if (modules === 0) {
    write(
      path.join(app, "components", "Widget.tsx"),
      `import { useState } from "react";
export default function Widget() {
  const [n, setN] = useState(0);
  return <div><span id="leaf">leaf-v1</span> <button id="inc" onClick={() => setN(n + 1)}>n={n}</button></div>;
}
`
    );
  } else {
    // A binary tree of tiny components, each importing its two children; the last one holds the text the scripts edit.
    for (let i = 0; i < modules; i++) {
      const kids = [2 * i + 1, 2 * i + 2].filter((k) => k < modules);
      const imports = kids.map((k) => `import C${k} from "./C${k}";`).join("\n");
      const inner = i === modules - 1 ? `<span id="leaf">leaf-v1</span>` : `<li>node ${i}{" "}${kids.map((k) => `<C${k} />`).join("")}</li>`;
      write(path.join(app, "components", "tree", `C${i}.tsx`), `${imports}${imports ? "\n" : ""}export default function C${i}() {\n  return ${i === modules - 1 ? inner : `<ul>${inner}</ul>`};\n}\n`);
    }
    write(
      path.join(app, "components", "Widget.tsx"),
      `import { useState } from "react";
import C0 from "./tree/C0";
export default function Widget() {
  const [n, setN] = useState(0);
  return <div><C0 /> <button id="inc" onClick={() => setN(n + 1)}>n={n}</button></div>;
}
`
    );
  }
  write(
    path.join(app, "routes", "index.tsx"),
    `import { island, Island, PageShell } from "@devorajs/core";
import "../components/style.css";
const WidgetIsland = island(() => import("../components/Widget"));
export const renderMode = "ssr";
export default function Home() {
  return <PageShell appName="web"><h1>${name}</h1><Island component={WidgetIsland} props={{}} /></PageShell>;
}
`
  );
  return { root: proj, appDir: app, leaf: path.join(app, "components", modules === 0 ? "Widget.tsx" : `tree/C${modules - 1}.tsx`), cleanup: tmp.cleanup };
}

/** One request; never throws and never invents a status: a failure or a timeout is { ok: false, error }. */
export async function get(url, { headers = {}, method = "GET", body, timeout = 15000, redirect = "manual" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers, method, body, redirect, signal: controller.signal });
    const text = await res.text();
    return { ok: true, status: res.status, headers: res.headers, body: text };
  } catch (error) {
    return { ok: false, status: 0, headers: new Headers(), body: "", error: controller.signal.aborted ? `timeout after ${timeout} ms` : String(error.cause?.code ?? error.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

function tcpOpen(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}
export const portInUse = async (port) => (await tcpOpen(port, "127.0.0.1")) || (await tcpOpen(port, "::1"));

function listeningPid(port) {
  try {
    return Number(execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n")[0]) || 0;
  } catch {
    return 0;
  }
}
export { listeningPid };

/**
 * Starts `devora dev` (Vite) or `devora dev --experimental-dev-server` in `root`, from the repository's source, and waits
 * until the page answers. Throws, with the server's output, when it does not start in time or exits. `stop()` ends it and
 * checks the port was released (killing a leftover listener by PID).
 */
export async function startServer({ root, experimental, port, env = {}, args = [] }) {
  if (port < 11000 || port > 11099) throw new Error(`port ${port} is outside 11000-11099`);
  if (await portInUse(port)) throw new Error(`port ${port} is already in use`);
  const child = spawn(path.join(REPO, "node_modules", ".bin", "tsx"), [path.join(REPO, "packages/cli/src/index.ts"), "dev", ...(experimental ? ["--experimental-dev-server"] : []), ...args], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "development", NO_COLOR: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  let exited = null;
  child.once("exit", (code) => (exited = code ?? "signal"));
  const started = now();
  for (;;) {
    if (exited !== null) throw new Error(`the server exited (${exited}) before it was ready:\n${out}`);
    if (now() - started > 60000) {
      child.kill("SIGTERM");
      throw new Error(`the server did not answer within 60 s:\n${out}`);
    }
    if (out.includes("Local:") && (await portInUse(port))) {
      const probe = await get(`http://localhost:${port}/`, { timeout: 5000 });
      if (probe.ok) break;
    }
    await sleep(50);
  }
  await sleep(150); // the route tables are printed right after the address
  return {
    port,
    output: () => out,
    readyMs: now() - started,
    async stop() {
      if (exited === null) {
        await new Promise((resolve) => {
          child.once("exit", resolve);
          child.kill("SIGTERM");
          setTimeout(resolve, 5000);
        });
      }
      for (let i = 0; i < 20 && (await portInUse(port)); i++) await sleep(100);
      const left = listeningPid(port);
      if (left) {
        process.kill(left, "SIGTERM");
        await sleep(300);
      }
      if (await portInUse(port)) throw new Error(`port ${port} is still in use after stopping the server`);
    },
  };
}

export function chromePath() {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("no Chrome found: set CHROME_PATH to a Chrome or Chromium executable");
  return found;
}
