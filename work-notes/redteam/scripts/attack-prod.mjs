#!/usr/bin/env node
/**
 * Red-team checks against `devora start` serving this repo's own apps on localhost.
 *
 *   pnpm build
 *   DEVORA_SESSION_SECRET=<32+ chars> PORT=11010 HOST=127.0.0.1 npx tsx packages/cli/src/index.ts start
 *   node work-notes/redteam/scripts/attack-prod.mjs [basePort=11010]
 *
 * marketing = base (auth "none", ssg), dashboard = base+1 (sessions, CSRF, API routes, streaming),
 * admin = base+2 (isolated auth), api-only = base+3 (backend only).
 * Every request is written to a raw socket, so it goes out exactly as written. Prints one line per check:
 * PASS/FAIL, the name, what was observed. Exit 1 if any check failed. Only ever talks to 127.0.0.1.
 */
import net from "node:net";

const BASE = Number(process.argv[2] ?? 11010);
const MARKETING = BASE;
const DASHBOARD = BASE + 1;
const ADMIN = BASE + 2;
const API_ONLY = BASE + 3;
const results = [];

/** Sends `raw` and resolves with everything the server wrote before closing (or `idleMs` of silence). */
function raw(port, request, { idleMs = 1500, totalMs = 30000, writeSlowly } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = Buffer.alloc(0);
    let idle;
    const socket = net.connect(port, "127.0.0.1");
    const finish = () => {
      clearTimeout(idle);
      clearTimeout(total);
      socket.destroy();
      resolve({ text: out.toString("latin1"), ms: Date.now() - started });
    };
    const arm = () => {
      clearTimeout(idle);
      idle = setTimeout(finish, idleMs);
    };
    const total = setTimeout(finish, totalMs);
    socket.on("connect", async () => {
      if (writeSlowly) await writeSlowly(socket);
      else socket.write(request);
      arm();
    });
    socket.on("data", (c) => {
      out = Buffer.concat([out, c]);
      arm();
    });
    socket.on("error", () => {});
    socket.on("close", finish);
  });
}

const statusOf = (text) => Number(/^HTTP\/1\.[01] (\d{3})/.exec(text)?.[1] ?? 0);
const allStatuses = (text) => [...text.matchAll(/HTTP\/1\.[01] (\d{3})/g)].map((m) => Number(m[1]));
const header = (text, name) => new RegExp(`^${name}: ?([^\\r\\n]*)`, "im").exec(text)?.[1];
const headers = (text, name) => [...text.matchAll(new RegExp(`^${name}: ?([^\\r\\n]*)`, "gim"))].map((m) => m[1]);
const get = (port, path, extra = "") => raw(port, `GET ${path} HTTP/1.1\r\nHost: localhost\r\n${extra}Connection: close\r\n\r\n`);

function check(name, ok, observed) {
  results.push({ name, ok, observed });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  — ${observed}`);
}

// Things that must never appear in a response body.
const LEAKS = [/root:x?:0:0/, /DEVORA_SESSION_SECRET/, /"name":\s*"devora-monorepo"/, /createRenderRoute/, /import \{/];
const leaks = (text) => LEAKS.some((re) => re.test(text.slice(text.indexOf("\r\n\r\n"))));

async function pathTraversal() {
  const targets = [
    "/../../../../etc/passwd",
    "/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd",
    "/%2E%2E%2F%2E%2E%2F%2E%2E%2Fetc%2Fpasswd",
    "/..%2f..%2f..%2f..%2fetc%2fpasswd",
    "/%252e%252e/%252e%252e/etc/passwd",
    "/..%5c..%5c..%5cetc%5cpasswd",
    "/..\\..\\..\\etc\\passwd",
    "//etc/passwd",
    "///etc//passwd",
    "/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd",
    "/assets/..%2f..%2fserver%2fentry-server.js",
    "/..%2fserver%2fentry-server.js",
    "/../server/entry-server.js",
    "/%2e%2e/server/entry-server.js",
    "/../../../package.json",
    "/%2e%2e%2f%2e%2e%2f%2e%2e%2fpackage.json",
    "/icons/%00../../server/entry-server.js",
    "/icons%00.png",
    "/.env",
    "/%2eenv",
    "/../.env",
    "/../../.env",
  ];
  for (const port of [MARKETING, DASHBOARD]) {
    for (const target of targets) {
      const r = await get(port, target);
      check(`traversal :${port} ${target}`, !leaks(r.text) && statusOf(r.text) !== 0, `status ${statusOf(r.text)}`);
    }
    // Absolute-form request target pointing outside.
    const r = await raw(port, `GET http://localhost/../../etc/passwd HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    check(`traversal :${port} absolute-form`, !leaks(r.text), `status ${statusOf(r.text)}`);
  }
}

