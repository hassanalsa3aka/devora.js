#!/usr/bin/env node
/**
 * Red-team checks against `devora dev` (Vite 6.4.5) on localhost.
 *
 *   node packages/cli/dist/index.js dev --app dashboard
 *   node work-notes/redteam/scripts/attack-dev.mjs <port> <absolute path of a file outside the project>
 *
 * DNS rebinding (a foreign Host), file reads outside the project through Vite's URL forms, and the HMR WebSocket
 * with a foreign Origin and without Vite's token. Only talks to 127.0.0.1 / localhost.
 */
import net from "node:net";
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.argv[2]);
const OUTSIDE = process.argv[3];
const results = [];
const check = (name, ok, observed) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  — ${observed}`);
};

function request(path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port: PORT, path, headers: { Host: `localhost:${PORT}`, ...headers } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", (e) => resolve({ status: 0, body: String(e), headers: {} }));
    req.end();
  });
}

/** WebSocket upgrade by hand: resolves with the status line the server answered (101 = accepted). */
function upgrade(path, headers) {
  return new Promise((resolve) => {
    const socket = net.connect(PORT, "127.0.0.1", () => {
      const key = crypto.randomBytes(16).toString("base64");
      const lines = [`GET ${path} HTTP/1.1`, `Host: localhost:${PORT}`, "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Key: ${key}`, "Sec-WebSocket-Version: 13", ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)];
      socket.write(lines.join("\r\n") + "\r\n\r\n");
    });
    let out = "";
    const done = () => {
      socket.destroy();
      resolve(out.split("\r\n")[0] || "closed");
    };
    socket.on("data", (c) => {
      out += c;
      if (out.includes("\r\n\r\n")) done();
    });
    socket.on("close", done);
    socket.on("error", done);
    setTimeout(done, 3000);
  });
}

const page = await request("/");
check("dev server answers on localhost", page.status === 200, `status ${page.status}`);

for (const host of ["evil.example", "evil.example:80", `attacker.localhost.evil.example:${PORT}`, "127.0.0.1.nip.io"]) {
  const r = await request("/", { Host: host });
  check(`DNS rebinding: Host ${host} refused`, r.status === 403 || r.status === 400, `status ${r.status}`);
}

const reads = [
  `/@fs${OUTSIDE}`,
  `/@fs/etc/passwd`,
  `/@fs/proc/self/environ`,
  `/@fs${process.cwd()}/package.json`,
  `/@fs${process.cwd()}/.env`,
  `/../../../../etc/passwd`,
  `/%2e%2e/%2e%2e/%2e%2e/etc/passwd`,
  `/@id/${OUTSIDE}`,
  `/@id/__x00__${OUTSIDE}`,
  `${OUTSIDE}?raw`,
  `/@fs${OUTSIDE}?raw`,
  `/@fs${OUTSIDE}?import&raw`,
  `/@fs${OUTSIDE}?url`,
  `/@fs/etc/passwd?raw??`,
  `/@fs/etc/passwd?import&?raw`,
  `/node_modules/.vite/../../../../../etc/passwd`,
  `/__open-in-editor?file=${OUTSIDE}`,
];
for (const path of reads) {
  const r = await request(path);
  const leaked = /TEST_SECRET_SHOULD_NOT_LEAK|root:x?:0:0|DEVORA_SESSION_SECRET=/.test(r.body);
  check(`file read: ${path}`, !leaked, `status ${r.status}`);
}

// HMR WebSocket: Vite 6.0.9+ requires its per-start token, and checks Origin.
const hmr = await upgrade("/", { "Sec-WebSocket-Protocol": "vite-hmr", Origin: "http://evil.example" });
check("HMR WebSocket from a foreign Origin without the token refused", !hmr.includes("101"), hmr);
const hmr2 = await upgrade("/", { "Sec-WebSocket-Protocol": "vite-hmr" });
// Vite accepts a client that sends no Origin (non-browser tools); browsers always send one. Reported, not asserted.
check("HMR WebSocket with no Origin and no token (informational: only a local non-browser process can do this)", true, hmr2);
const hmr3 = await upgrade("/?token=guess", { "Sec-WebSocket-Protocol": "vite-hmr", Origin: `http://localhost:${PORT}` });
check("HMR WebSocket with a wrong token refused", !hmr3.includes("101"), hmr3);

// CORS: a foreign page must not be able to read dev responses.
const cors = await request("/@vite/client", { Origin: "http://evil.example" });
check("no Access-Control-Allow-Origin for a foreign Origin", !cors.headers["access-control-allow-origin"] || cors.headers["access-control-allow-origin"] !== "*", `ACAO ${cors.headers["access-control-allow-origin"] ?? "none"}`);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
