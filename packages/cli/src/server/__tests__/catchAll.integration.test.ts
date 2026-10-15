/**
 * Catch-all routes (`[...slug]`, `[[...slug]]`) for pages and API routes,
 * through the real dev server and the real production handler, with real
 * HTTP. Also the sitemap: a dynamic route's `getStaticParams()` entries must
 * be listed. The production side uses hand-written "built" files, like
 * prodServer.integration.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { ViteDevServer } from "vite";
import { createProdRequestHandler, writeCachedRoute } from "@devorajs/core";
import { createAppDevServer } from "../../commands/dev.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const PAGE_SOURCE = (marker: string) => `
import { createElement } from "react";
export const renderMode = "ssr";
export function loader(ctx) { return { params: ctx.params, catchAll: ctx.catchAll }; }
export default function Page(props) {
  return createElement("pre", { id: ${JSON.stringify(marker)} }, JSON.stringify(props.data));
}`;

const SSG_SOURCE = `
import { createElement } from "react";
export const renderMode = "ssg";
export function getStaticParams() { return [{ slug: ["intro"] }, { slug: ["guide", "setup"] }]; }
export default function Page() { return createElement("p", null, "ssg catch-all"); }`;

const API_SOURCE = `
import { apiRoute } from "@devorajs/core";
export const handler = apiRoute((req) => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ params: req.params, catchAll: req.catchAll }),
}));`;

const BUILT_API = `
export function handler(req) {
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ params: req.params, catchAll: req.catchAll }) };
}`;

const BUILT_PAGE = (marker: string) => `
import { createElement } from "react";
export const renderMode = "ssr";
export function loader(ctx) { return { params: ctx.params, catchAll: ctx.catchAll }; }
export default function Page(props) {
  return createElement("pre", { id: ${JSON.stringify(marker)} }, JSON.stringify(props.data));
}`;

const BUILT_SSG = `
import { createElement } from "react";
export const renderMode = "ssg";
export function getStaticParams() { return [{ slug: ["intro"] }, { slug: ["guide", "setup"] }]; }
export default function Page() { return createElement("p", null, "ssg catch-all"); }`;

const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;

async function bodyOf(res: Response): Promise<string> {
  return res.text();
}

function paramsIn(html: string, id: string): unknown {
  const m = new RegExp(`<pre id="${id}">([^<]*)</pre>`).exec(html);
  return m ? JSON.parse(m[1]!.replace(/&quot;/g, '"')) : undefined;
}

let fixture: FixtureProject;

beforeAll(() => {
  fixture = createFixtureProject();
  const routes = path.join(fixture.appRoot, "routes");
  write(path.join(routes, "docs", "[...slug].ts"), PAGE_SOURCE("docs"));
  write(path.join(routes, "docs", "intro.ts"), PAGE_SOURCE("static-intro"));
  write(path.join(routes, "wiki", "[[...path]].ts"), PAGE_SOURCE("wiki"));
  write(path.join(routes, "guide", "[...slug].ts"), SSG_SOURCE);
  write(path.join(fixture.appRoot, "api", "files", "[...path].ts"), API_SOURCE);
});

afterAll(() => fixture?.cleanup());

describe("catch-all routes — dev server", () => {
  let server: ViteDevServer;
  let base: string;

  beforeAll(async () => {
    server = await createAppDevServer({
      projectRoot: fixture.projectRoot,
      app: { name: "fixture", dir: "app", domain: "fixture.example.com" },
      appRoot: fixture.appRoot,
      authMode: "shared",
      appConfig: { sitemap: true },
      sessions: { store: "memory" },
      port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
    });
    base = `http://localhost:${(server.httpServer!.address() as AddressInfo).port}`;
  }, 30_000);

  afterAll(async () => {
    await server?.close();
  });

  it("a page catch-all gets joined params and catchAll arrays, including a dotted segment", async () => {
    const res = await fetch(`${base}/docs/v1.2/intro/deep`);
    expect(res.status).toBe(200);
    expect(paramsIn(await bodyOf(res), "docs")).toEqual({ params: { slug: "v1.2/intro/deep" }, catchAll: { slug: ["v1.2", "intro", "deep"] } });
  });

  it("a static file beats the catch-all", async () => {
    const res = await fetch(`${base}/docs/intro`);
    expect(paramsIn(await bodyOf(res), "static-intro")).toBeDefined();
  });

  it("[...slug] does not match its bare folder; [[...path]] does", async () => {
    expect((await fetch(`${base}/docs`)).status).toBe(404);
    const res = await fetch(`${base}/wiki`);
    expect(res.status).toBe(200);
    expect(paramsIn(await bodyOf(res), "wiki")).toEqual({ params: { path: "" }, catchAll: { path: [] } });
  });

  it("an API catch-all gets joined params and catchAll arrays as JSON", async () => {
    const res = await fetch(`${base}/api/files/a/b.txt`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ params: { path: "a/b.txt" }, catchAll: { path: ["a", "b.txt"] } });
  });

  it("encoded slashes and dot-dot segments never match", async () => {
    for (const p of ["/docs/a%2Fb", "/docs/%2e%2e/x", "/docs/a%5Cb"]) {
      expect((await fetch(`${base}${p}`)).status, p).toBe(404);
    }
  });

  it("the sitemap lists the concrete URLs of getStaticParams()", async () => {
    const xml = await (await fetch(`${base}/sitemap.xml`)).text();
    expect(xml).toContain("https://fixture.example.com/guide/intro");
    expect(xml).toContain("https://fixture.example.com/guide/guide/setup");
    expect(xml).not.toContain("[");
  });
});

describe("catch-all routes — production handler", () => {
  const ORIGINAL_ENV = { ...process.env };
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    process.env.DEVORA_SESSION_SECRET = "catch-all-test-secret";
    const out = path.join(fixture.appRoot, "dist", "server");
    write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
    write(path.join(out, "entry-server.js"), BUILT_ENTRY_SERVER);
    // Build keys replace [ and ] with _ (buildKey.ts).
    write(path.join(out, "routes", "docs", "_...slug_.js"), BUILT_PAGE("docs"));
    write(path.join(out, "routes", "docs", "intro.js"), BUILT_PAGE("static-intro"));
    write(path.join(out, "routes", "wiki", "__...path__.js"), BUILT_PAGE("wiki"));
    write(path.join(out, "routes", "guide", "_...slug_.js"), BUILT_SSG);
    write(path.join(out, "api", "files", "_...path_.js"), BUILT_API);
    // What buildAppStatic.ts writes for each getStaticParams() entry.
    await writeCachedRoute(path.join(fixture.appRoot, "dist", "static"), "/guide/intro", "<p>ssg catch-all</p>");
    write(path.join(out, "session-manifest.json"), JSON.stringify({ store: "memory" }));
    const handle = createProdRequestHandler(
      fixture.appRoot,
      "fixture",
      "none",
      "fixture.example.com",
      undefined,
      true
    );
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
    process.env = { ...ORIGINAL_ENV };
  });

  it("a page catch-all gets joined params and catchAll arrays, including a dotted segment", async () => {
    const res = await fetch(`${base}/docs/v1.2/intro/deep`);
    expect(res.status).toBe(200);
    expect(paramsIn(await bodyOf(res), "docs")).toEqual({ params: { slug: "v1.2/intro/deep" }, catchAll: { slug: ["v1.2", "intro", "deep"] } });
  });

  it("static beats catch-all; bare folder only matches the optional form", async () => {
    expect(paramsIn(await bodyOf(await fetch(`${base}/docs/intro`)), "static-intro")).toBeDefined();
    expect((await fetch(`${base}/docs`)).status).toBe(404);
    expect(paramsIn(await bodyOf(await fetch(`${base}/wiki`)), "wiki")).toEqual({ params: { path: "" }, catchAll: { path: [] } });
  });

  it("an API catch-all gets joined params and catchAll arrays as JSON", async () => {
    const res = await fetch(`${base}/api/files/x/y`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ params: { path: "x/y" }, catchAll: { path: ["x", "y"] } });
  });

  it("an ssg catch-all only serves params that getStaticParams() listed", async () => {
    expect((await fetch(`${base}/guide/intro`)).status).not.toBe(404);
    expect((await fetch(`${base}/guide/other`)).status).toBe(404);
  });

  it("encoded slashes and dot-dot segments never match", async () => {
    for (const p of ["/docs/a%2Fb", "/docs/%2e%2e/x", "/docs/a%5Cb"]) {
      expect((await fetch(`${base}${p}`)).status, p).toBe(404);
    }
  });

  it("security headers are still on a catch-all page", async () => {
    const res = await fetch(`${base}/docs/a/b`);
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("x-frame-options")).toBeTruthy();
  });

  it("the sitemap lists the concrete URLs of getStaticParams()", async () => {
    const xml = await (await fetch(`${base}/sitemap.xml`)).text();
    expect(xml).toContain("https://fixture.example.com/guide/intro");
    expect(xml).toContain("https://fixture.example.com/guide/guide/setup");
    expect(xml).not.toContain("[");
  });
});
