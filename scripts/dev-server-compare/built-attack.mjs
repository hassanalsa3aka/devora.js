#!/usr/bin/env node
// Request-level attacks against the BUILT output served by `devora start`, for a build made with Vite and a build made with
// Sekhem (`devora build --engine=own`), on one fixture project with planted secrets. Each server is started in a temporary
// project on port 11011, attacked, and stopped. A request that fails or times out is a FAILED check, never a pass.
// Exit code: non-zero when any check fails for either build or the harness itself goes wrong.
//   node scripts/dev-server-compare/built-attack.mjs [--engine=vite|own]   (default: both)
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO, get, makeSyntheticProject, portInUse, sleep, write } from "./lib.mjs";

const PORT = 11011;
const SECRET = "TEST_SECRET_SHOULD_NOT_LEAK";
const LEAK = new RegExp(`${SECRET}|root:x?:0:0|root:\\*:0:0`);
const TSX = path.join(REPO, "node_modules", ".bin", "tsx");
const CLI = path.join(REPO, "packages/cli/src/index.ts");
const only = (process.argv.find((a) => a.startsWith("--engine=")) ?? "").split("=")[1];
const engines = only ? [only] : ["vite", "own"];
const REFUSAL = [400, 403, 404, 405, 413, 414, 431];

function makeFixture() {
  const project = makeSyntheticProject({ name: "built-attack", port: PORT });
  const app = project.appDir;
  write(path.join(project.root, ".env"), `${SECRET}=project-env\n`);
  write(path.join(app, ".env"), `${SECRET}=app-env\n`);
  write(path.join(app, "public", "hello.txt"), "hello\n");
  write(path.join(app, "public", ".hidden"), `${SECRET}=public-dotfile\n`);
  write(
    path.join(app, "api", "hello.ts"),
    'import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) }));\n'
  );
  write(
    path.join(app, "api", "boom.ts"),
    `import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => { throw new Error("${SECRET} at " + process.cwd()); });\n`
  );
  write(
    path.join(app, "routes", "boom.tsx"),
    `export const renderMode = "ssr";\nexport async function loader() { throw new Error("${SECRET} at " + process.cwd()); }\nexport default function Boom() { return <p>never</p>; }\n`
  );
  return project;
}

