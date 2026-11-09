// Bounded fuzzing of the experimental dev server: the request path and the dependency-cache loader.
//   pnpm run fuzz:dev-server [-- --seconds=20]
// Invariants: a response never contains planted secrets from outside the served folders; the server keeps answering; the cache
// loader never throws, never returns anything but exactly what a valid entry holds, and never reads outside its folder.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createHash } from "node:crypto";
import { PORT_ATTACK as PORT, makeSyntheticProject, makeTemp, startServer, write } from "./lib.mjs";
import { readCache } from "../../packages/dev-server/src/depsCache.js";

const seconds = Number(process.argv.find((a) => a.startsWith("--seconds="))?.split("=")[1] ?? 20);
let seed = Number(process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1] ?? Date.now() % 1_000_000);
console.log(`fuzz seed ${seed} (rerun with --seed=${seed}), ${seconds} s per part`);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const MARK = /TEST_SECRET_SHOULD_NOT_LEAK|root:x?:0:0/;
const failures: string[] = [];

// ---- part 1: request paths
const PARTS = ["..", ".", "%2e%2e", "%2E", "%252e%252e", "%2f", "%5c", "\\", "/", "//", "%00", "\u0000", "%c0%ae", "..;", "~", ".env", "link-out.ts", "link-dir", "secret.txt", "app", "packages", "components", "Widget.tsx", "routes", "index.tsx", "node_modules", ".git", "x".repeat(300), "%ff", "%e0%a4%a", "?import", "?raw", "#frag", "@fs", "etc", "passwd"];
const PREFIXES = ["/_devora/m/app/", "/_devora/m/packages/", "/_devora/deps/", "/_devora/m/", "/", "/hello.txt", "/link-dir/", "/_devora/", "/api/"];
function fuzzPath(): string {
  let p = pick(PREFIXES);
  const n = 1 + Math.floor(rnd() * 8);
  for (let i = 0; i < n; i++) p += pick(PARTS) + (rnd() < 0.6 ? "/" : "");
  return p;
}
function rawRequest(target: string): Promise<{ status: number; text: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    let text = "";
    const socket = net.connect(PORT, "127.0.0.1", () => socket.write(`GET ${target} HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`));
    const done = (timedOut: boolean) => { socket.destroy(); resolve({ status: Number(/^HTTP\/1\.1 (\d+)/.exec(text)?.[1] ?? 0), text, timedOut }); };
    socket.on("data", (c) => (text += c));
    socket.on("close", () => done(false));
    socket.on("error", () => done(false));
    setTimeout(() => done(true), 5000);
  });
}

const project = makeSyntheticProject({ name: "fuzz", port: PORT });
const outside = path.join(path.dirname(project.root), `${path.basename(project.root)}-outside`);
write(path.join(outside, "secret.txt"), "TEST_SECRET_SHOULD_NOT_LEAK\n");
write(path.join(outside, "secret.ts"), "export const secret = 'TEST_SECRET_SHOULD_NOT_LEAK';\n");
fs.symlinkSync(path.join(outside, "secret.ts"), path.join(project.appDir, "link-out.ts"));
fs.symlinkSync(outside, path.join(project.appDir, "public", "link-dir"));
write(path.join(project.appDir, ".env"), "TEST_SECRET_SHOULD_NOT_LEAK=1\n");
write(path.join(project.appDir, "public", "hello.txt"), "hello\n");
let requests = 0;
let server;
try {
  server = await startServer({ root: project.root, experimental: true, port: PORT });
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const target = fuzzPath();
    const r = await rawRequest(target);
    requests++;
    if (r.timedOut) failures.push(`timeout: GET ${JSON.stringify(target)}`);
    else if (MARK.test(r.text)) failures.push(`LEAK: GET ${JSON.stringify(target)} -> ${r.status}`);
    else if (r.status >= 500) failures.push(`server error ${r.status}: GET ${JSON.stringify(target)}`);
    if (failures.length > 20) break;
  }
  const alive = await rawRequest("/");
  if (alive.status !== 200) failures.push(`the server did not answer a normal request afterwards (status ${alive.status})`);
} catch (error) {
  failures.push(`part 1 harness error: ${(error as Error).message}`);
} finally {
  try { await server?.stop(); } catch (error) { failures.push((error as Error).message); }
  project.cleanup();
  fs.rmSync(outside, { recursive: true, force: true });
}
console.log(`part 1: ${requests} request paths, ${failures.length} problem(s)`);

