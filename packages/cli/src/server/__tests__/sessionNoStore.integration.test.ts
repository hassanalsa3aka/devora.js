/**
 * A response that reads or sets the session cookie is personal: through the
 * real production handler (and the dev server), it carries
 * `Cache-Control: private, no-store`, replacing any Cache-Control the handler
 * set. A response that never touched the session cookie is left alone.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { ViteDevServer } from "vite";
import { createProdRequestHandler } from "@devorajs/core";
import { createAppDevServer } from "../../commands/dev.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, PAGE_ROUTES, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };

const PUBLIC_API = `
export async function handler() {
  return { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }, body: "{}" };
}`;
const ACCOUNT_PAGE = `
import { createElement } from "react";
import { redirect } from "@devorajs/core";
export const renderMode = "ssr";
export async function loader(ctx) {
  if (!ctx.session) throw redirect("/login");
  return { user: ctx.session.userId };
}
export default function Account({ data }) { return createElement("p", null, "hello " + data.user); }`;
const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString, renderToPipeableStream } from "react-dom/server";
import { createRenderRoute, createRenderStatic, createRenderStreaming } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
export const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
`;

let fixture: FixtureProject;
let prod: http.Server;
let dev: ViteDevServer;
const bases: Record<string, string> = {};

beforeAll(async () => {
  process.env.DEVORA_SESSION_SECRET = "no-store-test-secret-no-store-test-secret";
  fixture = createFixtureProject();
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(fixture.appRoot, "api", "public.ts"), PUBLIC_API);
  write(path.join(fixture.appRoot, "routes", "account.ts"), ACCOUNT_PAGE);
  write(path.join(fixture.appRoot, "routes", "account-stream.ts"), ACCOUNT_PAGE.replace('"ssr"', '"streaming"'));

  // Production: the built files the handler imports.
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(serverOut, "session-manifest.json"), JSON.stringify({ store: "memory" }));
  write(path.join(serverOut, "api", "public.js"), PUBLIC_API);
  write(path.join(serverOut, "routes", "account.js"), ACCOUNT_PAGE);
  write(path.join(serverOut, "routes", "index.js"), PAGE_ROUTES["index.ts"]!);
  write(path.join(serverOut, "routes", "account-stream.js"), ACCOUNT_PAGE.replace('"ssr"', '"streaming"'));
  // The fixture's login/me routes, built the plain-JS way.
  write(
    path.join(serverOut, "api", "login.js"),
    `export const methods = ["POST"];
export async function handler(req, ctx) {
  const body = JSON.parse(req.body.toString("utf-8") || "{}");
  const token = await ctx.setSession({ userId: body.userId }, { transport: body.transport ?? "cookie" });
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) };
}`
  );
  write(
    path.join(serverOut, "api", "logout.js"),
    `export const methods = ["POST"];
export async function handler(_req, ctx) { await ctx.revokeSession(); return { status: 204 }; }`
  );
  process.env.NODE_ENV = "production";
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "shared", "fixture.example.com", undefined, false);
  prod = http.createServer((req, res) => {
    handle(req, res).then((done) => {
      if (!done) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((r) => prod.listen(0, "127.0.0.1", r));
  bases.prod = `http://127.0.0.1:${(prod.address() as AddressInfo).port}`;

  // Dev: the real dev server on the same fixture.
  process.env.NODE_ENV = "development";
  const app = { name: "fixture", dir: "app", domain: "fixture.example.com" };
  dev = await createAppDevServer({
    projectRoot: fixture.projectRoot,
    app,
    appRoot: fixture.appRoot,
    authMode: "shared",
    appConfig: {},
    sessions: undefined,
    port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
  });
  bases.dev = `http://localhost:${(dev.httpServer!.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  await new Promise((r) => prod?.close(r));
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

const sessionCookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith("devora_session="))
    ?.split(";")[0];

async function loginCookie(base: string): Promise<string> {
  const res = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "u1", transport: "cookie" }),
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  return sessionCookieOf(res)!;
}

describe.each(["prod", "dev"])("Cache-Control on session responses (%s)", (which) => {
  it("an API response with the session cookie is private, no-store even if the handler said public", async () => {
    const base = bases[which]!;
    const cookie = await loginCookie(base);
    const withSession = await fetch(`${base}/api/public`, { headers: { cookie } });
    expect(withSession.headers.get("cache-control")).toBe("private, no-store");
    // Without a session cookie, the handler's own header is kept.
    const anonymous = await fetch(`${base}/api/public`);
    expect(anonymous.headers.get("cache-control")).toBe("public, max-age=60");
    // A Bearer request never read the cookie.
    const bearer = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u2", transport: "bearer" }),
    });
    const { token } = (await bearer.json()) as { token: string };
    expect(bearer.headers.get("cache-control")).toBeNull();
    const withBearer = await fetch(`${base}/api/public`, { headers: { authorization: `Bearer ${token}` } });
    expect(withBearer.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("a page that read the session (ssr and streaming), a redirect, a dead cookie and a logout are private, no-store", async () => {
    const base = bases[which]!;
    const cookie = await loginCookie(base);
    for (const page of ["/account", "/account-stream"]) {
      const res = await fetch(`${base}${page}`, { headers: { cookie } });
      expect(res.status, page).toBe(200);
      expect(await res.text(), page).toContain("hello");
      expect(res.headers.get("cache-control"), page).toBe("private, no-store");
      const anonymous = await fetch(`${base}${page}`, { redirect: "manual" });
      expect(anonymous.status, page).toBe(302);
      expect(anonymous.headers.get("cache-control"), page).toBeNull();
    }
    const dead = await fetch(`${base}/account`, { headers: { cookie: "devora_session=not-a-real-session" }, redirect: "manual" });
    expect(dead.status).toBe(302);
    expect(dead.headers.get("cache-control")).toBe("private, no-store");
    const logout = await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } });
    expect(logout.status).toBe(204);
    expect(logout.headers.get("cache-control")).toBe("private, no-store");
    // The home page never touched a session: no Cache-Control is added.
    const home = await fetch(`${base}/`);
    expect(home.headers.get("cache-control")).toBeNull();
  });
});
