/**
 * Round 3 phase 2 in the real dev server: app.config.ts session settings
 * reach `devora dev` (csrf: false, SameSite), dev cookies stay
 * non-Secure/host-only whatever production is configured to do, and an
 * invalid setting fails at boot rather than on the first login.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { ViteDevServer } from "vite";
import type { AppRuntimeConfig, SessionsConfig } from "@devorajs/core";
import { createAppDevServer } from "../../commands/dev.js";
import { findFreePort } from "../devNetwork.js";
import { createFixtureProject, type FixtureProject } from "./fixtureApp.js";

let fixture: FixtureProject;
const servers: ViteDevServer[] = [];

async function boot(appConfig: AppRuntimeConfig, sessions: SessionsConfig, authMode: "shared" | "isolated" = "shared") {
  const server = await createAppDevServer({
    projectRoot: fixture.projectRoot,
    app: { name: "fixture", dir: "app", domain: "app.example.com" },
    appRoot: fixture.appRoot,
    authMode,
    appConfig,
    sessions,
    port: await findFreePort(20000 + Math.floor(Math.random() * 20000), new Set(), "localhost"),
  });
  servers.push(server);
  return `http://localhost:${(server.httpServer!.address() as AddressInfo).port}`;
}

const login = (base: string, transport: string) =>
  fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "u", transport }) });

beforeAll(() => {
  fixture = createFixtureProject();
});

afterAll(async () => {
  await Promise.all(servers.map((s) => s.close()));
  fixture?.cleanup();
});

describe("dev server + session settings", () => {
  it("csrf: false — a Bearer login gets no cookie at all", async () => {
    const base = await boot({ csrf: false }, { store: "memory" });
    const res = await login(base, "bearer");
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([]);
  }, 30_000);

  it("dev keeps cookies non-Secure and host-only even when production is set to Secure + Domain; SameSite applies", async () => {
    const base = await boot(
      { sessions: { cookie: { sameSite: "strict", domain: "example.com", secure: true } } },
      { store: "memory" },
      "isolated"
    );
    const cookies = (await login(base, "cookie")).headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith("devora_session_fixture="))!;
    expect(session).toMatch(/; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+$/);
    expect(session).not.toMatch(/Secure|Domain/);
  }, 30_000);

  it("an invalid setting fails at boot", async () => {
    await expect(boot({ sessions: { cookie: { domain: "other.org" } } }, { store: "memory" }, "isolated")).rejects.toThrow(
      /doesn't cover this app's domain/
    );
  }, 30_000);
});
