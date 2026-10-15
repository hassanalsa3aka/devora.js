/**
 * The in-memory static cache's limits and freshness, through real HTTP:
 * isr still regenerates, the byte allowance and per-file cap hold (large
 * files are streamed), a rebuild shows up, and public xml files behave as
 * documented.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { ByteBudget, MAX_FILE_BYTES, createProdRequestHandler, createStaticFileServer, writeCachedRoute } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;
const ISR_PAGE = `
import { createElement } from "react";
export const renderMode = "isr";
export const revalidate = { seconds: 1 };
export function loader() { return { at: process.hrtime.bigint().toString() }; }
export default function Page(props) { return createElement("p", { id: "stamp" }, props.data.at); }`;
const SSG_PAGE = `
import { createElement } from "react";
export const renderMode = "ssg";
export default function Page() { return createElement("p", null, "x"); }`;

function listen(handler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<boolean | void>): Promise<{ server: http.Server; base: string }> {
  const server = http.createServer((req, res) => {
    handler(req, res).then((done) => {
      if (done === false) {
        res.statusCode = 404;
        res.end("Not Found");
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }))
  );
}

describe("production handler: isr, rebuilds, xml", () => {
  let fixture: FixtureProject;
  let server: http.Server;
  let base: string;
  let sitemapServer: http.Server;
  let sitemapBase: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    fixture = createFixtureProject();
    const serverOut = path.join(fixture.appRoot, "dist", "server");
    write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
    write(path.join(serverOut, "entry-server.js"), ENTRY_SERVER);
    write(path.join(fixture.appRoot, "routes", "live.ts"), ISR_PAGE);
    write(path.join(serverOut, "routes", "live.js"), ISR_PAGE);
    write(path.join(fixture.appRoot, "routes", "pre.ts"), SSG_PAGE);
    write(path.join(serverOut, "routes", "pre.js"), SSG_PAGE);
    await writeCachedRoute(path.join(fixture.appRoot, "dist", "static"), "/pre", "<p>first build</p>");
    write(path.join(fixture.appRoot, "dist", "client", "sitemap.xml"), "<urlset>hand-written</urlset>");
    write(path.join(fixture.appRoot, "dist", "client", "feed.xml"), "<rss>feed</rss>");

    const off = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, false);
    ({ server, base } = await listen(off));
    const on = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, true);
    ({ server: sitemapServer, base: sitemapBase } = await listen(on));
  });

  afterAll(async () => {
    await new Promise((r) => server?.close(r));
    await new Promise((r) => sitemapServer?.close(r));
    fixture?.cleanup();
    process.env = { ...ORIGINAL_ENV };
  });

  const stamp = (html: string) => /<p id="stamp">(\d+)<\/p>/.exec(html)?.[1];

  it("isr serves the cache, then regenerates once it is stale (real time)", async () => {
    const first = stamp(await (await fetch(`${base}/live`)).text());
    expect(first).toBeTruthy();
    const second = stamp(await (await fetch(`${base}/live`)).text());
    expect(second).toBe(first); // fresh: served from the cache, not re-rendered
    await sleep(1300); // past revalidate.seconds
    const third = stamp(await (await fetch(`${base}/live`)).text());
    expect(third).toBeTruthy();
    expect(third).not.toBe(first); // regenerated
    const fourth = stamp(await (await fetch(`${base}/live`)).text());
    expect(fourth).toBe(third); // and cached again
  });

  it("after a rebuild, a pre-rendered page shows the new output without a restart", async () => {
    expect(await (await fetch(`${base}/pre`)).text()).toBe("<p>first build</p>");
    const etag = (await fetch(`${base}/pre`)).headers.get("etag");
    await sleep(1100);
    await new Promise((r) => setTimeout(r, 10));
    const file = path.join(fixture.appRoot, "dist", "static", "pre", "index.html");
    fs.writeFileSync(file, "<p>second build, longer</p>");
    await sleep(1200);
    const res = await fetch(`${base}/pre`);
    expect(await res.text()).toBe("<p>second build, longer</p>");
    expect(res.headers.get("etag")).not.toBe(etag);
  });

  it("a rebuilt public file is picked up; a removed one is a 404", async () => {
    expect(await (await fetch(`${base}/feed.xml`)).text()).toBe("<rss>feed</rss>");
    await sleep(1100);
    const file = path.join(fixture.appRoot, "dist", "client", "feed.xml");
    fs.writeFileSync(file, "<rss>new feed</rss>");
    await sleep(1200);
    expect(await (await fetch(`${base}/feed.xml`)).text()).toBe("<rss>new feed</rss>");
    fs.rmSync(file);
    await sleep(1200);
    expect((await fetch(`${base}/feed.xml`)).status).toBe(404);
  });

  it("xml content types; a hand-written sitemap.xml with sitemap off, the generated one with it on", async () => {
    const hand = await fetch(`${base}/sitemap.xml`);
    expect(hand.headers.get("content-type")).toMatch(/^application\/xml/);
    expect(await hand.text()).toBe("<urlset>hand-written</urlset>");
    const generated = await fetch(`${sitemapBase}/sitemap.xml`);
    expect(generated.headers.get("content-type")).toMatch(/^application\/xml/);
    const body = await generated.text();
    expect(body).toContain("https://fixture.example.com");
    expect(body).not.toContain("hand-written");
  });
});

describe("static file cache limits", () => {
  let dir: string;
  let fixture: FixtureProject;

  beforeAll(() => {
    fixture = createFixtureProject();
    dir = path.join(fixture.projectRoot, "files");
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => fixture.cleanup());

  async function boot(budget: ByteBudget) {
    const files = createStaticFileServer(dir, budget);
    return listen(async (req, res) => files.serve(req, res, new URL(req.url!, "http://x").pathname, false));
  }

  it("holds small files in memory up to the byte allowance, serves the rest from disk", async () => {
    fs.writeFileSync(path.join(dir, "a.txt"), "a".repeat(600));
    fs.writeFileSync(path.join(dir, "b.txt"), "b".repeat(600));
    const budget = new ByteBudget(1000);
    const { server, base } = await boot(budget);
    try {
      expect(await (await fetch(`${base}/a.txt`)).text()).toBe("a".repeat(600));
      expect(budget.used).toBe(600);
      const b = await fetch(`${base}/b.txt`);
      expect(await b.text()).toBe("b".repeat(600)); // still served, streamed
      expect(b.headers.get("content-length")).toBe("600");
      expect(budget.used).toBe(600); // not held: no room
      expect(budget.used).toBeLessThanOrEqual(budget.limit);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it("a file over the per-file cap is streamed with its real length and never held", async () => {
    const big = Buffer.alloc(MAX_FILE_BYTES + 1024, "z");
    fs.writeFileSync(path.join(dir, "big.js"), big);
    const budget = new ByteBudget();
    const { server, base } = await boot(budget);
    try {
      const res = await fetch(`${base}/big.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-length")).toBe(String(big.length));
      expect((await res.arrayBuffer()).byteLength).toBe(big.length);
      expect(budget.used).toBe(0);
      const head = await fetch(`${base}/big.js`, { method: "HEAD" });
      expect(head.headers.get("content-length")).toBe(String(big.length));
      const etag = res.headers.get("etag")!;
      expect((await fetch(`${base}/big.js`, { headers: { "If-None-Match": etag } })).status).toBe(304);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it("compressed copies count against the allowance and are dropped when they do not fit", async () => {
    fs.writeFileSync(path.join(dir, "c.css"), "body { color: red; }\n".repeat(200)); // 4200 B, compressible
    const budget = new ByteBudget(4300);
    const { server, base } = await boot(budget);
    try {
      const wire = (enc: string) =>
        new Promise<number>((resolve) => {
          http.get(`${base}/c.css`, { headers: { "Accept-Encoding": enc } }, (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode ?? 0));
          });
        });
      expect(await wire("identity")).toBe(200);
      expect(budget.used).toBe(4200);
      expect(await wire("br")).toBe(200);
      await sleep(50);
      expect(budget.used).toBeLessThanOrEqual(budget.limit);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
