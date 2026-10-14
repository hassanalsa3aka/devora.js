#!/usr/bin/env node
/**
 * Runs one example's production build (`npm start`) and sends it real
 * requests — what CI does after `npm ci && npm run typecheck && npm run
 * build`. Usage, from an example's folder: node ../check.mjs
 *
 * `devora start` serves the apps on 4173, 4174, ... in devora.config.ts order.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
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

/** Cookie jar for one "browser". */
function browser() {
  const jar = new Map();
  return async (url, init = {}) => {
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
    // The sitemap leaves out dynamic routes, even ones with getStaticParams() (see the README).
    expect("sitemap is served", await (await fetch(`${site}/sitemap.xml`)).text(), (x) => x.includes("<loc>https://blog.example.com</loc>"));
    expect("the route stylesheet is linked", html, (h) => /<link rel="stylesheet" href="\/assets\/[^"]+\.css"/.test(h));
  },
};

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
