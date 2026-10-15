/**
 * Pre-rendered pages and built/public files through the real production
 * handler: status codes, validators, content types, HEAD, methods, traversal,
 * compression, security headers, and that a served file is held in memory
 * (deleting it after the first request does not change the answer).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler, writeCachedRoute } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const BIG_HTML = `<!doctype html><html><body>${"<p>pre-rendered paragraph</p>".repeat(200)}</body></html>`;

const BUILT_SSG_PAGE = `
import { createElement } from "react";
export const renderMode = "ssg";
export default function Page() { return createElement("p", null, "x"); }`;
const BUILT_ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;

const FILES: Record<string, string | Buffer> = {
  "sitemap.xml": '<?xml version="1.0"?><urlset></urlset>',
  "site.webmanifest": '{"name":"fixture"}',
  "logo.svg": "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
  "data.json": '{"a":1}',
  "robots.txt": "User-agent: *",
  "font.woff2": Buffer.from([0x77, 0x4f, 0x46, 0x32, 0, 1, 2, 3]),
  "mystery.unknownext": "bytes",
  "assets/app-abc123.js": "export const x = 1;\n".repeat(200),
  "file with space.txt": "spaced",
};

let fixture: FixtureProject;
let server: http.Server;
let base: string;

function get(p: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${base}${p}`, { redirect: "manual", ...init });
}

beforeAll(async () => {
  process.env.NODE_ENV = "production";
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  const clientOut = path.join(fixture.appRoot, "dist", "client");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(fixture.appRoot, "routes", "pre.ts"), BUILT_SSG_PAGE);
  write(path.join(serverOut, "routes", "pre.js"), BUILT_SSG_PAGE);
  await writeCachedRoute(path.join(fixture.appRoot, "dist", "static"), "/pre", BIG_HTML);
  for (const [name, contents] of Object.entries(FILES)) write(path.join(clientOut, name), contents as string);
  // A file outside the client folder that traversal must never reach.
  write(path.join(fixture.appRoot, "dist", "secret.txt"), "top secret");

  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, false);
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

describe("content types", () => {
  const cases: Array<[string, RegExp]> = [
    ["/sitemap.xml", /^application\/xml/],
    ["/site.webmanifest", /^application\/manifest\+json/],
    ["/logo.svg", /^image\/svg\+xml/],
    ["/data.json", /^application\/json/],
    ["/robots.txt", /^text\/plain/],
    ["/font.woff2", /^font\/woff2$/],
    ["/assets/app-abc123.js", /^application\/javascript/],
    ["/mystery.unknownext", /^application\/octet-stream$/],
  ];
  for (const [url, expected] of cases) {
    it(`${url}`, async () => {
      const res = await get(url);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(expected);
    });
  }
});

describe("validators, caching and methods", () => {
  it("hashed assets are immutable, public files are cached for an hour, HTML is revalidated", async () => {
    expect((await get("/assets/app-abc123.js")).headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect((await get("/robots.txt")).headers.get("cache-control")).toBe("public, max-age=3600");
    expect((await get("/pre")).headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
  });

  it("If-None-Match answers 304 with no body, for a file and for a page", async () => {
    for (const url of ["/robots.txt", "/assets/app-abc123.js", "/pre"]) {
      const first = await get(url);
      const etag = first.headers.get("etag")!;
      expect(etag, url).toBeTruthy();
      await first.arrayBuffer();
      const second = await get(url, { headers: { "If-None-Match": etag } });
      expect(second.status, url).toBe(304);
      expect(await second.text(), url).toBe("");
      expect((await get(url, { headers: { "If-None-Match": '"nope"' } })).status, url).toBe(200);
    }
  });

  it("HEAD returns the headers and Content-Length but no body", async () => {
    const res = await get("/robots.txt", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe(String("User-agent: *".length));
    expect(await res.text()).toBe("");
    const page = await get("/pre", { method: "HEAD" });
    expect(page.status).toBe(200);
    expect(await page.text()).toBe("");
  });

  it("other methods get 405 with Allow", async () => {
    for (const url of ["/robots.txt", "/pre"]) {
      const res = await get(url, { method: "POST", body: "x" });
      expect(res.status, url).toBe(405);
      expect(res.headers.get("allow"), url).toBe("GET, HEAD");
    }
  });

  it("a percent-encoded file name is found", async () => {
    const res = await get("/file%20with%20space.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("spaced");
  });
});

describe("compression", () => {
  it("sends brotli or gzip to a client that accepts it, with Vary, and the raw bytes otherwise", async () => {
    const raw = await get("/pre", { headers: { "Accept-Encoding": "identity" } });
    expect(raw.headers.get("content-encoding")).toBeNull();
    expect(raw.headers.get("vary")).toMatch(/Accept-Encoding/i);
    expect(await raw.text()).toBe(BIG_HTML);

    // fetch() would transparently decode; use http.get to see the wire bytes.
    const wire = (enc: string) =>
      new Promise<{ headers: http.IncomingHttpHeaders; body: Buffer }>((resolve) => {
        http.get(`${base}/pre`, { headers: { "Accept-Encoding": enc } }, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
        });
      });
    const br = await wire("br, gzip");
    expect(br.headers["content-encoding"]).toBe("br");
    expect(zlib.brotliDecompressSync(br.body).toString()).toBe(BIG_HTML);
    expect(Number(br.headers["content-length"])).toBe(br.body.length);
    expect(br.body.length).toBeLessThan(BIG_HTML.length);

    const gz = await wire("gzip");
    expect(gz.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(gz.body).toString()).toBe(BIG_HTML);
    expect(gz.headers.etag).not.toBe(br.headers.etag);
  });
});

describe("protections", () => {
  it("path traversal never reaches a file outside the client folder", async () => {
    // Raw sockets: fetch() normalizes ".." away before sending.
    const raw = (target: string) =>
      new Promise<number>((resolve) => {
        const req = http.request({ host: "127.0.0.1", port: (server.address() as AddressInfo).port, path: target }, (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        });
        req.end();
      });
    for (const target of [
      "/assets/../../secret.txt",
      "/assets/%2e%2e/%2e%2e/secret.txt",
      "/..%2fsecret.txt",
      "/assets/..%5c..%5csecret.txt",
      "/assets/%00.js",
      "/%2e%2e/secret.txt",
    ]) {
      const status = await raw(target);
      expect(status, target).toBe(404);
    }
  });

  it("a missing file or page is 404", async () => {
    expect((await get("/assets/missing-123.js")).status).toBe(404);
    expect((await get("/missing.png")).status).toBe(404);
    expect((await get("/not-built")).status).toBe(404);
  });

  it("security headers are on pre-rendered HTML and on files", async () => {
    for (const url of ["/pre", "/robots.txt", "/assets/app-abc123.js"]) {
      const res = await get(url);
      expect(res.headers.get("content-security-policy"), url).toBeTruthy();
      expect(res.headers.get("x-frame-options"), url).toBe("DENY");
      expect(res.headers.get("strict-transport-security"), url).toBeTruthy();
    }
  });

  it("a trailing slash reaches the same page", async () => {
    const res = await get("/pre/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(BIG_HTML);
  });
});

describe("served from memory", () => {
  it("a file and a page that were served once keep answering after they are gone from disk", async () => {
    const asset = path.join(fixture.appRoot, "dist", "client", "robots.txt");
    const page = path.join(fixture.appRoot, "dist", "static", "pre", "index.html");
    expect((await get("/robots.txt")).status).toBe(200);
    expect((await get("/pre")).status).toBe(200);
    fs.rmSync(asset);
    fs.rmSync(page);
    const a = await get("/robots.txt");
    expect(a.status).toBe(200);
    expect(await a.text()).toBe("User-agent: *");
    const p = await get("/pre");
    expect(p.status).toBe(200);
    expect(await p.text()).toBe(BIG_HTML);
  });
});
