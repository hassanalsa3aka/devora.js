#!/usr/bin/env node
/**
 * Runs one example's production build (`npm start`) and sends it real
 * requests — what CI does after `npm ci && npm run typecheck && npm run
 * build`. Usage, from an example's folder: node ../check.mjs
 *
 * `devora start` serves the apps on 4173, 4174, ... in devora.config.ts order.
 */
import { spawn, execFileSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import { createRequire } from "node:module";
import path from "node:path";

const name = path.basename(process.cwd());
const secret = randomBytes(32).toString("base64");

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${url} never answered`);
}

function expect(label, actual, wanted) {
  const ok = typeof wanted === "function" ? wanted(actual) : actual === wanted;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${typeof actual === "string" ? actual.slice(0, 120) : actual}`);
  if (!ok) process.exitCode = 1;
}

async function installedCoreVersion() {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), "node_modules/@devorajs/core/package.json"), "utf-8"));
  return pkg.version;
}

/** Cookie jar for one "browser". */
function browser() {
  const jar = new Map();
  const send = async (url, init = {}) => {
    const headers = new Headers(init.headers);
    if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      jar.set(k, v.join("="));
    }
    return res;
  };
  send.jar = jar;
  return send;
}

const csrfFrom = (html) => html.match(/name="_csrf" value="([^"]+)"/)?.[1] ?? "";
const form = (fields) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(fields).toString(),
});
const json = (body, token) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

