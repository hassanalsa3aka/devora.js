/**
 * A throwaway devora app on disk for the integration tests — real route
 * files, loaded by the real dev server / production handler, not mocks.
 * Written into a temp dir with `node_modules` symlinked to a real app's
 * (apps/dashboard: react, react-dom, vite, @devorajs/core), so imports
 * resolve exactly the way they do for a real app in this monorepo.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

/** API route sources — plain TS, no JSX, importing the real @devorajs/core. */
export const API_ROUTES: Record<string, string> = {
  // Mobile/API login: returns the opaque session ID in the body.
  "login.ts": `
import { apiRoute, HttpError } from "@devorajs/core";
export const methods = ["POST"];
export const handler = apiRoute(async (req, ctx) => {
  const body = JSON.parse(req.body.toString("utf-8") || "{}");
  if (!body.userId) throw new HttpError(400, "userId required");
  const transport = body.transport === "cookie" ? "cookie" : "bearer";
  const token = await ctx.setSession({ userId: body.userId }, { transport });
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) };
});`,
  "me.ts": `
import { apiRoute } from "@devorajs/core";
export const handler = apiRoute((_req, ctx) => {
  ctx.requireAuth();
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: ctx.session, transport: ctx.sessionTransport }),
  };
});`,
  // A state-changing endpoint: requires auth AND CSRF (the header form).
  "transfer.ts": `
import { apiRoute, CSRF_HEADER_NAME } from "@devorajs/core";
export const methods = ["POST"];
export const handler = apiRoute((req, ctx) => {
  ctx.requireAuth();
  const token = req.headers[CSRF_HEADER_NAME];
  ctx.verifyCsrf(typeof token === "string" ? token : "");
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
});`,
  "logout.ts": `
import { apiRoute } from "@devorajs/core";
export const methods = ["POST"];
export const handler = apiRoute(async (_req, ctx) => {
  ctx.requireAuth();
  await ctx.revokeSession();
  return { status: 204 };
});`,
  "boom.ts": `
import { apiRoute } from "@devorajs/core";
export const handler = apiRoute(() => { throw new Error("kaboom from a handler"); });`,
  // Exported WITHOUT apiRoute() — the dispatcher has to catch this one.
  "unwrapped.ts": `
export const handler = () => { throw new Error("kaboom without apiRoute"); };`,
  "teapot.ts": `
import { apiRoute, HttpError } from "@devorajs/core";
export const handler = apiRoute(() => { throw new HttpError(418, "short and stout"); });`,
  // A route module that fails to even load.
  "broken-import.ts": `
import { doesNotExist } from "./nowhere-at-all.js";
export const handler = () => doesNotExist();`,
};

/** Page routes — createElement, no JSX, so no React plugin is needed. */
export const PAGE_ROUTES: Record<string, string> = {
  "index.ts": `
import { createElement } from "react";
export const renderMode = "ssr";
export default function Home() { return createElement("h1", null, "fixture home"); }`,
  "page-boom.ts": `
import { createElement } from "react";
export const renderMode = "ssr";
export async function loader() { throw new Error("kaboom from a page loader"); }
export default function PageBoom() { return createElement("p", null, "never"); }`,
};

const ENTRY_SERVER = `
import { createElement } from "react";
import { renderToString, renderToPipeableStream } from "react-dom/server";
import { createRenderRoute, createRenderStatic, createRenderStreaming } from "@devorajs/core";
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
export const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
`;

export interface FixtureProject {
  projectRoot: string;
  appRoot: string;
  cleanup: () => void;
}

export function createFixtureProject(): FixtureProject {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "devora-fixture-"));
  const appRoot = path.join(projectRoot, "app");
  write(path.join(appRoot, "vite.config.ts"), "export default {};\n");
  write(path.join(appRoot, "entry-server.tsx"), ENTRY_SERVER);
  for (const [file, source] of Object.entries(API_ROUTES)) write(path.join(appRoot, "api", file), source);
  for (const [file, source] of Object.entries(PAGE_ROUTES)) write(path.join(appRoot, "routes", file), source);
  fs.symlinkSync(path.join(REPO_ROOT, "apps", "dashboard", "node_modules"), path.join(appRoot, "node_modules"), "dir");
  return { projectRoot, appRoot, cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }) };
}

export function write(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

export function setCookieValue(res: Response, name: string): string | undefined {
  for (const cookie of res.headers.getSetCookie()) {
    if (cookie.startsWith(`${name}=`)) return cookie.split(";")[0]!.slice(name.length + 1);
  }
  return undefined;
}

/**
 * Boots one app's dev server for a test. By default the real `devora dev` server (Vite); with
 * DEVORA_TEST_DEV_SERVER=experimental, the experimental dev server in a child process (its module loader hooks are
 * process-wide, so it does not share this test runner's process). Same shape either way.
 */
export async function bootDevServer(options: import("../../commands/dev.js").AppDevServerOptions, force?: "experimental"): Promise<import("../../commands/devExperimental.js").DevServerHandle> {
  if (force !== "experimental" && process.env.DEVORA_TEST_DEV_SERVER !== "experimental") {
    const { createAppDevServer } = await import("../../commands/dev.js");
    return createAppDevServer(options);
  }
  const { spawn } = await import("node:child_process");
  const { findFreePort } = await import("../devNetwork.js");
  // Test files run in parallel and each picks a port in 11010-11079: a clash (EADDRINUSE) is retried on another port.
  let port = 0;
  let child!: ReturnType<typeof spawn>;
  let output = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    port = await findFreePort(11010 + Math.floor(Math.random() * 70), new Set(), "127.0.0.1");
    child = spawn(path.join(REPO_ROOT, "node_modules", ".bin", "tsx"), [path.join(REPO_ROOT, "packages/cli/src/server/__tests__/experimentalHarness.ts"), JSON.stringify({ ...options, port })], {
      env: { ...process.env, NODE_ENV: "development" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    output = "";
    const started = await new Promise<"ready" | "in-use" | "failed">((resolve) => {
      const timer = setTimeout(() => resolve("failed"), 25_000);
      const onData = (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes("READY")) {
          clearTimeout(timer);
          resolve("ready");
        }
      };
      child.stdout!.on("data", onData);
      child.stderr!.on("data", (c) => (output += c.toString()));
      child.on("exit", () => {
        clearTimeout(timer);
        resolve(output.includes("EADDRINUSE") ? "in-use" : "failed");
      });
    });
    if (started === "ready") break;
    child.removeAllListeners("exit");
    child.kill("SIGTERM");
    if (started === "failed") throw new Error(`experimental dev server did not start:\n${output}`);
    if (attempt === 5) throw new Error(`experimental dev server: no free port after 6 tries:\n${output}`);
  }
  child.removeAllListeners("exit");
  return {
    httpServer: { address: () => ({ address: "127.0.0.1", family: "IPv4", port }) },
    config: { server: { port } },
    close: () =>
      new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
        child.kill("SIGTERM");
      }),
  };
}
