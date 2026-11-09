// Builds the repository's four apps with Vite and with the own engine (Sekhem), serves each production build with
// `devora start` (ports 11001-11004) and compares every route: status, headers, cookies, redirect target and normalised HTML.
// It also fetches every /assets and /icons URL a page refers to, in both builds, and requires 200 with a sane content type.
//   pnpm exec tsx scripts/dev-server-compare/build-parity.mts [--keep-output]
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { listRouteFiles, routeFileToPath } from "../../packages/core/src/router.ts";
import { APP_PORTS, REPO, get, makeRepoAppsProject, portInUse, sleep } from "./lib.mjs";

const TSX = path.join(REPO, "node_modules", ".bin", "tsx");
const CLI = path.join(REPO, "packages/cli/src/index.ts");
const KEEP = ["content-type", "content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security", "cache-control", "referrer-policy", "permissions-policy"];
const env = { ...process.env, NO_COLOR: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef" } as Record<string, string>;
const header = (v: string | null) => (v ?? "").replace(/'nonce-[^']*'/g, "'nonce-N'");
const normalise = (body: string, type: string) =>
  !/html/.test(type)
    ? body
    : body
        .replace(/<script\b[^>]*><\/script>/g, "<script/>")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "<script/>")
        .replace(/<link rel="stylesheet"[^>]*>/g, "<link-css/>")
        .replace(/<link rel="modulepreload"[^>]*>/g, "")
        .replace(/data-island="island-\d+"/g, 'data-island="N"')
        .replace(/nonce="[^"]*"/g, 'nonce="N"')
        .replace(/name="_csrf" value="[^"]*"/g, 'name="_csrf" value="T"')
        .replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, "TIME")
        .replace(/data-island-url="[^"]*"/g, 'data-island-url="U"')
        .replace(/data-csr-entry="[^"]*"/g, 'data-csr-entry="U"')
        .replace(/(src|href)="\/assets\/[^"]*"/g, '$1="/assets/A"');

const project = makeRepoAppsProject();
const failures: string[] = [];

function routesOf(app: string): string[] {
  const appRoot = path.join(project.root, "apps", app);
  const out = new Set<string>(["/does-not-exist", "/sitemap.xml", "/favicon.ico", "/robots.txt", "/api/nope"]);
  for (const dir of ["routes", "api"]) {
    const base = path.join(appRoot, dir);
    if (!fs.existsSync(base)) continue;
    for (const file of listRouteFiles(base)) {
      let p = routeFileToPath(base, file).replace(/\[\.\.\.[^\]]+\]/g, "a/b").replace(/\[[^\]]+\]/g, "1");
      if (dir === "api") p = `/api${p === "/" ? "" : p}`;
      out.add(p);
    }
  }
  if (app === "marketing") out.add("/posts/hello-world");
  return [...out];
}

function build(engine: string): number {
  const started = performance.now();
  const r = spawnSync(TSX, [CLI, "build", `--engine=${engine}`, "--quiet"], { cwd: project.root, env, encoding: "utf8" });
  if (r.status !== 0) failures.push(`build --engine=${engine} failed:\n${(r.stdout + r.stderr).slice(-1500)}`);
  return performance.now() - started;
}

