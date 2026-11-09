#!/usr/bin/env node
// The same attacks against `devora dev` (Vite) and `devora dev --experimental-dev-server`, on one fixture project with
// planted secrets, a symlink out of the app, a symlinked public folder and dotfiles. It starts both servers itself
// (port 11010), in a temporary project. A request that fails or times out is a FAILED check, never a pass; a connection the
// server closes without an answer counts as a refusal only where the check says so. Exit code: non-zero when a check of the
// experimental server fails or anything went wrong in the harness. Vite's failures are reported as findings (the baseline).
//   node scripts/dev-server-compare/attack-compare.mjs
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { PORT_ATTACK as PORT, REPO, get, makeSyntheticProject, startServer, write } from "./lib.mjs";

const MARK = /TEST_SECRET_SHOULD_NOT_LEAK|root:x?:0:0|root:\*:0:0/;
let HOST = "127.0.0.1"; // Vite binds "localhost" (::1 here); the experimental server binds 127.0.0.1

/** The fixture: a synthetic app plus planted secrets and links. */
function makeFixture() {
  const project = makeSyntheticProject({ name: "attack", port: PORT });
  const outside = path.join(path.dirname(project.root), `${path.basename(project.root)}-outside`);
  write(path.join(outside, "secret.txt"), "TEST_SECRET_SHOULD_NOT_LEAK=outside-file\n");
  write(path.join(outside, "secret.ts"), "export const secret = 'TEST_SECRET_SHOULD_NOT_LEAK';\n");
  write(path.join(outside, "secret.module.css"), ".TEST_SECRET_SHOULD_NOT_LEAK { color: red; }\n");
  const app = project.appDir;
  fs.symlinkSync(path.join(outside, "secret.ts"), path.join(app, "link-out.ts"));
  fs.symlinkSync(path.join(outside, "secret.module.css"), path.join(app, "link-out.module.css"));
  write(path.join(app, "public", "hello.txt"), "hello\n");
  fs.symlinkSync(outside, path.join(app, "public", "link-dir"));
  write(path.join(app, ".env"), "TEST_SECRET_SHOULD_NOT_LEAK=app-env\n");
  write(path.join(project.root, ".env"), "TEST_SECRET_SHOULD_NOT_LEAK=project-env\n");
  write(path.join(app, "public", ".env"), "TEST_SECRET_SHOULD_NOT_LEAK=public-env\n");
  write(
    path.join(app, "api", "hello.ts"),
    'import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) }));\n'
  );
  return { ...project, outsideFile: path.join(outside, "secret.txt"), cleanup: () => { project.cleanup(); fs.rmSync(outside, { recursive: true, force: true }); } };
}

function request(p, headers = {}, { method = "GET", body, timeout = 15000 } = {}) {
  return new Promise((resolve) => {
    const req = http.request({ host: HOST, port: PORT, path: p, method, headers: { Host: `localhost:${PORT}`, ...headers } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ ok: true, status: res.statusCode, body: data, headers: res.headers }));
    });
    req.setTimeout(timeout, () => { req.destroy(); resolve({ ok: false, status: 0, body: "", headers: {}, error: `timeout after ${timeout} ms` }); });
    req.on("error", (e) => resolve({ ok: false, status: 0, body: "", headers: {}, error: String(e.code ?? e.message) }));
    if (body) req.write(body);
    req.end();
  });
}

/** Raw bytes in; { status, closed, timedOut, text } out. `closed` = the server ended the connection (with or without an answer). */
function raw(bytes, { wait = 4000 } = {}) {
  return new Promise((resolve) => {
    let text = "";
    let closed = false;
    const socket = net.connect(PORT, HOST, () => socket.write(bytes));
    const finish = (timedOut) => { socket.destroy(); resolve({ status: Number(/^HTTP\/1\.1 (\d+)/.exec(text)?.[1] ?? 0), closed, timedOut, text }); };
    socket.on("data", (c) => (text += c));
    socket.on("close", () => { closed = true; finish(false); });
    socket.on("error", () => { closed = true; finish(false); });
    setTimeout(() => finish(!closed), wait);
  });
}

