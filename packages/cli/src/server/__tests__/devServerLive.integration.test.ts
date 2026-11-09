/**
 * The own engine (Sekhem) applies these changes to a running dev server WITHOUT stopping it: a route edit in every render mode,
 * a route added or removed, a route's render mode changed, an island edited, an API route edited, added or removed, and a
 * module outside the app (a shared package) edited. Run with DEVORA_TEST_DEV_SERVER=experimental (the module loader hooks are
 * process-wide, so the server runs in a child process; see fixtureApp.bootDevServer). Changes that cannot be applied live (the
 * config files, `.env`, a route file added or removed, which change what the boot summary and the manifests say) are handled by
 * `devora dev` restarting itself with the reason printed; devRestart.test.ts covers which change does what.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { DevServerHandle } from "../../commands/devExperimental.js";
import { createFixtureProject, write, bootDevServer, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
let fixture: FixtureProject;
let dev: DevServerHandle;
let base = "";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetches `url` until `ok(response text, status)` or about 6 s pass; returns the last text and status. */
async function until(url: string, ok: (text: string, status: number) => boolean): Promise<{ text: string; status: number }> {
  let last = { text: "", status: 0 };
  for (let i = 0; i < 60; i++) {
    const res = await fetch(url);
    last = { text: await res.text(), status: res.status };
    if (ok(last.text, last.status)) return last;
    await sleep(100);
  }
  return last;
}

const page = (mode: string, text: string) => `import { createElement } from "react";
export const renderMode = "${mode}";
${mode === "isr" ? "export const revalidate = 1;\n" : ""}export async function loader() { return {}; }
export default function P() { return createElement("p", { id: "t" }, ${JSON.stringify(text)}); }
`;

beforeAll(async () => {
  process.env.NODE_ENV = "development";
  fixture = createFixtureProject();
  const app = fixture.appRoot;
  for (const mode of ["ssr", "csr", "ssg", "isr", "streaming"]) write(path.join(app, "routes", `m-${mode}.tsx`), page(mode, `${mode} v1`));
  write(path.join(app, "routes", "switch.tsx"), page("ssr", "switch v1"));
  write(path.join(app, "components", "Counter.tsx"), "export default function Counter() { return <button>one</button>; }\n");
  write(
    path.join(app, "routes", "island.tsx"),
    `import { island, Island } from "@devorajs/core";
const Counter = island(() => import("../components/Counter"));
export const renderMode = "ssr";
export default function P() { return <Island component={Counter} />; }
`
  );
  // a module outside the app folder, like packages/ui or packages/backend in a project
  write(path.join(fixture.projectRoot, "packages", "shared", "value.ts"), 'export const value = "shared v1";\n');
  write(path.join(app, "routes", "uses-shared.tsx"), `import { createElement } from "react";\nimport { value } from "../../packages/shared/value";\nexport const renderMode = "ssr";\nexport default function P() { return createElement("p", { id: "t" }, value); }\n`);
  write(path.join(app, "api", "live.ts"), 'import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v: 1 }) }));\n');
  write(path.join(app, "island-client.tsx"), 'import { hydrateIslands } from "@devorajs/core/client";\nhydrateIslands();\n');
  dev = await bootDevServer(
    { projectRoot: fixture.projectRoot, app: { name: "fixture", dir: "app", domain: "fixture.example.com" }, appRoot: fixture.appRoot, authMode: "none", appConfig: {}, sessions: undefined, port: 0 },
    "experimental"
  );
  base = `http://127.0.0.1:${(dev.httpServer!.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

describe("Sekhem applies changes live (no restart)", () => {
  for (const mode of ["ssr", "csr", "ssg", "isr", "streaming"]) {
    it(`editing a ${mode} route shows in the next request`, async () => {
      const first = await until(`${base}/m-${mode}`, (t) => t.includes(`${mode} v1`) || mode === "csr");
      expect(first.status).toBe(200);
      write(path.join(fixture.appRoot, "routes", `m-${mode}.tsx`), page(mode, `${mode} v2`));
      if (mode === "csr") {
        // a csr route renders no component on the server: the page is the shell, and the route's module is served fresh
        const mod = await until(`${base}/_devora/m/app/routes/m-csr.tsx`, (t) => t.includes("csr v2"));
        expect(mod.text).toContain("csr v2");
      } else {
        const next = await until(`${base}/m-${mode}`, (t) => t.includes(`${mode} v2`));
        expect(next.text).toContain(`${mode} v2`);
      }
    });
  }

  it("a route file added is served; removed is a 404", async () => {
    expect((await fetch(`${base}/added`)).status).toBe(404);
    write(path.join(fixture.appRoot, "routes", "added.tsx"), page("ssr", "added page"));
    const added = await until(`${base}/added`, (t, s) => s === 200 && t.includes("added page"));
    expect(added.text).toContain("added page");
    fs.rmSync(path.join(fixture.appRoot, "routes", "added.tsx"));
    const gone = await until(`${base}/added`, (_t, s) => s === 404);
    expect(gone.status).toBe(404);
  });

  it("changing a route's render mode changes how it is answered", async () => {
    const before = await until(`${base}/switch`, (t) => t.includes("switch v1"));
    expect(before.text).toContain("switch v1");
    write(path.join(fixture.appRoot, "routes", "switch.tsx"), page("csr", "switch v1"));
    // a csr route's server answer is the shell: the text is no longer rendered into the page
    const after = await until(`${base}/switch`, (t) => !t.includes("switch v1"));
    expect(after.text).not.toContain("switch v1");
  });

  it("an island edited is served from the same URL with the new code", async () => {
    const url = `${base}/_devora/m/app/components/Counter.tsx`;
    expect((await until(url, (t) => t.includes("one"))).text).toContain("one");
    write(path.join(fixture.appRoot, "components", "Counter.tsx"), "export default function Counter() { return <button>two</button>; }\n");
    expect((await until(url, (t) => t.includes("two"))).text).toContain("two");
    // and the server-rendered page shows it too
    expect((await until(`${base}/island`, (t) => t.includes("two"))).text).toContain("two");
  });

  it("an API route edited, added and removed", async () => {
    expect(await (await fetch(`${base}/api/live`)).json()).toEqual({ v: 1 });
    write(path.join(fixture.appRoot, "api", "live.ts"), 'import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v: 2 }) }));\n');
    expect(JSON.parse((await until(`${base}/api/live`, (t) => t.includes('"v":2'))).text)).toEqual({ v: 2 });
    write(path.join(fixture.appRoot, "api", "fresh.ts"), 'import { apiRoute } from "@devorajs/core";\nexport const handler = apiRoute(() => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fresh: true }) }));\n');
    expect(JSON.parse((await until(`${base}/api/fresh`, (t) => t.includes("fresh"))).text)).toEqual({ fresh: true });
    fs.rmSync(path.join(fixture.appRoot, "api", "fresh.ts"));
    expect((await until(`${base}/api/fresh`, (_t, s) => s === 404)).status).toBe(404);
  });

  it("a module outside the app (a shared package) edited shows in the next request", async () => {
    expect((await until(`${base}/uses-shared`, (t) => t.includes("shared v1"))).text).toContain("shared v1");
    write(path.join(fixture.projectRoot, "packages", "shared", "value.ts"), 'export const value = "shared v2";\n');
    expect((await until(`${base}/uses-shared`, (t) => t.includes("shared v2"))).text).toContain("shared v2");
  });
});
