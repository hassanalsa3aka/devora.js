/**
 * A page route answers GET, HEAD and POST. PUT, PATCH, DELETE and other methods are a 405 with an Allow header, not the page.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
`;
const PAGE = `
import { createElement } from "react";
export const renderMode = "ssr";
export default function Page() { return createElement("p", { id: "ok" }, "page"); }`;

describe("page routes and HTTP methods", () => {
  let fixture: FixtureProject;
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    fixture = createFixtureProject();
    const serverOut = path.join(fixture.appRoot, "dist", "server");
    write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
    write(path.join(serverOut, "entry-server.js"), ENTRY_SERVER);
    write(path.join(fixture.appRoot, "routes", "page.ts"), PAGE);
    write(path.join(serverOut, "routes", "page.js"), PAGE);
    const handler = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, false);
    server = http.createServer((req, res) => {
      handler(req, res).then((done) => {
        if (done === false) {
          res.statusCode = 404;
          res.end("Not Found");
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
    fixture.cleanup();
    process.env = { ...ORIGINAL_ENV };
  });

  it("answers GET and HEAD with the page", async () => {
    expect((await fetch(`${base}/page`)).status).toBe(200);
    expect((await fetch(`${base}/page`, { method: "HEAD" })).status).toBe(200);
  });

  it.each(["PUT", "PATCH", "DELETE"])("answers %s with 405 and an Allow header", async (method) => {
    const res = await fetch(`${base}/page`, { method });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD, POST");
    expect(await res.text()).not.toContain('id="ok"');
  });
});