function upgrade(p, headers) {
  return new Promise((resolve) => {
    let out = "";
    let closed = false;
    const socket = net.connect(PORT, HOST, () => {
      const key = crypto.randomBytes(16).toString("base64");
      const lines = [`GET ${p} HTTP/1.1`, `Host: ${headers.Host ?? `localhost:${PORT}`}`, "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Key: ${key}`, "Sec-WebSocket-Version: 13", ...Object.entries(headers).filter(([k]) => k !== "Host").map(([k, v]) => `${k}: ${v}`)];
      socket.write(lines.join("\r\n") + "\r\n\r\n");
    });
    const finish = (timedOut) => { socket.destroy(); resolve({ line: out.split("\r\n")[0] || (closed ? "closed" : "timeout"), accepted: out.startsWith("HTTP/1.1 101"), closed, timedOut }); };
    socket.on("data", (c) => { out += c; if (out.includes("\r\n\r\n")) finish(false); });
    socket.on("close", () => { closed = true; finish(false); });
    socket.on("error", () => { closed = true; finish(false); });
    setTimeout(() => finish(!closed && out === ""), 4000);
  });
}

const REFUSAL = [400, 403, 404, 405, 413, 414, 431];
const refused = (r) => r.ok && REFUSAL.includes(r.status);
const failedNote = (r) => (r.ok ? `status ${r.status}` : `REQUEST FAILED: ${r.error}`);
/** A WebSocket upgrade is refused by an explicit 4xx/5xx answer or by the server closing the socket; a hang is a failure. */
const wsRefused = (u) => !u.accepted && !u.timedOut;

async function runChecks(experimental, fixture) {
  const R = [];
  const add = (category, name, pass, observed, applicable = true) => R.push({ category, name, pass: applicable ? pass : null, observed });
  const home = await request("/");
  add("sanity", "server answers on localhost", home.ok && home.status === 200, failedNote(home));

  // ---- Host header and DNS rebinding
  for (const host of ["evil.example", "evil.example:80", `evil.example:${PORT}`, `localhost.evil.example:${PORT}`, "127.0.0.1.nip.io", `attacker@localhost:${PORT}`, `localhost:${PORT}@evil.example`, "0x7f000001"]) {
    const r = await request("/", { Host: host });
    add("Host header and DNS rebinding", `Host: ${host} refused`, refused(r), failedNote(r));
  }
  const xfh = await request("/", { Host: `localhost:${PORT}`, "X-Forwarded-Host": "evil.example" });
  add("Host header and DNS rebinding", "X-Forwarded-Host: evil.example does not change what is served", xfh.ok && xfh.status === 200 && !/evil\.example/.test(xfh.body), failedNote(xfh));
  const apiHost = await request("/api/hello", { Host: "evil.example" });
  add("Host header and DNS rebinding", "API route with a foreign Host refused", refused(apiHost), failedNote(apiHost));
  const pubHost = await request("/hello.txt", { Host: "evil.example" });
  add("Host header and DNS rebinding", "public file with a foreign Host refused", refused(pubHost), failedNote(pubHost));
  const abs = await raw(`GET http://evil.example/ HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`);
  add("Host header and DNS rebinding", "absolute-form request target naming another host: answered for localhost or refused", [200, 400, 403].includes(abs.status), abs.timedOut ? "REQUEST FAILED: timeout" : `status ${abs.status}`);

  // ---- WebSocket origin and token
  const token = experimental ? /preamble\.js\?token=([\w-]+)/.exec(home.body)?.[1] ?? "" : /wsToken\s*=\s*["']([^"']+)["']/.exec((await request("/@vite/client")).body)?.[1] ?? "";
  const proto = experimental ? "devora-hmr" : "vite-hmr";
  const wsPath = experimental ? "/_devora/hmr" : "/";
  const own = `http://localhost:${PORT}`;
  const protoWithToken = experimental ? `devora-hmr, ${token}` : "vite-hmr";
  const q = experimental ? "" : `?token=${token}`;
  add("WebSocket", "the launch token was found in the page (needed by the checks below)", token !== "", token ? "found" : "NOT FOUND");
  const w1 = await upgrade(wsPath, { "Sec-WebSocket-Protocol": proto, Origin: "http://evil.example" });
  add("WebSocket", "foreign Origin, no token refused", wsRefused(w1), w1.line);
  const w2 = await upgrade(wsPath + q, { "Sec-WebSocket-Protocol": protoWithToken, Origin: "http://evil.example" });
  add("WebSocket", "foreign Origin WITH the valid token refused (defence in depth: a foreign page cannot learn the token)", wsRefused(w2), w2.line);
  const w0 = await upgrade(wsPath, { "Sec-WebSocket-Protocol": proto });
  add("WebSocket", "no Origin and no token refused", wsRefused(w0), w0.line);
  const w3 = await upgrade(wsPath + (experimental ? "" : "?token=guess"), { "Sec-WebSocket-Protocol": experimental ? "devora-hmr, wrongtoken" : "vite-hmr", Origin: own });
  add("WebSocket", "own Origin, wrong token refused", wsRefused(w3), w3.line);
  const good = await upgrade(wsPath + q, { "Sec-WebSocket-Protocol": protoWithToken, Origin: own });
  add("WebSocket", "own Origin and valid token accepted (the legitimate client works)", good.accepted, good.line);
  const w4 = await upgrade(wsPath + q, { "Sec-WebSocket-Protocol": protoWithToken, Origin: "http://evil.example", Host: "evil.example" });
  add("WebSocket", "foreign Host on upgrade refused", wsRefused(w4), w4.line);
  const w5 = await upgrade(wsPath + q, { "Sec-WebSocket-Protocol": protoWithToken, Origin: "null" });
  add("WebSocket", "Origin: null refused (with the valid token)", wsRefused(w5), w5.line);

  // ---- Origin / CORS
  for (const p of experimental ? ["/_devora/m/app/components/Widget.tsx", "/api/hello", "/"] : ["/@vite/client", "/api/hello", "/"]) {
    const r = await request(p, { Origin: "http://evil.example" });
    add("Origin / CORS", `${p}: answered, and no Access-Control-Allow-Origin for a foreign Origin`, r.ok && !r.headers["access-control-allow-origin"], r.ok ? `ACAO ${r.headers["access-control-allow-origin"] ?? "none"}` : failedNote(r));
  }
  const pre = await request("/api/hello", { Origin: "http://evil.example", "Access-Control-Request-Method": "GET" }, { method: "OPTIONS" });
  add("Origin / CORS", "preflight from a foreign Origin is answered and gets no allowance", pre.ok && !pre.headers["access-control-allow-origin"], failedNote(pre));

  // ---- file reads outside the root
  const OUT = fixture.outsideFile;
  const reads = [
    [`/@fs${OUT}`, "vite"], [`/@fs/etc/passwd`, "vite"], [`/@fs${fixture.root}/.env`, "vite"], [`/@fs${fixture.appDir}/.env`, "vite"], [`/@fs${fixture.root}/package.json`, "vite"],
    [`/@id/${OUT}`, "vite"], [`/@id/__x00__${OUT}`, "vite"], [`${OUT}?raw`, "vite"], [`/@fs${OUT}?raw`, "vite"], [`/@fs${OUT}?import&raw`, "vite"], [`/@fs${OUT}?url`, "vite"],
    [`/@fs/etc/passwd?raw??`, "vite"], [`/@fs/etc/passwd?import&?raw`, "vite"], [`/node_modules/.vite/../../../../../etc/passwd`, "vite"],
    [`/_devora/m/app/.env`, "own"], [`/_devora/m/app/link-out.ts`, "own"], [`/_devora/m/app/link-out.ts?import`, "own"], [`/_devora/m/app/../../../outside/secret.txt`, "own"], [`/_devora/m/app/%2e%2e/%2e%2e/%2e%2e/outside/secret.txt`, "own"],
    [`/_devora/m/app/%252e%252e/%252e%252e/outside/secret.txt`, "own"], [`/_devora/m/app/..%5c..%5coutside%5csecret.txt`, "own"], [`/_devora/m/app/components/Widget.tsx%00.png`, "own"], [`/_devora/m/packages/../../outside/secret.txt`, "own"],
    [`/_devora/m/${OUT}`, "own"], [`/_devora/deps/../../outside/secret.txt`, "own"], [`/_devora/deps/%2e%2e%2f%2e%2e%2foutside%2fsecret.txt`, "own"], [`/_devora/m/app/link-out.module.css`, "own"], [`/_devora/m/app/link-out.module.css?import`, "own"], [`/_devora/m/app/.git/config`, "own"], [`/_devora/m/app/package.json`, "own"], [`/_devora/m/app/node_modules/react/package.json`, "own"],
    [`/.env`, "both"], [`/hello.txt/../.env`, "both"], [`/link-dir/secret.txt`, "both"], [`/link-dir/secret.ts`, "both"], [`/../../../../etc/passwd`, "both"], [`/%2e%2e/%2e%2e/%2e%2e/etc/passwd`, "both"], [`/..%2f..%2f..%2fetc/passwd`, "both"], [`//etc/passwd`, "both"],
    [`/api/..%2f..%2f..%2fetc/passwd`, "both"], [`/\\..\\..\\etc\\passwd`, "both"], [`/%00/etc/passwd`, "both"], [`/hello.txt%00.png`, "both"], [`/hello.txt?/../.env`, "both"], [`/apps/web/.env`, "both"], [`/apps/web/link-out.ts`, "both"], [`/apps/web/routes/index.tsx`, "both"], [`/vite.config.ts`, "both"], [`/devora.config.ts`, "both"], [`/@fs/`, "both"], [`/.git/config`, "both"],
  ];
  for (const [p, kind] of reads) {
    if (!(kind === "both" || (kind === "own") === experimental)) { add("File reads outside the root", p, null, "form of the other server", false); continue; }
    const r = await request(p);
    const leaked = r.ok && MARK.test(r.body);
    add("File reads outside the root", p, r.ok && !leaked, r.ok ? `status ${r.status}${leaked ? " LEAKED" : ""}` : failedNote(r));
  }
  for (const target of ["/../../../../etc/passwd", "/..;/..;/etc/passwd", "/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd", "/_devora/m/app/../../../../../../etc/passwd", "/assets/..%2f..%2f..%2fetc/passwd"]) {
    const r = await raw(`GET ${target} HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`);
    add("File reads outside the root", `raw request line ${target}`, !r.timedOut && !MARK.test(r.text) && (r.status > 0 || r.closed), r.timedOut ? "REQUEST FAILED: timeout" : `status ${r.status}${MARK.test(r.text) ? " LEAKED" : ""}`);
  }

  // ---- information disclosure
  const mod = await request(experimental ? "/_devora/m/app/components/Widget.tsx" : "/components/Widget.tsx");
  const realRoot = fs.realpathSync(fixture.root);
  const named = [home.body, mod.body].filter((b) => b.includes("/Users/") || b.includes(fixture.root) || b.includes(realRoot)).length;
  add("Information disclosure", "no absolute path of the developer's machine in the page or an island module (incl. source maps)", home.ok && mod.ok && named === 0, !mod.ok ? failedNote(mod) : `${named} of 2 responses name a local path`);
  const dot = await request("/.env");
  add("Information disclosure", "dotfile in the public folder not served", dot.ok && !MARK.test(dot.body), failedNote(dot));

  // ---- editor endpoint
  for (const p of ["/__open-in-editor?file=/etc/hostname", `/__open-in-editor?file=${encodeURIComponent(OUT)}`]) {
    for (const [label, h] of [["cross-site", { "Sec-Fetch-Site": "cross-site" }], ["same-site", { "Sec-Fetch-Site": "same-site" }], ["foreign Origin", { Origin: "http://evil.example" }], ["Origin: null", { Origin: "null" }]]) {
      const r = await request(p, h);
      add("Editor endpoint", `${p.slice(0, 32)}… (${label}) is not served`, r.ok && (r.status === 403 || r.status === 404), failedNote(r));
    }
  }
  const noHeaders = await request("/__open-in-editor");
  add("Editor endpoint", "no editor endpoint exists at all for a request with no browser headers (curl, a local tool)", noHeaders.ok && noHeaders.status === 404, failedNote(noHeaders));

  // ---- request limits
  const h20 = await raw(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\nX-Pad: ${"a".repeat(20 * 1024)}\r\nConnection: close\r\n\r\n`);
  add("Request limits", "20 KB of request headers refused (431 or 400)", h20.status === 431 || h20.status === 400, h20.timedOut ? "REQUEST FAILED: timeout" : `status ${h20.status}`);
  const h70 = await raw(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\nX-Pad: ${"a".repeat(70 * 1024)}\r\nConnection: close\r\n\r\n`);
  add("Request limits", "70 KB of request headers refused (431 or 400, or the server closes the connection)", h70.status === 431 || h70.status === 400 || (h70.status === 0 && h70.closed && !h70.timedOut), h70.timedOut ? "REQUEST FAILED: timeout" : `status ${h70.status}${h70.status === 0 ? " (closed)" : ""}`);
  const body = "x".repeat(11 * 1024 * 1024);
  const post = await request("/api/hello", { "Content-Type": "application/json", "Content-Length": String(body.length) }, { method: "POST", body, timeout: 30000 });
  add("Request limits", "11 MB JSON body to an API route refused (413; default limit 10 MB)", post.ok && post.status === 413, failedNote(post));
  const slowStart = Date.now();
  const slow = await new Promise((resolve) => {
    const socket = net.connect(PORT, HOST, () => {
      socket.write(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\n`);
      const iv = setInterval(() => socket.write("X-Slow: a\r\n"), 1000);
      socket.on("close", () => { clearInterval(iv); resolve(Date.now() - slowStart); });
      setTimeout(() => { clearInterval(iv); socket.destroy(); resolve(-1); }, 22000);
    });
    socket.on("error", () => resolve(Date.now() - slowStart));
  });
  add("Request limits", "headers sent one line per second: connection closed within 20 s (slow-headers attack)", slow > 0 && slow <= 20000, slow < 0 ? "still open after 22 s" : `closed after ${(slow / 1000).toFixed(1)} s`);
  const many = await raw(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\n${Array.from({ length: 3000 }, (_, i) => `X-${i}: 1`).join("\r\n")}\r\nConnection: close\r\n\r\n`);
  add("Request limits", "3000 header lines refused (431 or 400, or the server closes the connection)", many.status === 431 || many.status === 400 || (many.status === 0 && many.closed && !many.timedOut), many.timedOut ? "REQUEST FAILED: timeout" : `status ${many.status}${many.status === 0 ? " (closed)" : ""}`);

  // ---- parsing
  const te = await raw(`POST / HTTP/1.1\r\nHost: localhost:${PORT}\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n0\r\n\r\n`);
  add("Parsing", "Content-Length together with Transfer-Encoding refused (400, or the server closes the connection)", te.status === 400 || (te.status === 0 && te.closed && !te.timedOut), te.timedOut ? "REQUEST FAILED: timeout" : `status ${te.status}`);
  const crlf = await raw(`GET /%0d%0aX-Injected:1 HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`);
  add("Parsing", "encoded CRLF in the path does not split the response (answered, no injected header)", crlf.status > 0 && !/X-Injected/i.test(crlf.text.split("\r\n\r\n")[0] ?? ""), crlf.timedOut ? "REQUEST FAILED: timeout" : `status ${crlf.status}`);

  for (const target of ["//", "/\\", "///x", "//etc/passwd"]) {
    const odd = await raw(`GET ${target} HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`);
    add("Parsing", `request target ${JSON.stringify(target)} is answered (a protocol-relative target must not end the server)`, odd.status > 0 && !odd.timedOut && !MARK.test(odd.text), odd.timedOut ? "REQUEST FAILED: timeout" : `status ${odd.status}`);
  }

  // ---- token on scripts
  if (experimental) {
    const noToken = await request("/_devora/preamble.js");
    add("Token", "the preamble script (carries the HMR token) is not served without the token", noToken.ok && noToken.status === 403, failedNote(noToken));
  } else add("Token", "the preamble script is not served without the token", null, "not applicable", false);

  // the server must still be alive after all of it
  const alive = await request("/");
  add("sanity", "the server still answers after every attack above", alive.ok && alive.status === 200, failedNote(alive));
  return R;
}

const harnessErrors = [];
const results = {};
const fixture = makeFixture();
try {
  for (const experimental of [false, true]) {
    const name = experimental ? "own" : "vite";
    HOST = experimental ? "127.0.0.1" : "::1";
    let server;
    try {
      server = await startServer({ root: fixture.root, experimental, port: PORT });
      results[name] = await runChecks(experimental, fixture);
    } catch (error) {
      harnessErrors.push(`${name}: ${error.message}`);
    } finally {
      try { await server?.stop(); } catch (error) { harnessErrors.push(`${name}: ${error.message}`); }
    }
  }
  // NODE_ENV=production and --host with the experimental server
  const run = (args, env) =>
    new Promise((resolve) => {
      const child = spawn(path.join(REPO, "node_modules/.bin/tsx"), [path.join(REPO, "packages/cli/src/index.ts"), "dev", ...args], { cwd: fixture.root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (c) => (out += c));
      child.stderr.on("data", (c) => (out += c));
      const timer = setTimeout(() => { child.kill("SIGTERM"); }, 20000);
      child.once("exit", (code) => { clearTimeout(timer); resolve({ out, code }); });
    });
  const prodOwn = await run(["--experimental-dev-server"], { NODE_ENV: "production" });
  const prodVite = await run([], { NODE_ENV: "production" }).then((r) => r, () => null);
  const hostOwn = await run(["--host", "--experimental-dev-server"], { NODE_ENV: "development" });
  results.extra = [
    { category: "Refusals", name: "NODE_ENV=production: the experimental server refuses to start", pass: /refuses to run with NODE_ENV=production/.test(prodOwn.out) && prodOwn.code !== 0, observed: `exit ${prodOwn.code}` },
    { category: "Refusals", name: "--host: the experimental server refuses (loopback only)", pass: /--host is not available/.test(hostOwn.out) && hostOwn.code !== 0, observed: `exit ${hostOwn.code}` },
    { category: "Refusals", name: "NODE_ENV=production: Vite's dev server refuses to start (baseline)", pass: prodVite !== null && prodVite.code !== null && !prodVite.out.includes("Local:"), observed: prodVite ? `exit ${prodVite.code}, ${prodVite.out.includes("Local:") ? "it started" : "it did not start"}` : "no result" },
  ];
} finally {
  fixture.cleanup();
}

const tally = (rows) => ({ pass: rows.filter((r) => r.pass === true).length, fail: rows.filter((r) => r.pass === false).length, na: rows.filter((r) => r.pass === null).length, total: rows.length });
console.log("\nChecks per category (pass / fail / n.a. for that server):");
const cats = [...new Set([...(results.vite ?? []), ...(results.own ?? [])].map((r) => r.category))];
for (const c of cats) {
  const a = tally((results.vite ?? []).filter((r) => r.category === c));
  const b = tally((results.own ?? []).filter((r) => r.category === c));
  console.log(`  ${c.padEnd(34)} vite ${a.pass}/${a.fail}/${a.na}   own ${b.pass}/${b.fail}/${b.na}`);
}
for (const name of ["vite", "own"]) {
  if (!results[name]) continue;
  const t = tally(results[name]);
  console.log(`\n${name}: ${t.total} checks = ${t.pass} pass + ${t.fail} fail + ${t.na} n.a.`);
  for (const r of results[name].filter((x) => x.pass === false)) console.log(`   ${name === "own" ? "FAIL" : "finding"}: [${r.category}] ${r.name} - ${r.observed}`);
}
for (const r of results.extra ?? []) console.log(`\n${r.pass ? "PASS" : /Vite/.test(r.name) ? "finding" : "FAIL"}: [${r.category}] ${r.name} - ${r.observed}`);
if (results.vite && results.own && results.vite.length !== results.own.length) harnessErrors.push(`the two servers ran different numbers of checks (${results.vite.length} and ${results.own.length})`);
for (const e of harnessErrors) console.log(`\nHARNESS ERROR: ${e}`);
const ownFailed = (results.own ?? []).filter((r) => r.pass === false).length + (results.extra ?? []).filter((r) => r.category === "Refusals" && r.pass === false && !/Vite/.test(r.name)).length;
if (!results.own || !results.vite || harnessErrors.length > 0 || ownFailed > 0) {
  console.log(`\nFAILED: ${ownFailed} failing check(s) for the experimental server, ${harnessErrors.length} harness error(s)`);
  process.exit(1);
}
console.log("\nPASS: every check of the experimental server passed (Vite's findings above are the baseline, not failures of this script)");
