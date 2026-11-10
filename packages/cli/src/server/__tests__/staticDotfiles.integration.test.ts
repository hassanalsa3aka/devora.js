/**
 * Files and folders whose name starts with a dot are never served from the built client folder (a `.env` copied from a
 * public folder would otherwise be published), except `.well-known`, which sites are asked to serve.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createStaticFileServer } from "@devorajs/core";
import { createFixtureProject, type FixtureProject } from "./fixtureApp.js";

describe("dotfiles in the client folder", () => {
  let fixture: FixtureProject;
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    fixture = createFixtureProject();
    const dir = path.join(fixture.projectRoot, "client");
    fs.mkdirSync(path.join(dir, ".well-known"), { recursive: true });
    fs.mkdirSync(path.join(dir, ".git"), { recursive: true });
    fs.mkdirSync(path.join(dir, "docs", ".private"), { recursive: true });
    fs.writeFileSync(path.join(dir, "hello.txt"), "hello");
    fs.writeFileSync(path.join(dir, ".env"), "SECRET=1");
    fs.writeFileSync(path.join(dir, ".git", "config"), "SECRET=2");
    fs.writeFileSync(path.join(dir, ".well-known", "security.txt"), "Contact: mailto:security@example.com");
    fs.writeFileSync(path.join(dir, ".well-known", ".hidden"), "SECRET=3");
    fs.writeFileSync(path.join(dir, "docs", ".private", "a.txt"), "SECRET=4");
    fs.writeFileSync(path.join(dir, "docs", ".htaccess"), "SECRET=5");
    const files = createStaticFileServer(dir);
    server = http.createServer(async (req, res) => {
      const served = await files.serve(req, res, new URL(req.url!, "http://x").pathname, false);
      if (!served) {
        res.statusCode = 404;
        res.end("not found");
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
    fixture.cleanup();
  });

  it("serves an ordinary file", async () => {
    expect(await (await fetch(`${base}/hello.txt`)).text()).toBe("hello");
  });

  it("serves .well-known at the top", async () => {
    expect((await fetch(`${base}/.well-known/security.txt`)).status).toBe(200);
  });

  it.each(["/.env", "/.git/config", "/docs/.private/a.txt", "/docs/.htaccess", "/.well-known/.hidden", "/%2eenv", "/%2e%67it/config", "/docs/%2eprivate/a.txt"])("does not serve %s", async (p) => {
    const res = await fetch(`${base}${p}`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/SECRET=/);
  });
});