async function headerInjection() {
  // CR/LF in the target or a header value: Node's parser must refuse (400) or treat it as data, never split.
  const cases = [
    ["CRLF in target", `GET /%0d%0aSet-Cookie:%20x=1 HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`],
    ["bare LF header", `GET / HTTP/1.1\r\nHost: localhost\nX-A: b\r\nConnection: close\r\n\r\n`],
    ["NUL in header", `GET / HTTP/1.1\r\nHost: localhost\r\nX-A: a\0b\r\nConnection: close\r\n\r\n`],
    ["space before colon", `GET / HTTP/1.1\r\nHost : evil.com\r\nConnection: close\r\n\r\n`],
    ["obs-fold", `GET / HTTP/1.1\r\nHost: localhost\r\nX-A: a\r\n b\r\nConnection: close\r\n\r\n`],
  ];
  for (const [name, request] of cases) {
    const r = await raw(DASHBOARD, request);
    const injected = /^Set-Cookie: x=1/im.test(r.text);
    check(`header injection: ${name}`, !injected && !leaks(r.text), `status ${statusOf(r.text)}`);
  }
}

async function smuggling() {
  // Each must either be refused (400) or produce exactly one response for one request.
  const cases = [
    ["CL + TE", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /admin HTTP/1.1\r\nHost: localhost\r\n\r\n`],
    ["two CL", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nContent-Length: 0\r\nContent-Length: 44\r\n\r\nGET /secret HTTP/1.1\r\nHost: localhost\r\n\r\n`],
    ["TE chunked, identity", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: chunked, identity\r\n\r\n0\r\n\r\n`],
    ["TE with space", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding : chunked\r\n\r\n0\r\n\r\n`],
    ["TE xchunked", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: xchunked\r\n\r\n0\r\n\r\n`],
    ["chunk size overflow", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: chunked\r\n\r\nFFFFFFFFFFFFFFFFF\r\n\r\n`],
    ["negative CL", `POST /api/hello HTTP/1.1\r\nHost: localhost\r\nContent-Length: -1\r\n\r\n`],
  ];
  for (const [name, request] of cases) {
    const r = await raw(DASHBOARD, request, { idleMs: 1000 });
    const statuses = allStatuses(r.text);
    // A smuggled second request would show as a second response (e.g. a 404 for /secret or /admin after a 4xx).
    check(`smuggling: ${name}`, statuses.length <= 1 || statuses.every((s) => s === 400), `statuses ${statuses.join(",") || "none (closed)"}`);
  }
}

