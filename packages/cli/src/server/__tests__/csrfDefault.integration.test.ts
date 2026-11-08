/**
 * The default CSRF check, through the real production handler: a
 * POST/PUT/PATCH/DELETE authenticated by the session cookie needs the token
 * (form field or x-devora-csrf header) before the action or handler runs.
 * Bearer, anonymous and dead-cookie requests are not checked; a route opts
 * out with `export const csrf = false`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler } from "@devorajs/core";
import { createFixtureProject, PAGE_ROUTES, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const LOGIN = `
export const methods = ["POST"];
export async function handler(req, ctx) {
  const body = JSON.parse(req.body.toString("utf-8") || "{}");
  const token = await ctx.setSession({ userId: "u1" }, { transport: body.transport ?? "cookie" });
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) };
}`;
// Never calls ctx.verifyCsrf() itself: the framework's check is the only one.
const UPDATE = `
export async function handler(req, ctx) {
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ran: req.method, user: ctx.session?.userId ?? null }) };
}`;
const WEBHOOK = `export const csrf = false;\n${UPDATE}`;
const SETTINGS_PAGE = `
import { createElement } from "react";
import { redirect } from "@devorajs/core";
export const renderMode = "ssr";
export async function action(formData, ctx) { return redirect("/saved"); }
// Renders the token the way CsrfField does: a signed-in browser gets the one bound to its session (H30).
export default function Settings({ csrfToken }) { return createElement("form", { method: "post" }, createElement("input", { type: "hidden", name: "_csrf", value: csrfToken ?? "" }), createElement("p", null, "settings")); }`;
const OPTED_OUT_PAGE = SETTINGS_PAGE.replace('export const renderMode = "ssr";', 'export const renderMode = "ssr";\nexport const csrf = false;');
const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;

let fixture: FixtureProject;
let server: http.Server;
let base: string;

beforeAll(async () => {
  process.env.NODE_ENV = "production";
  process.env.DEVORA_SESSION_SECRET = "csrf-default-secret-csrf-default-secret";
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(serverOut, "session-manifest.json"), JSON.stringify({ store: "memory" }));
  for (const [name, source] of [["login", LOGIN], ["update", UPDATE], ["webhook", WEBHOOK]] as const) {
    write(path.join(fixture.appRoot, "api", `${name}.ts`), source);
    write(path.join(serverOut, "api", `${name}.js`), source);
  }
  for (const [name, source] of [["settings", SETTINGS_PAGE], ["opted-out", OPTED_OUT_PAGE]] as const) {
    write(path.join(fixture.appRoot, "routes", `${name}.ts`), source);
    write(path.join(serverOut, "routes", `${name}.js`), source);
  }
  write(path.join(serverOut, "routes", "index.js"), PAGE_ROUTES["index.ts"]!);
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "shared", "fixture.example.com", undefined, false);
  server = http.createServer((req, res) => {
    handle(req, res).then((done) => {
      if (!done) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => server?.close(r));
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

async function cookieLogin(): Promise<{ cookie: string; token: string }> {
  const res = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const pick = (name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(";")[0]!;
  const csrf = pick("devora_csrf");
  const cookie = `${pick("devora_session")}; ${csrf}`;
  // The token a signed-in page receives is bound to the session (H30), so it comes from a rendered page, not the cookie.
  const html = await (await fetch(`${base}/settings`, { headers: { cookie } })).text();
  const token = /name="_csrf" value="([^"]+)"/.exec(html)?.[1];
  if (!token) throw new Error("the settings page did not render a CSRF token");
  return { cookie, token };
}

describe("API routes", () => {
  it("POST, PUT, PATCH and DELETE with the session cookie and no token are 403 before the handler runs", async () => {
    const { cookie, token } = await cookieLogin();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const missing = await fetch(`${base}/api/update`, { method, headers: { cookie } });
      expect(missing.status, method).toBe(403);
      expect(await missing.json(), method).toEqual({ message: "Missing or invalid CSRF token" });
      const wrong = await fetch(`${base}/api/update`, { method, headers: { cookie, "x-devora-csrf": "not-the-token" } });
      expect(wrong.status, method).toBe(403);
      const right = await fetch(`${base}/api/update`, { method, headers: { cookie, "x-devora-csrf": token } });
      expect(right.status, method).toBe(200);
      expect(await right.json(), method).toEqual({ ran: method, user: "u1" });
    }
  });

  it("a token from another browser's cookie is refused", async () => {
    const mine = await cookieLogin();
    const theirs = await cookieLogin();
    const res = await fetch(`${base}/api/update`, { method: "POST", headers: { cookie: mine.cookie, "x-devora-csrf": theirs.token } });
    expect(res.status).toBe(403);
  });

  it("GET, HEAD and OPTIONS are never checked", async () => {
    const { cookie } = await cookieLogin();
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect((await fetch(`${base}/api/update`, { method, headers: { cookie } })).status, method).toBe(200);
    }
  });

  it("Bearer, anonymous and dead-cookie requests are not checked (there is no cookie session to ride)", async () => {
    const bearerLogin = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transport: "bearer" }) });
    const { token: bearer } = (await bearerLogin.json()) as { token: string };
    const withBearer = await fetch(`${base}/api/update`, { method: "POST", headers: { authorization: `Bearer ${bearer}` } });
    expect(withBearer.status).toBe(200);
    expect(await withBearer.json()).toEqual({ ran: "POST", user: "u1" });
    expect((await fetch(`${base}/api/update`, { method: "DELETE" })).status).toBe(200);
    expect((await fetch(`${base}/api/update`, { method: "POST", headers: { cookie: "devora_session=not-a-real-session" } })).status).toBe(200);
  });

  it("a route that exports csrf = false is not checked", async () => {
    const { cookie } = await cookieLogin();
    const res = await fetch(`${base}/api/webhook`, { method: "POST", headers: { cookie } });
    expect(res.status).toBe(200);
  });
});

describe("page actions", () => {
  const postForm = (page: string, cookie: string, fields: Record<string, string>) =>
    fetch(`${base}${page}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });

  it("a cookie-authenticated form post needs _csrf before the action runs", async () => {
    const { cookie, token } = await cookieLogin();
    expect((await postForm("/settings", cookie, { name: "x" })).status).toBe(403);
    expect((await postForm("/settings", cookie, { name: "x", _csrf: "wrong" })).status).toBe(403);
    const ok = await postForm("/settings", cookie, { name: "x", _csrf: token });
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("/saved");
  });

  it("an anonymous form post and a page that exports csrf = false are not checked", async () => {
    expect((await postForm("/settings", "", { name: "x" })).status).toBe(303);
    const { cookie } = await cookieLogin();
    expect((await postForm("/opted-out", cookie, { name: "x" })).status).toBe(303);
  });
});