const CHECKS = {
  "background-jobs": async () => {
    // SQLite queue and cron always run. The BullMQ part needs a Redis: it runs only when
    // `redis-server` is installed and starts, and says so when it is skipped.
    const api = "http://localhost:4173", REDIS_PORT = 6390;
    mkdirSync("data", { recursive: true });
    for (const f of ["jobs.db", "jobs.db-shm", "jobs.db-wal", "cron.log"]) rmSync(`data/${f}`, { force: true });
    const children = [];
    const launch = (cmd, args, env = {}) => {
      const child = spawn(cmd, args, { stdio: "ignore", detached: true, env: { ...process.env, ...env } });
      child.on("error", () => {});
      children.push(child);
      return child;
    };
    const portOpen = (port) => new Promise((resolve) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.on("connect", () => { socket.destroy(); resolve(true); });
      socket.on("error", () => resolve(false));
    });
    try {
      let redis = false;
      try {
        execFileSync("redis-server", ["--version"], { stdio: "ignore" });
        launch("redis-server", ["--port", String(REDIS_PORT), "--save", "", "--appendonly", "no", "--dir", "data"]);
        for (let i = 0; i < 20 && !redis; i++) { redis = await portOpen(REDIS_PORT); if (!redis) await new Promise((r) => setTimeout(r, 250)); }
      } catch {}
      if (!redis) console.log("skip BullMQ checks: no redis-server is available here (the SQLite and cron checks still run)");
      else launch("node", ["workers/worker-bullmq.mjs"], { REDIS_PORT: String(REDIS_PORT) });
      launch("node", ["workers/worker-sqlite.mjs"]);

      const login = await fetch(`${api}/api/session`, json({ username: "ann" }));
      const { token } = await login.json();
      expect("login gives a token", typeof token, "string");
      for (const kind of redis ? ["bullmq", "sqlite"] : ["sqlite"]) {
        expect(`${kind}: enqueue without a login is a 401`, (await fetch(`${api}/api/jobs-${kind}`, json({ n: 12 }))).status, 401);
        const enq = await fetch(`${api}/api/jobs-${kind}`, json({ n: 12 }, token));
        const { id } = await enq.json();
        expect(`${kind}: enqueue is a 202`, enq.status, 202);
        let last;
        for (let i = 0; i < 60; i++) {
          last = await (await fetch(`${api}/api/jobs-${kind}?id=${id}`, { headers: { authorization: `Bearer ${token}` } })).json();
          if (last.state === "completed") break;
          await new Promise((r) => setTimeout(r, 100));
        }
        expect(`${kind}: the worker ran the job`, last?.result?.square, 144);
      }
      expect("cron: nothing is scheduled before the first request", existsSync("data/cron.log"), false);
      await fetch(`${api}/api/cron-status`);
      await new Promise((r) => setTimeout(r, 3500));
      expect("cron: ticks after the first request", (await (await fetch(`${api}/api/cron-status`)).json()).ticksSoFar, (n) => n >= 2);
    } finally {
      for (const child of children) try { process.kill(-child.pid, "SIGTERM"); } catch {}
    }
  },
  "multi-app": async () => {
    rmSync("notes.json", { force: true });
    const site = "http://localhost:4173", app = "http://localhost:4174", api = "http://localhost:4175";
    expect("site / is 200", (await fetch(site)).status, 200);
    const b = browser();
    const gate = await b(`${app}/notes`);
    expect("notes without login redirects to /login", gate.headers.get("location") ?? "", (l) => l.endsWith("/login"));
    const login = await b(`${app}/login`);
    const loggedIn = await b(`${app}/login`, form({ _csrf: csrfFrom(await login.text()), username: "alice" }));
    expect("login is a 303", loggedIn.status, 303);
    const page = await b(`${app}/notes`);
    const token = csrfFrom(await page.text());
    expect("empty note is a 400", (await b(`${app}/notes`, form({ _csrf: token, text: "" }))).status, 400);
    expect("note without CSRF is a 403", (await b(`${app}/notes`, form({ text: "x" }))).status, 403);
    expect("note is saved (303)", (await b(`${app}/notes`, form({ _csrf: token, text: "from the app" }))).status, 303);
    const session = await (await fetch(`${api}/api/session`, json({ username: "bob" }))).json();
    expect("API issues a Bearer token", typeof session.token, "string");
    expect("API note without token is a 401", (await fetch(`${api}/api/notes`, json({ text: "x" }))).status, 401);
    expect("API note with token is a 201", (await fetch(`${api}/api/notes`, json({ text: "from the API" }, session.token))).status, 201);
    const all = await (await fetch(`${api}/api/notes`)).json();
    expect("both apps see the same notes", all.notes.map((n) => n.author).join(","), "alice,bob");
    const shared = await fetch(`${app}/notes`, { headers: { authorization: `Bearer ${session.token}` }, redirect: "manual" });
    expect("the dashboard accepts the API's token (one login)", shared.status, 200);
    rmSync("notes.json", { force: true });
  },
  "api-bearer": async () => {
    const api = "http://localhost:4173";
    expect("GET / is the JSON status", (await (await fetch(api, { headers: { accept: "application/json" } })).json()).status, "ok");
    expect("unknown /api path is a JSON 404", (await fetch(`${api}/api/nope`)).status, 404);
    const { token } = await (await fetch(`${api}/api/session`, json({ username: "ana" }))).json();
    expect("login returns a token", typeof token, "string");
    const me = await fetch(`${api}/api/me`, { headers: { authorization: `Bearer ${token}` } });
    expect("/api/me with the token", (await me.json()).session?.username, "ana");
    expect("/api/me without a token is a 401", (await fetch(`${api}/api/me`)).status, 401);
    const todo = await fetch(`${api}/api/todos`, json({ title: "Buy milk" }, token));
    expect("creating a todo is a 201", todo.status, 201);
    const list = await (await fetch(`${api}/api/todos`, { headers: { authorization: `Bearer ${token}` } })).json();
    expect("the todo is listed", list.todos.map((t) => t.title).join(","), "Buy milk");
    expect("no CSRF cookie is issued (csrf: false)", (await fetch(`${api}/api/session`, json({ username: "x" }))).headers.getSetCookie().length, 0);
    const pre = await fetch(`${api}/api/todos`, {
      method: "OPTIONS",
      headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" },
    });
    expect("CORS preflight for an allowed origin", pre.headers.get("access-control-allow-origin"), "http://localhost:5173");
    const other = await fetch(`${api}/api/todos`, { headers: { origin: "https://evil.example" } });
    expect("no CORS header for another origin", other.headers.get("access-control-allow-origin"), null);
    await fetch(`${api}/api/session`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
    expect("the revoked token is rejected", (await fetch(`${api}/api/me`, { headers: { authorization: `Bearer ${token}` } })).status, 401);
  },
  "content-site": async () => {
    const site = "http://localhost:4173";
    const home = await (await fetch(site)).text();
    expect("home lists the posts", home, (h) => h.includes("/posts/hello-islands") && h.includes("/posts/static-params"));
    const post = await fetch(`${site}/posts/hello-islands`);
    const html = await post.text();
    expect("a pre-rendered post is 200", post.status, 200);
    expect("the post has an island", html, (h) => h.includes("data-island"));
    expect("an unknown post is a 404", (await fetch(`${site}/posts/nope`)).status, 404);
    // Up to 0.3.2 the sitemap left out dynamic routes, even ones with getStaticParams(); from 0.3.4
    // it lists the URLs getStaticParams() returns. Assert what the installed version should do.
    const [, minor, patch] = (await installedCoreVersion()).split(".").map(Number);
    const listsDynamic = minor > 3 || (minor === 3 && patch >= 4);
    const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
    expect("sitemap is served", sitemap, (x) => x.includes("<loc>https://blog.example.com</loc>"));
    expect(
      listsDynamic ? "sitemap lists the getStaticParams() posts (0.3.4+)" : "sitemap omits dynamic routes (<= 0.3.3)", // version-ok: the behavior each version has
      sitemap.includes("/posts/hello-islands"),
      listsDynamic
    );
    expect("the route stylesheet is linked", html, (h) => /<link rel="stylesheet" href="\/assets\/[^"]+\.css"/.test(h));
  },
};