async function hostAndOrigin() {
  // The repo apps set no allowedHosts, so any Host is served (documented default). What matters: nothing
  // built from Host is reflected in a way an attacker controls. Check that a forged Host does not appear in
  // Location headers or in absolute links of the page.
  const r = await raw(MARKETING, `GET / HTTP/1.1\r\nHost: evil.example\r\nConnection: close\r\n\r\n`);
  check("forged Host not reflected into page links (marketing /)", !/evil\.example/.test(r.text), `status ${statusOf(r.text)}`);
  const r2 = await raw(MARKETING, `GET / HTTP/1.1\r\nHost: localhost\r\nX-Forwarded-Host: evil.example\r\nConnection: close\r\n\r\n`);
  check("X-Forwarded-Host ignored without trustProxy", !/evil\.example/.test(r2.text), `status ${statusOf(r2.text)}`);
  const r3 = await raw(DASHBOARD, `GET http://evil.example/login HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  check("absolute-form target host not reflected (dashboard /login)", !/evil\.example/.test(r3.text), `status ${statusOf(r3.text)}`);
}

/** Logs into the dashboard with the real form: GET /login for the CSRF cookie + token, POST it. */
async function login(port = DASHBOARD, user = "mallory") {
  const page = await get(port, "/login");
  const csrfCookie = headers(page.text, "Set-Cookie").find((c) => c.startsWith("devora_csrf="))?.split(";")[0];
  const token = /name="_csrf" value="([^"]+)"/.exec(page.text)?.[1];
  const body = `_csrf=${encodeURIComponent(token)}&username=${user}`;
  const r = await raw(port, `POST /login HTTP/1.1\r\nHost: localhost\r\nCookie: ${csrfCookie}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`);
  const setCookies = headers(r.text, "Set-Cookie");
  const session = setCookies.find((c) => /^devora_session[^=]*=/.test(c));
  return { csrfCookie, token, session, sessionPair: session?.split(";")[0], status: statusOf(r.text), setCookies };
}

async function csrfAndSession() {
  const s = await login();
  check("login works with the form token", s.status === 303 && !!s.session, `status ${s.status}`);
  if (!s.session) return;
  check("session cookie HttpOnly", /;\s*HttpOnly/i.test(s.session), s.session.replace(/=[^;]+/, "=…"));
  check("session cookie SameSite=Lax or Strict", /;\s*SameSite=(Lax|Strict)/i.test(s.session), "");
  check("session cookie Path=/", /;\s*Path=\//i.test(s.session), "");
  const csrfSet = s.setCookies.find((c) => c.startsWith("devora_csrf="));
  check("CSRF cookie HttpOnly (or not re-issued)", !csrfSet || /HttpOnly/i.test(csrfSet), csrfSet ? csrfSet.replace(/=[^;]+/, "=…") : "not re-issued");

  const cookie = `${s.sessionPair}; ${s.csrfCookie}`;
  const form = (b, ct = "application/x-www-form-urlencoded", method = "POST", path = "/settings", extra = "") =>
    raw(DASHBOARD, `${method} ${path} HTTP/1.1\r\nHost: localhost\r\nCookie: ${cookie}\r\nContent-Type: ${ct}\r\nContent-Length: ${Buffer.byteLength(b)}\r\n${extra}Connection: close\r\n\r\n${b}`);

  let r = await form("key=a&value=b");
  check("CSRF: cookie POST without token → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form(`key=a&value=b&_csrf=${encodeURIComponent(s.token)}`);
  check("CSRF: cookie POST with token → not 403 (the demo action itself then fails on the stub DB: 500)", statusOf(r.text) !== 403, `status ${statusOf(r.text)}`);
  r = await form("key=a&value=b&_csrf=");
  check("CSRF: empty token → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form("key=a&value=b", "text/plain");
  check("CSRF: text/plain body → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form(`--x\r\nContent-Disposition: form-data; name="key"\r\n\r\na\r\n--x--\r\n`, "multipart/form-data; boundary=x");
  check("CSRF: multipart without token → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form(`key=a&_csrf=${"A".repeat(43)}`);
  check("CSRF: wrong token of the right length → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form(`key=a&_csrf=${encodeURIComponent(s.token)}&_csrf=x`);
  check("CSRF: duplicated field, first right → accepted like a single field (the demo action then hits the stub DB)", statusOf(r.text) !== 403, `status ${statusOf(r.text)}`);
  r = await form(`key=a&_csrf=x&_csrf=${encodeURIComponent(s.token)}`);
  check("CSRF: duplicated field, first wrong → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  for (const method of ["PUT", "PATCH", "DELETE"]) {
    r = await form("{}", "application/json", method, "/api/hello");
    check(`CSRF: API ${method} with cookie, no header → 403 or 405`, [403, 405].includes(statusOf(r.text)), `status ${statusOf(r.text)}`);
  }
  r = await form("{}", "application/json", "POST", "/api/hello");
  check("CSRF: API POST with cookie, no header → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  r = await form("{}", "application/json", "POST", "/api/hello", `x-devora-csrf: ${s.token}\r\n`);
  check("CSRF: API POST with header token → not 403", statusOf(r.text) !== 403, `status ${statusOf(r.text)}`);
  for (const method of ["PROPPATCH", "MKCOL", "PURGE", "SEARCH", "LINK"]) {
    r = await form("{}", "application/json", method, "/api/users/1");
    check(`CSRF: API ${method} (unusual method) with cookie, no token → 403 before the handler`, statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  }
  r = await raw(DASHBOARD, `POST /settings HTTP/1.1\r\nHost: localhost\r\nCookie: ${s.sessionPair}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 13\r\nConnection: close\r\n\r\nkey=a&value=b`);
  check("CSRF: session cookie but no CSRF cookie → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  // Cookie tossing: a sibling subdomain adds its own devora_csrf after the app's. The app's cookie comes first in
  // the header (older), so the first value must win and the attacker's matching field must be refused.
  const tossed = `key=a&value=b&_csrf=${"B".repeat(43)}`;
  r = await raw(DASHBOARD, `POST /settings HTTP/1.1\r\nHost: localhost\r\nCookie: ${s.sessionPair}; ${s.csrfCookie}; devora_csrf=${"B".repeat(43)}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${tossed.length}\r\nConnection: close\r\n\r\n${tossed}`);
  check("CSRF: tossed second CSRF cookie + matching field → 403", statusOf(r.text) === 403, `status ${statusOf(r.text)}`);
  // Without the app's own CSRF cookie the double-submit pattern accepts any matching pair; noted in REDTEAM.md.
  r = await raw(DASHBOARD, `POST /settings HTTP/1.1\r\nHost: localhost\r\nCookie: ${s.sessionPair}; devora_csrf=${"B".repeat(43)}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${tossed.length}\r\nConnection: close\r\n\r\n${tossed}`);
  check("CSRF: only an attacker-set CSRF cookie + matching field (known limit of double-submit, reported, not asserted)", true, `status ${statusOf(r.text)}`);

  // Session fixation: a cookie the attacker chose before login must not become the session.
  const fixed = "devora_session=attacker-chosen-session-id-0000000000";
  const page = await get(DASHBOARD, "/login", `Cookie: ${fixed}\r\n`);
  const csrfCookie = headers(page.text, "Set-Cookie").find((c) => c.startsWith("devora_csrf="))?.split(";")[0];
  const token = /name="_csrf" value="([^"]+)"/.exec(page.text)?.[1];
  const body = `_csrf=${encodeURIComponent(token)}&username=victim`;
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nCookie: ${fixed}; ${csrfCookie}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`);
  const newSession = headers(r.text, "Set-Cookie").find((c) => c.startsWith("devora_session"));
  check("session fixation: login issues a new ID", !!newSession && !newSession.includes("attacker-chosen"), newSession ? "new id" : `no cookie, status ${statusOf(r.text)}`);

  // Cross-app: the dashboard session must not authenticate on admin (isolated auth).
  r = await get(ADMIN, "/", `Cookie: ${s.sessionPair}\r\n`);
  check("isolated auth: dashboard session cookie not accepted by admin", !/mallory/.test(r.text), `status ${statusOf(r.text)}`);

  // Cache-Control on session responses.
  r = await get(DASHBOARD, "/", `Cookie: ${s.sessionPair}\r\n`);
  check("session response Cache-Control private, no-store", /private, no-store/.test(header(r.text, "Cache-Control") ?? ""), header(r.text, "Cache-Control") ?? "none");
}

