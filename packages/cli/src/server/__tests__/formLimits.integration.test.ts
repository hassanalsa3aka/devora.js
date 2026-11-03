/**
 * app.config.ts `maxFormFields` / `maxFormFiles` through the real production
 * handler: a page form over either limit gets a 413 error page and the
 * action never runs.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createProdRequestHandler } from "@devorajs/core";
import { createFixtureProject, write, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
const UPLOAD_PAGE = `
import { createElement } from "react";
export const renderMode = "ssr";
export async function action(formData) { return { received: [...formData.keys()].length }; }
export default function Upload({ actionData }) { return createElement("p", null, "received " + (actionData?.received ?? 0)); }`;
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
  fixture = createFixtureProject();
  const serverOut = path.join(fixture.appRoot, "dist", "server");
  write(path.join(fixture.projectRoot, "package.json"), JSON.stringify({ type: "module" }));
  write(path.join(serverOut, "entry-server.js"), BUILT_ENTRY_SERVER);
  write(path.join(fixture.appRoot, "routes", "upload.ts"), UPLOAD_PAGE);
  write(path.join(serverOut, "routes", "upload.js"), UPLOAD_PAGE);
  const handle = createProdRequestHandler(fixture.appRoot, "fixture", "none", "fixture.example.com", undefined, false, undefined, {
    maxFormFields: 3,
    maxFormFiles: 2,
  });
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

function upload(fields: number, files: number): Promise<Response> {
  const form = new FormData();
  for (let i = 0; i < fields; i++) form.append(`field${i}`, "x");
  for (let i = 0; i < files; i++) form.append(`file${i}`, new File(["data"], `f${i}.txt`));
  return fetch(`${base}/upload`, { method: "POST", body: form });
}

describe("form limits from app config", () => {
  it("within both limits: the action runs", async () => {
    const res = await upload(3, 2);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("received 5");
  });

  it("one field too many: 413 error page, the action never ran", async () => {
    const res = await upload(4, 0);
    expect(res.status).toBe(413);
    const html = await res.text();
    expect(html).toContain("413");
    expect(html).not.toContain("received");
  });

  it("one file too many: 413", async () => {
    expect((await upload(0, 3)).status).toBe(413);
  });

  it("a URL-encoded form over the field limit: 413", async () => {
    const res = await fetch(`${base}/upload`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "a=1&b=2&c=3&d=4",
    });
    expect(res.status).toBe(413);
  });
});