async function serve(app: string, port: number): Promise<{ stop: () => Promise<void> }> {
  const child = spawn(TSX, [CLI, "start", `--app=${app}`, `--port=${port}`, "--host=127.0.0.1"], { cwd: project.root, env: { ...env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  for (let i = 0; i < 400; i++) {
    if (await portInUse(port)) break;
    await sleep(50);
  }
  if (!(await portInUse(port))) throw new Error(`devora start did not listen for ${app}:\n${out}`);
  return {
    async stop() {
      child.kill("SIGTERM");
      for (let i = 0; i < 40 && (await portInUse(port)); i++) await sleep(100);
    },
  };
}

type Snap = Record<string, any>;
async function snapshot(port: number, paths: string[]): Promise<Snap> {
  const out: Snap = {};
  const assets = new Set<string>();
  for (const p of paths) {
    const r: any = await get(`http://127.0.0.1:${port}${p}`);
    if (!r.ok) {
      out[p] = { failed: r.error };
      continue;
    }
    const type = r.headers.get("content-type") ?? "";
    if (/html/.test(type)) for (const m of r.body.matchAll(/(?:src|href|data-island-url|data-csr-entry)="(\/(?:assets|icons)\/[^"]+)"/g)) assets.add(m[1]);
    out[p] = {
      status: r.status,
      headers: Object.fromEntries(KEEP.map((k) => [k, header(r.headers.get(k))]).filter(([, v]) => v !== "")),
      cookies: r.headers.getSetCookie().map((c: string) => c.split("=")[0]).sort(),
      location: r.headers.get("location"),
      body: normalise(r.body, type),
    };
  }
  let ok = 0;
  const bad: string[] = [];
  for (const a of assets) {
    const r: any = await get(`http://127.0.0.1:${port}${a}`);
    if (r.ok && r.status === 200 && !/html/.test(r.headers.get("content-type") ?? "")) ok++;
    else bad.push(`${a} -> ${r.ok ? r.status + " " + r.headers.get("content-type") : r.error}`);
  }
  out["<assets>"] = { ok, bad };
  return out;
}

const times: Record<string, number> = {};
const snaps: Record<string, Record<string, Snap>> = { vite: {}, own: {} };
try {
  for (const engine of ["vite", "own"]) {
    times[engine] = build(engine);
    for (const [app, port] of Object.entries(APP_PORTS)) {
      const server = await serve(app, port);
      try {
        snaps[engine]![app] = await snapshot(port, routesOf(app));
      } finally {
        await server.stop();
      }
    }
    if (process.argv.includes("--keep-output")) for (const app of Object.keys(APP_PORTS)) fs.cpSync(path.join(project.root, "apps", app, "dist"), path.join(project.root, `dist-${engine}-${app}`), { recursive: true });
  }
} catch (error) {
  failures.push(String((error as Error).message ?? error));
}

let compared = 0;
let identical = 0;
for (const app of Object.keys(APP_PORTS)) {
  const a = snaps.vite![app];
  const b = snaps.own![app];
  if (!a || !b) continue;
  for (const p of Object.keys(a)) {
    if (p === "<assets>") {
      for (const [label, s] of [["vite", a[p]], ["own", b[p]]] as const) if (s.bad.length > 0) failures.push(`${app} assets (${label}): ${s.bad.slice(0, 5).join(", ")}`);
      if (a[p].ok !== b[p].ok) failures.push(`${app}: pages refer to ${a[p].ok} assets (vite) but ${b[p].ok} (own)`);
      continue;
    }
    const x = a[p];
    const y = b[p];
    if (x.failed || !y || y.failed) {
      failures.push(`${app} ${p}: request failed (vite: ${x.failed ?? "ok"}, own: ${y?.failed ?? "ok"})`);
      continue;
    }
    compared++;
    const diffs: string[] = [];
    if (x.status !== y.status) diffs.push(`status ${x.status} vs ${y.status}`);
    for (const k of new Set([...Object.keys(x.headers), ...Object.keys(y.headers)])) if (x.headers[k] !== y.headers[k]) diffs.push(`header ${k}: ${x.headers[k]} | ${y.headers[k]}`);
    if (x.cookies.join() !== y.cookies.join()) diffs.push(`cookies ${x.cookies} | ${y.cookies}`);
    if (x.location !== y.location) diffs.push(`location ${x.location} | ${y.location}`);
    if (x.body !== y.body && !(x.status === 500 && y.status === 500)) {
      let i = 0;
      while (i < x.body.length && x.body[i] === y.body[i]) i++;
      diffs.push(`body differs at ${i}: vite=${JSON.stringify(x.body.slice(Math.max(0, i - 40), i + 80))} own=${JSON.stringify(y.body.slice(Math.max(0, i - 40), i + 80))}`);
    }
    if (diffs.length === 0) identical++;
    else failures.push(`${app} ${p}: ${diffs.join("; ").slice(0, 700)}`);
  }
}
if (!process.argv.includes("--keep-output")) project.cleanup();
else console.log(`kept: ${project.root}`);
console.log(`build parity: ${identical} of ${compared} routes identical (vite ${(times.vite! / 1000).toFixed(1)} s, own ${(times.own! / 1000).toFixed(1)} s for the four apps, including process start)`);
if (failures.length > 0) {
  console.log(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("PASS");