async function bodies() {
  let r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 999999999\r\nConnection: close\r\n\r\nx=1`);
  check("body: huge Content-Length → 413 before reading", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  r = await raw(DASHBOARD, "", {
    totalMs: 30000,
    writeSlowly: async (socket) => {
      socket.write(`POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/x-www-form-urlencoded\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n`);
      const chunk = Buffer.alloc(1024 * 1024, 0x61);
      for (let i = 0; i < 25 && !socket.destroyed; i++) {
        socket.write(`${chunk.length.toString(16)}\r\n`);
        socket.write(chunk);
        socket.write("\r\n");
        await new Promise((res) => setImmediate(res));
      }
      if (!socket.destroyed) socket.write("0\r\n\r\n");
    },
  });
  check("body: 25 MB chunked → 413 or closed", statusOf(r.text) === 413 || statusOf(r.text) === 0, `status ${statusOf(r.text) || "closed"}`);
  const many = Array.from({ length: 1500 }, (_, i) => `f${i}=1`).join("&");
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${many.length}\r\nConnection: close\r\n\r\n${many}`);
  check("form: 1500 URL-encoded fields → 413", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  const parts = Array.from({ length: 30 }, (_, i) => `--b\r\nContent-Disposition: form-data; name="f${i}"; filename="a${i}.txt"\r\nContent-Type: text/plain\r\n\r\nx\r\n`).join("") + "--b--\r\n";
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: multipart/form-data; boundary=b\r\nContent-Length: ${parts.length}\r\nConnection: close\r\n\r\n${parts}`);
  check("form: 30 file parts → 413", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  // Hide files from the part counter: filename with different spacing/case, header folding, filename*.
  const sneaky = Array.from({ length: 30 }, (_, i) => `--b\r\ncOnTeNt-DiSpOsItIoN:form-data;name="f${i}";filename="a${i}.txt"\r\n\r\nx\r\n`).join("") + "--b--\r\n";
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: multipart/form-data; boundary=b\r\nContent-Length: ${sneaky.length}\r\nConnection: close\r\n\r\n${sneaky}`);
  check("form: 30 file parts, odd case and no spaces → 413", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  const quoted = Array.from({ length: 30 }, (_, i) => `--b c\r\nContent-Disposition: form-data; name="f${i}"; filename="a${i}.txt"\r\n\r\nx\r\n`).join("") + "--b c--\r\n";
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: multipart/form-data; boundary="b c"\r\nContent-Length: ${quoted.length}\r\nConnection: close\r\n\r\n${quoted}`);
  check("form: 30 file parts, quoted boundary with a space → 413", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  const unquotedParam = Array.from({ length: 30 }, (_, i) => `--b\r\nContent-Disposition: form-data; name="f${i}"; filename="a${i}.txt"\r\n\r\nx\r\n`).join("") + "--b--\r\n";
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: multipart/form-data; charset=utf-8; boundary=b; x=y\r\nContent-Length: ${unquotedParam.length}\r\nConnection: close\r\n\r\n${unquotedParam}`);
  check("form: 30 file parts, boundary between other params → 413", statusOf(r.text) === 413, `status ${statusOf(r.text)}`);
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: multipart/form-data; boundary=b\r\nContent-Length: 19\r\nConnection: close\r\n\r\n--b\r\ngarbage-no-end`);
  check("form: malformed multipart → 4xx, not 500", statusOf(r.text) >= 400 && statusOf(r.text) < 500, `status ${statusOf(r.text)}`);
  // Prototype pollution through form field names and JSON.
  const pp = "__proto__[polluted]=1&constructor[prototype][polluted]=1&__proto__=x";
  r = await raw(DASHBOARD, `POST /login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${pp.length}\r\nConnection: close\r\n\r\n${pp}`);
  const after = await get(DASHBOARD, "/");
  check("prototype pollution via form names: server still answers normally", statusOf(after.text) === 200, `post ${statusOf(r.text)}, then GET / ${statusOf(after.text)}`);
  const json = `{"__proto__":{"polluted":1},"username":"x"}`;
  r = await raw(DASHBOARD, `POST /api/session HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\nConnection: close\r\n\r\n${json}`);
  check("prototype pollution via JSON to an API route: not a 500", statusOf(r.text) !== 500, `status ${statusOf(r.text)}`);
  // Cookie header abuse.
  r = await get(DASHBOARD, "/", `Cookie: __proto__=x; constructor=y; devora_session=%E0%A4%A; ${";".repeat(4000)}\r\n`);
  check("cookie parser: hostile Cookie header → 200, not 500", statusOf(r.text) === 200, `status ${statusOf(r.text)}`);
}

async function slowAndLarge() {
  const big = "X-Big: " + "a".repeat(20 * 1024) + "\r\n";
  let r = await raw(DASHBOARD, `GET / HTTP/1.1\r\nHost: localhost\r\n${big}Connection: close\r\n\r\n`);
  check("headers over 16 KB → 431", statusOf(r.text) === 431, `status ${statusOf(r.text)}`);
  const manyHeaders = Array.from({ length: 3000 }, (_, i) => `X-H${i}: 1\r\n`).join("");
  r = await raw(DASHBOARD, `GET / HTTP/1.1\r\nHost: localhost\r\n${manyHeaders}Connection: close\r\n\r\n`);
  check("3000 small headers → 431 or 400", [431, 400].includes(statusOf(r.text)), `status ${statusOf(r.text)}`);
  r = await raw(DASHBOARD, "", {
    idleMs: 25000,
    totalMs: 30000,
    writeSlowly: async (socket) => {
      socket.write("GET / HTTP/1.1\r\nHost: localhost\r\n");
      for (let i = 0; i < 25 && !socket.destroyed; i++) {
        await new Promise((res) => setTimeout(res, 1000));
        if (!socket.destroyed) socket.write(`X-Slow-${i}: 1\r\n`);
      }
    },
  });
  check("slowloris headers: answered 408 and closed by ~15 s", statusOf(r.text) === 408 && r.ms < 20000, `status ${statusOf(r.text)} after ${r.ms} ms`);
}

async function xss() {
  const payload = `"><script>alert(1)</script><img src=x onerror=alert(1)>`;
  let r = await get(DASHBOARD, `/users/${encodeURIComponent(payload)}`);
  check("SSR: route param with HTML is escaped", !r.text.includes("<script>alert(1)</script>") && !r.text.includes("<img src=x onerror"), `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, `/?q=${encodeURIComponent(payload)}`);
  check("SSR: query string not reflected raw", !r.text.includes("<script>alert(1)</script>"), `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, `/users/${encodeURIComponent("</script><script>alert(1)</script>")}`);
  check("SSR: </script> in a param does not close an inline script", !r.text.includes("</script><script>alert(1)"), `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, "/");
  const csp = header(r.text, "Content-Security-Policy") ?? "";
  const scriptPolicy = /script-src[^;]*/.exec(csp)?.[0] ?? /default-src[^;]*/.exec(csp)?.[0] ?? "";
  check("CSP on pages: scripts limited (script-src or default-src) without unsafe-inline/unsafe-eval", !!scriptPolicy && !/'unsafe-(inline|eval)'/.test(scriptPolicy), csp.slice(0, 120));
  check("nosniff on pages", /nosniff/i.test(header(r.text, "X-Content-Type-Options") ?? ""), "");
  check("frame protection on pages", /frame-ancestors|DENY|SAMEORIGIN/i.test(csp + (header(r.text, "X-Frame-Options") ?? "")), header(r.text, "X-Frame-Options") ?? "csp");
  r = await get(DASHBOARD, "/streaming-demo");
  check("streaming page: security headers present", /nosniff/i.test(header(r.text, "X-Content-Type-Options") ?? "") && !!header(r.text, "Content-Security-Policy"), `status ${statusOf(r.text)}`);
}

async function methodsAndMisc() {
  let r = await raw(DASHBOARD, `TRACE / HTTP/1.1\r\nHost: localhost\r\nX-Secret: s3cr3t\r\nConnection: close\r\n\r\n`);
  check("TRACE does not echo the request", !/s3cr3t/.test(r.text), `status ${statusOf(r.text)}`);
  r = await raw(API_ONLY, `GET /api/ping HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  check("api-only: /api/ping answers", statusOf(r.text) === 200, `status ${statusOf(r.text)}`);
  r = await raw(API_ONLY, `GET /api/%2e%2e/%2e%2e/package.json HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  check("api-only: encoded traversal under /api", !leaks(r.text), `status ${statusOf(r.text)}`);
  r = await raw(DASHBOARD, `GET /api/../../../../etc/passwd HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  check("API path traversal", !leaks(r.text), `status ${statusOf(r.text)}`);
  r = await raw(DASHBOARD, `GET /api/users/..%2f..%2f..%2fpackage HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  check("API dynamic param with encoded slashes", !leaks(r.text) && statusOf(r.text) !== 500, `status ${statusOf(r.text)}`);
  r = await get(MARKETING, "/icons/" + "a".repeat(5000));
  check("long path → not a 500", statusOf(r.text) !== 500 && statusOf(r.text) !== 0, `status ${statusOf(r.text)}`);
  r = await get(MARKETING, "/%");
  check("lone % in path → 4xx, not 500", statusOf(r.text) >= 400 && statusOf(r.text) < 500, `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, "/%");
  check("lone % in path (dashboard) → 4xx, not 500", statusOf(r.text) >= 400 && statusOf(r.text) < 500, `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, "/users/%E0%A4%A");
  check("bad UTF-8 escape in param → 4xx, not 500", statusOf(r.text) >= 400 && statusOf(r.text) < 500, `status ${statusOf(r.text)}`);
  r = await get(DASHBOARD, "/", "Accept-Encoding: " + "gzip;q=0.5, ".repeat(1200) + "br\r\n");
  check("long Accept-Encoding parsed quickly", r.ms < 1500 && statusOf(r.text) === 200, `${r.ms} ms, status ${statusOf(r.text)}`);
  r = await get(MARKETING, "/icons/favicon.svg");
  if (statusOf(r.text) === 200) check("svg served with its sandbox CSP", /sandbox/.test(header(r.text, "Content-Security-Policy") ?? ""), header(r.text, "Content-Security-Policy") ?? "none");
}

const groups = { pathTraversal, headerInjection, smuggling, hostAndOrigin, csrfAndSession, bodies, slowAndLarge, xss, methodsAndMisc };
const only = process.argv[3];
for (const [name, fn] of Object.entries(groups)) {
  if (only && only !== name) continue;
  console.log(`\n## ${name}`);
  try {
    await fn();
  } catch (error) {
    check(`${name} crashed`, false, String(error));
  }
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