// ---- part 2: the dependency-cache loader
const cacheTmp = makeTemp("cachefuzz");
const root = path.join(cacheTmp.dir, "cache");
const KEY = "a".repeat(64);
const entryDir = path.join(root, "v1", KEY);
const SPECS = ["react", "react-dom"];
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const secretOutside = path.join(cacheTmp.dir, "outside-secret.js");
fs.writeFileSync(secretOutside, "TEST_SECRET_SHOULD_NOT_LEAK");
let loads = 0;
const before = failures.length;
const end2 = Date.now() + seconds * 1000;
const NAMES = ["a.js", "../a.js", "..\\a.js", "/etc/passwd", "a.js\0", "a/b.js", "", ".js", "x".repeat(300) + ".js", "con.js", "outside.js", "../../outside-secret.js"];
while (Date.now() < end2) {
  fs.rmSync(entryDir, { recursive: true, force: true });
  fs.mkdirSync(entryDir, { recursive: true });
  const files: Record<string, string> = {};
  const n = Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const name = pick(NAMES);
    const body = pick(["export default 1;", "", "\0\0", "x".repeat(2000)]);
    files[name] = rnd() < 0.5 ? sha(body) : pick(["", "0".repeat(64), 5 as unknown as string]);
    try {
      if (name && !name.includes("\0")) {
        const target = path.join(entryDir, name);
        if (target.startsWith(entryDir + path.sep) || rnd() < 0.2) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          if (rnd() < 0.2) fs.symlinkSync(secretOutside, target);
          else fs.writeFileSync(target, body);
        }
      }
    } catch {
      // some names cannot be created: fine
    }
  }
  const manifest = pick([
    JSON.stringify({ format: 1, key: KEY, specifiers: SPECS, cjs: pick([[], ["react"], ["nope"]]), files }),
    JSON.stringify({ format: 2, key: KEY, specifiers: SPECS, files }),
    JSON.stringify({ format: 1, key: "b".repeat(64), specifiers: SPECS, files }),
    JSON.stringify({ format: 1, key: KEY, specifiers: ["react"], files }),
    "{ not json", "null", "[]", '"str"', "",
  ]);
  fs.writeFileSync(path.join(entryDir, "manifest.json"), manifest);
  loads++;
  try {
    const got = await readCache(root, pick([KEY, "../".repeat(3) + "etc", "A".repeat(64), KEY + "0"]), SPECS);
    if (got) {
      for (const [name, text] of got.files) {
        if (/TEST_SECRET_SHOULD_NOT_LEAK/.test(text)) failures.push(`cache loader returned a planted secret (name ${JSON.stringify(name)})`);
        if (!/^[\w.-]+\.js$/.test(name)) failures.push(`cache loader accepted the name ${JSON.stringify(name)}`);
        if (sha(text) !== (JSON.parse(manifest).files ?? {})[name]) failures.push(`cache loader returned content that does not match its recorded hash (${JSON.stringify(name)})`);
      }
    }
  } catch (error) {
    failures.push(`cache loader threw: ${(error as Error).message}`);
  }
  if (failures.length - before > 10) break;
}
cacheTmp.cleanup();
console.log(`part 2: ${loads} cache entries, ${failures.length - before} problem(s)`);

if (failures.length > 0) {
  console.log(`\nFAILED (${failures.length}):`);
  for (const f of failures.slice(0, 20)) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("PASS");