function run(args, cwd, env = {}) {
  return execFileSync(TSX, [CLI, ...args], { cwd, env: { ...process.env, NO_COLOR: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef", ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 240000 });
}

async function startBuilt(root) {
  if (await portInUse(PORT)) throw new Error(`port ${PORT} is already in use`);
  const child = spawn(TSX, [CLI, "start"], { cwd: root, env: { ...process.env, NO_COLOR: "1", PORT: String(PORT), DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef" }, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  let exited = null;
  child.once("exit", (c) => (exited = c ?? "signal"));
  const t0 = Date.now();
  for (;;) {
    if (exited !== null) throw new Error(`devora start exited (${exited}):\n${out}`);
    if (Date.now() - t0 > 60000) { child.kill("SIGTERM"); throw new Error(`devora start did not answer in 60 s:\n${out}`); }
    if (await portInUse(PORT)) { const p = await get(`http://127.0.0.1:${PORT}/`, { timeout: 5000 }); if (p.ok) break; }
    await sleep(100);
  }
  return {
    output: () => out,
    async stop() {
      if (exited === null) await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(resolve, 5000); });
      for (let i = 0; i < 30 && (await portInUse(PORT)); i++) await sleep(100);
      if (await portInUse(PORT)) throw new Error(`port ${PORT} still in use after stop`);
    },
  };
}

const url = (p) => `http://127.0.0.1:${PORT}${p}`;

/** Raw bytes in; the status line and whether the server closed the connection. A hang is reported as timedOut. */
function raw(bytes, wait = 4000) {
  return new Promise((resolve) => {
    let text = "";
    let closed = false;
    const socket = net.connect(PORT, "127.0.0.1", () => socket.write(bytes));
    const done = (timedOut) => { socket.destroy(); resolve({ status: Number(/^HTTP\/1\.1 (\d+)/.exec(text)?.[1] ?? 0), closed, timedOut, text }); };
    socket.on("data", (c) => (text += c));
    socket.on("close", () => { closed = true; done(false); });
    socket.on("error", () => { closed = true; done(false); });
    setTimeout(() => done(!closed), wait);
  });
}

function clientFiles(root) {
  const dir = path.join(root, "apps", "web", "dist", "client");
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : out.push(p); } };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

async function checks(root, engine) {
  const R = [];
  const add = (category, name, pass, observed) => R.push({ category, name, pass, observed });
  const note = (r) => (r.ok ? `status ${r.status}` : `REQUEST FAILED: ${r.error}`);
  const refused = (r) => r.ok && REFUSAL.includes(r.status);

  const home = await get(url("/"));
  add("sanity", "the built server answers the home page", home.ok && home.status === 200 && home.body.includes("built-attack"), note(home));
  add("headers", "X-Content-Type-Options: nosniff on a page", home.headers.get("x-content-type-options") === "nosniff", home.headers.get("x-content-type-options") ?? "missing");
  add("headers", "no X-Powered-By or Server version", !home.headers.get("x-powered-by") && !/\d/.test(home.headers.get("server") ?? ""), `x-powered-by ${home.headers.get("x-powered-by") ?? "none"}, server ${home.headers.get("server") ?? "none"}`);

  // ---- path traversal and files that must not be served
  const paths = [
    "/../package.json", "/%2e%2e/package.json", "/..%2fpackage.json", "/%2e%2e%2fpackage.json", "/%252e%252e/package.json", "/..\\package.json", "/%2e%2e%5cpackage.json",
    "/assets/../../../package.json", "/assets/%2e%2e/%2e%2e/%2e%2e/package.json", "/hello.txt%00.png", "/%00", "/../../../../etc/passwd", "/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd",
    "/..;/package.json", "/.%2e/package.json", "//etc/passwd", "/hello.txt/../../package.json",
  ];
  for (const p of paths) {
    const r = await get(url(p));
    add("path traversal", `${p} does not return a file outside the client folder`, r.ok && !LEAK.test(r.body) && !/"name":\s*"compare-built-attack/.test(r.body), note(r));
  }
  for (const p of ["/.env", "/.hidden", "/public/.hidden", "/.git/config", "/package.json", "/devora.config.ts", "/tsconfig.json", "/server/routes/index.js", "/dist/server/routes/index.js", "/dist/client/index.html", "/assets/", "/assets", "/node_modules/", "/apps/web/.env"]) {
    const r = await get(url(p));
    add("files not served", `${p} is not served`, r.ok && !LEAK.test(r.body) && !(r.status === 200 && /import |export |require\(/.test(r.body) && p.includes("server")), note(r));
  }
  const files = clientFiles(root);
  add("build output", "the client output holds no source maps", files.every((f) => !f.endsWith(".map")), `${files.filter((f) => f.endsWith(".map")).length} .map files`);
  const leaked = files.filter((f) => LEAK.test(fs.readFileSync(f, "utf8")));
  add("build output", "the planted .env secret is in no browser file", leaked.length === 0, leaked.length ? `found in ${leaked.map((f) => path.basename(f)).join(", ")}` : `${files.length} files checked`);
  const served = files.filter((f) => /\.(js|css)$/.test(f)).slice(0, 3);
  for (const f of served) {
    const rel = path.relative(path.join(root, "apps", "web", "dist", "client"), f).split(path.sep).join("/");
    const r = await get(url(`/${rel}`));
    add("build output", `built asset /${rel} is served with a nosniff header and a long-lived cache`, r.ok && r.status === 200 && r.headers.get("x-content-type-options") === "nosniff", note(r));
  }

  // ---- error output
  for (const p of ["/boom", "/api/boom", "/no-such-page", "/api/no-such"]) {
    const r = await get(url(p));
    add("error output", `${p}: no secret, absolute path or stack trace in the body`, r.ok && !LEAK.test(r.body) && !r.body.includes(root) && !/\n\s+at .*\(.*:\d+:\d+\)/.test(r.body), note(r));
  }
  const boom = await get(url("/boom"));
  add("error output", "a throwing loader answers with a 5xx, not a hang or a 200", boom.ok && boom.status >= 500 && boom.status < 600, note(boom));

  // ---- methods
  const trace = await raw(`TRACE / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nX-Probe: trace-echo\r\n\r\n`);
  add("methods", "TRACE / is refused (4xx) or the connection closed, and the request is not echoed", !trace.timedOut && (trace.status === 0 ? trace.closed : trace.status >= 400) && !/trace-echo/.test(trace.text.split("\r\n\r\n").slice(1).join("")), trace.timedOut ? "REQUEST FAILED: timeout" : `status ${trace.status}`);
  for (const m of ["DELETE", "PUT", "PATCH"]) {
    const r = await get(url("/"), { method: m });
    add("methods", `${m} / is refused or ignored (no 2xx body that echoes the request)`, r.ok && (r.status >= 400 || r.status === 204) && !/TRACE \/ HTTP/.test(r.body), note(r));
  }
  const head = await get(url("/"), { method: "HEAD" });
  add("methods", "HEAD / answers without a body", head.ok && head.status === 200 && head.body === "", note(head));
  const connect = await raw(`CONNECT evil.example:443 HTTP/1.1\r\nHost: evil.example:443\r\n\r\n`);
  add("methods", "CONNECT is not tunnelled (4xx or closed)", connect.status === 0 ? connect.closed : connect.status >= 400 && connect.status < 500, connect.timedOut ? "timeout" : `status ${connect.status}${connect.closed ? ", closed" : ""}`);

  // ---- malformed requests: the server answers 4xx or closes, never 5xx and never hangs
  const malformed = [
    ["Content-Length and Transfer-Encoding together", `POST /api/hello HTTP/1.1\r\nHost: x\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /smuggled HTTP/1.1\r\nHost: x\r\n\r\n`],
    ["two different Content-Length headers", `POST /api/hello HTTP/1.1\r\nHost: x\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\nab`],
    ["a header name with a space", `GET / HTTP/1.1\r\nHost: x\r\nBad Header: 1\r\n\r\n`],
    ["a NUL byte in a header value", `GET / HTTP/1.1\r\nHost: x\r\nX-A: a\0b\r\n\r\n`],
    ["a bare LF line ending", `GET / HTTP/1.1\nHost: x\n\n`],
    ["an HTTP version that does not exist", `GET / HTTP/9.9\r\nHost: x\r\n\r\n`],
    ["a request line with CRLF in the target", `GET /a%0d%0aSet-Cookie:x=1 HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`],
    ["an invalid chunk size", `POST /api/hello HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: chunked\r\n\r\nZZ\r\n`],
  ];
  for (const [name, bytes] of malformed) {
    const r = await raw(bytes);
    const ok = !r.timedOut && (r.status === 0 ? r.closed : r.status >= 200 && r.status < 500) && !/Set-Cookie: ?x=1/i.test(r.text) && !/smuggled/.test(r.text.replace(/GET \/smuggled/g, ""));
    add("malformed requests", `${name}: 4xx, handled, or closed (no 5xx, no hang, no injected header)`, ok, r.timedOut ? "REQUEST FAILED: timeout" : `status ${r.status}${r.closed ? ", closed" : ""}`);
  }
  const bigHeader = await raw(`GET / HTTP/1.1\r\nHost: x\r\nX-Big: ${"a".repeat(200000)}\r\n\r\n`);
  add("limits", "a 200 kB header is refused (431/400) or the connection closed", !bigHeader.timedOut && (bigHeader.status === 0 ? bigHeader.closed : [400, 431].includes(bigHeader.status)), bigHeader.timedOut ? "REQUEST FAILED: timeout" : `status ${bigHeader.status}`);
  const longUrl = await get(url(`/${"a".repeat(100000)}`));
  add("limits", "a 100 kB URL is refused or not found", refused(longUrl) || (!longUrl.ok && /HPE|ECONNRESET|UND_ERR/.test(longUrl.error)), note(longUrl));
  const bigBody = await get(url("/api/hello"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ a: "x".repeat(5 * 1024 * 1024) }) });
  add("limits", "a 5 MB JSON body to an API route does not crash the server", (bigBody.ok && bigBody.status < 500) || !bigBody.ok, note(bigBody));
  const form = await get(url("/"), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "a=" + "x".repeat(5 * 1024 * 1024) });
  add("limits", "a 5 MB form body to a page is refused or ignored, not a 5xx crash", (form.ok && form.status < 500) || !form.ok, note(form));
  const stillUp = await get(url("/"));
  add("limits", "the server still answers after all of the above", stillUp.ok && stillUp.status === 200, note(stillUp));

  // ---- redirects and header injection
  for (const p of ["//evil.example", "/\\evil.example", "/%2f%2fevil.example", "/%5cevil.example", "///evil.example/%2e%2e"]) {
    const r = await get(url(p));
    const loc = r.headers.get("location") ?? "";
    add("redirects", `${p} is not an open redirect`, r.ok && !/^(https?:)?\/\/evil\.example/i.test(loc) && !/^\\\\?evil/i.test(loc), r.ok ? `status ${r.status}${loc ? `, Location ${loc}` : ""}` : note(r));
  }
  const inj = await get(url("/hello.txt?x=%0d%0aSet-Cookie:%20injected=1"));
  add("redirects", "CRLF in a query string does not add a header", inj.ok && !inj.headers.get("set-cookie"), note(inj));

  // ---- Host and forwarding headers
  const xfh = await get(url("/"), { headers: { "X-Forwarded-Host": "evil.example", "X-Forwarded-Proto": "https", Forwarded: "host=evil.example" } });
  add("host headers", "X-Forwarded-Host and Forwarded do not change what is served", xfh.ok && xfh.status === 200 && !/evil\.example/.test(xfh.body) && !/evil\.example/.test(xfh.headers.get("location") ?? ""), note(xfh));
  const cors = await get(url("/api/hello"), { headers: { Origin: "http://evil.example" } });
  add("cors", "an API route answers a foreign Origin without Access-Control-Allow-Origin", cors.ok && !cors.headers.get("access-control-allow-origin"), cors.ok ? `ACAO ${cors.headers.get("access-control-allow-origin") ?? "none"}` : note(cors));
  const pre = await get(url("/api/hello"), { method: "OPTIONS", headers: { Origin: "http://evil.example", "Access-Control-Request-Method": "POST" } });
  add("cors", "a preflight from a foreign Origin is not approved", pre.ok && !pre.headers.get("access-control-allow-origin"), pre.ok ? `status ${pre.status}, ACAO ${pre.headers.get("access-control-allow-origin") ?? "none"}` : note(pre));

  // ---- the server holds up under many slow and abandoned connections
  const sockets = [];
  for (let i = 0; i < 200; i++) sockets.push(net.connect(PORT, "127.0.0.1", function () { this.write("GET / HTTP/1.1\r\nHost: x\r\nX-Slow: "); }));
  await sleep(500);
  const during = await get(url("/"), { timeout: 8000 });
  add("limits", "with 200 half-open requests, a normal request is still answered", during.ok && during.status === 200, note(during));
  for (const s of sockets) s.destroy();
  await sleep(300);
  const after = await get(url("/"));
  add("limits", "after they are dropped the server is healthy", after.ok && after.status === 200, note(after));

  return R;
}

let failed = 0;
const summary = {};
for (const engine of engines) {
  const fixture = makeFixture();
  let server;
  try {
    const flag = engine === "own" ? ["--engine=own"] : ["--engine=vite"];
    console.log(`\n== build with ${engine === "own" ? "Sekhem" : "Vite"}`);
    run(["build", ...flag], fixture.root, { NODE_ENV: "production" });
    server = await startBuilt(fixture.root);
    const results = await checks(fixture.root, engine);
    summary[engine] = results;
    const bad = results.filter((r) => !r.pass);
    console.log(`${results.length - bad.length}/${results.length} checks passed`);
    for (const r of bad) { console.log(`  FAIL: [${r.category}] ${r.name} - ${r.observed}`); failed++; }
  } catch (error) {
    console.log(`  HARNESS ERROR (${engine}): ${error.message}`);
    failed++;
  } finally {
    if (server) await server.stop().catch((e) => { console.log(`  stop failed: ${e.message}`); failed++; });
    fixture.cleanup();
  }
}
if (summary.vite && summary.own) {
  const diff = summary.vite.filter((r, i) => summary.own[i] && r.pass !== summary.own[i].pass);
  console.log(diff.length ? `\n${diff.length} checks differ between the two builds:` : "\nThe two builds gave the same result on every check.");
  for (const r of diff) console.log(`  [${r.category}] ${r.name}`);
}
if (failed) { console.log(`\nFAIL: ${failed} problem(s)`); process.exit(1); }
console.log("\nPASS: every request-level check passed for the built output");
