/**
 * A page form POST through the real production handler: the CSRF check on a form action, and the
 * response headers around it. The expected header values are the ones the published 0.3.4 sends
 * (captured from a real `devora start`), so a performance change that alters a header or a cookie
 * flag fails here. Statuses: no token, a missing field and a wrong token are all 403; a valid
 * token is a 303 that sets the session cookie.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };

const LOGIN_ROUTE = `
import { createElement } from "react";
import { redirect, CsrfField } from "@devorajs/core";
export const renderMode = "ssr";
export async function action(formData, ctx) {
  ctx.verifyCsrf(formData);
  await ctx.setSession({ username: String(formData.get("username") ?? "") });
  return redirect("/");
}
export default function Login({ csrfToken }) {
  return createElement("form", { method: "post" }, createElement(CsrfField, { token: csrfToken }), createElement("input", { name: "username" }));
}`;
const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;

// What 0.3.4 sends on these responses.
const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'";
const HSTS = "max-age=63072000; includeSubDomains";

let fixture: FixtureProject;
let server: http.Server;
let base: string;

beforeAll(async () => {
  process.env.NODE_ENV = "production";
  process.env.DEVORA_SESSION_SECRET = "form-csrf-test-secret-form-csrf-test";
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(serverOut, "session-manifest.json"), JSON.stringify({ store: "memory" }));
  write(path.join(fixture.appRoot, "routes", "login.ts"), LOGIN_ROUTE);
  write(path.join(serverOut, "routes", "login.js"), LOGIN_ROUTE);
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "shared", "fixture.example.com", undefined, false);
  server = http.createServer((req, res) => {
    handle(req, res).then((done) => {
      if (!done) {
        res.statusCode = 404;
        res.end("Not Found");
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

const cookiesOf = (res: Response) => res.headers.getSetCookie();
const post = (fields: Record<string, string>, cookie?: string) =>
  fetch(`${base}/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(fields).toString(),
  });
async function freshForm() {
  const res = await fetch(`${base}/login`, { redirect: "manual" });
  const html = await res.text();
  return { res, token: html.match(/name="_csrf" value="([^"]+)"/)?.[1] ?? "", cookie: cookiesOf(res).map((c) => c.split(";")[0]).join("; ") };
}

function expectSecurityHeaders(res: Response) {
  expect(res.headers.get("content-security-policy")).toBe(CSP);
  expect(res.headers.get("strict-transport-security")).toBe(HSTS);
  expect(res.headers.get("x-frame-options")).toBe("DENY");
}

describe("page form POST with CSRF", () => {
  it("GET: the form, the default security headers, and a CSRF cookie with HttpOnly, SameSite=Lax and Secure", async () => {
    const { res, token } = await freshForm();
    expect(res.status).toBe(200);
    expectSecurityHeaders(res);
    expect(token).not.toBe("");
    const cookies = cookiesOf(res);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^devora_csrf=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
  });

  it("POST with no token and no cookie is a 403, with the security headers and no cookie set", async () => {
    const res = await post({ username: "ann" });
    expect(res.status).toBe(403);
    expectSecurityHeaders(res);
    expect(cookiesOf(res).filter((c) => c.startsWith("devora_session="))).toEqual([]);
  });

  it("POST with the cookie but no token field is a 403", async () => {
    const { cookie } = await freshForm();
    const res = await post({ username: "ann" }, cookie);
    expect(res.status).toBe(403);
    expectSecurityHeaders(res);
    expect(cookiesOf(res)).toEqual([]);
  });

  it("POST with a wrong token is a 403, and a token from another browser's cookie is a 403", async () => {
    const mine = await freshForm();
    const wrong = await post({ username: "ann", _csrf: "wrong-token-value" }, mine.cookie);
    expect(wrong.status).toBe(403);
    expectSecurityHeaders(wrong);
    expect(cookiesOf(wrong)).toEqual([]);
    const theirs = await freshForm();
    const crossed = await post({ username: "ann", _csrf: theirs.token }, mine.cookie);
    expect(crossed.status).toBe(403);
  });

  it("POST with the valid token is a 303 to / that sets an HttpOnly, SameSite=Lax, Secure session cookie", async () => {
    const { token, cookie } = await freshForm();
    const res = await post({ username: "ann", _csrf: token }, cookie);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    expectSecurityHeaders(res);
    const cookies = cookiesOf(res);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^devora_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
  });
});