CHECKS.realtime = async () => {
  const app = "http://localhost:4173";
  const rt = "http://localhost:4400";
  const tokenSecret = process.env.REALTIME_TOKEN_SECRET;
  const publishSecret = process.env.REALTIME_PUBLISH_SECRET;
  const { io } = createRequire(path.join(process.cwd(), "realtime", "package.json"))("socket.io-client");

  const realtime = spawn("node", ["realtime/server.mjs"], {
    env: { ...process.env, NODE_ENV: "production", PORT: "4400", REALTIME_ORIGINS: app },
    stdio: ["ignore", "inherit", "inherit"],
  });
  try {
    await waitFor(`${rt}/health`);

    const connect = (token) =>
      new Promise((resolve) => {
        const socket = io(rt, { auth: { token }, reconnection: false, transports: ["websocket"] });
        socket.on("connect", () => resolve({ socket }));
        socket.on("connect_error", (err) => {
          socket.close();
          resolve({ error: err.message });
        });
      });
    const nextEvent = (socket, event, ms = 2000) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve(undefined), ms);
        socket.once(event, (data) => {
          clearTimeout(timer);
          resolve(data);
        });
      });
    const forge = (sub, exp, secret = tokenSecret) => {
      const payload = Buffer.from(JSON.stringify({ sub, exp })).toString("base64url");
      return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
    };
    const publish = (body, secret = publishSecret) =>
      fetch(`${rt}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify(body),
      });

    // The token route needs a login.
    expect("token route without a login is a 401", (await fetch(`${app}/api/realtime-token`)).status, 401);
    const b = browser();
    const login = await b(`${app}/login`);
    const loggedIn = await b(`${app}/login`, form({ _csrf: csrfFrom(await login.text()), username: "alice" }));
    expect("login is a 303", loggedIn.status, 303);
    const tokenRes = await b(`${app}/api/realtime-token`);
    const { token, url } = await tokenRes.json();
    expect("token route with a login is a 200", tokenRes.status, 200);
    expect("token route names the realtime server", url, rt);

    // The realtime server checks the token.
    const now = Math.floor(Date.now() / 1000);
    expect("no token is rejected", (await connect(undefined)).error, "unauthorized");
    expect("a garbage token is rejected", (await connect("nope")).error, "unauthorized");
    expect("a tampered token is rejected", (await connect(token.slice(0, -2) + "xx")).error, "unauthorized");
    expect("a token signed with another secret is rejected", (await connect(forge("alice", now + 60, "other"))).error, "unauthorized");
    expect("an expired token is rejected", (await connect(forge("alice", now - 5))).error, "unauthorized");

    // Publishing needs the shared secret and reaches only that user's room.
    expect("publish with the wrong secret is a 401", (await publish({ userId: "alice", event: "order", data: 1 }, "wrong")).status, 401);
    const alice = (await connect(token)).socket;
    const bob = (await connect(forge("bob", now + 60))).socket;
    expect("a valid token connects", alice?.connected, true);
    const aliceGets = nextEvent(alice, "order");
    const bobGets = nextEvent(bob, "order", 500);
    const pub = await (await publish({ userId: "alice", event: "order", data: { id: 99 } })).json();
    expect("publish reports one delivery", pub.delivered, 1);
    expect("alice receives it", (await aliceGets)?.id, 99);
    expect("bob does not", await bobGets, undefined);

    // An order placed through the app's API is pushed to the browser.
    const pushed = nextEvent(alice, "order");
    const csrf = b.jar.get("devora_csrf");
    expect("an order without CSRF is a 403", (await b(`${app}/api/orders`, json({ item: "x" }))).status, 403);
    const placed = await b(`${app}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devora-csrf": csrf },
      body: JSON.stringify({ item: "Coffee" }),
    });
    expect("placing an order is a 201", placed.status, 201);
    expect("the order reaches the connected client", (await pushed)?.item, "Coffee");
    const list = await (await b(`${app}/api/orders`)).json();
    expect("the polling fallback sees it too", list.orders.map((o) => o.item).join(","), "Coffee");

    // The page's CSP allows the realtime connection.
    const csp = (await fetch(`${app}/login`)).headers.get("content-security-policy") ?? "";
    expect("CSP names the realtime server in connect-src", csp, (c) => c.includes(`connect-src 'self' ${rt} ws://localhost:4400`));
    alice.close();
    bob.close();
  } finally {
    realtime.kill("SIGTERM");
  }
};

if (name === "background-jobs") process.env.REDIS_PORT = "6390";

if (name === "realtime") {
  process.env.REALTIME_TOKEN_SECRET = randomBytes(24).toString("base64url");
  process.env.REALTIME_PUBLISH_SECRET = randomBytes(24).toString("base64url");
}

if (!CHECKS[name]) throw new Error(`no checks for "${name}"`);
const server = spawn("npm", ["start"], {
  env: { ...process.env, DEVORA_SESSION_SECRET: secret, PORT: "" },
  stdio: ["ignore", "inherit", "inherit"],
  detached: true,
});
try {
  await waitFor("http://localhost:4173/");
  await CHECKS[name]();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  process.kill(-server.pid, "SIGTERM");
}
