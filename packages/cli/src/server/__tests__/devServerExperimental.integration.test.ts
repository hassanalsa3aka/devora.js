/**
 * The experimental dev server (`devora dev --experimental-dev-server`) in a child process, serving a real app folder: what its
 * module loader does that Vite did for `devora dev` — extensionless and `.js`-for-`.ts` imports, stylesheet and asset imports,
 * island URLs, `import.meta.url`, re-executing the app's modules after an edit, readable stack traces. The assertions every
 * dev server must satisfy run against both servers in the other integration tests (DEVORA_TEST_DEV_SERVER=experimental).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { DevServerHandle } from "../../commands/devExperimental.js";
import { createFixtureProject, write, bootDevServer, type FixtureProject } from "./fixtureApp.js";

const ORIGINAL_ENV = { ...process.env };
let fixture: FixtureProject;
let dev: DevServerHandle;
let base = "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  process.env.NODE_ENV = "development";
  fixture = createFixtureProject();
  const app = fixture.appRoot;
  write(path.join(app, "helpers", "greeting.ts"), 'export const greeting = "hello from a helper";\n');
  write(path.join(app, "helpers", "style.css"), "h1 { color: teal; }\n");
  write(path.join(app, "helpers", "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  write(path.join(app, "helpers", "where.ts"), 'export const here = import.meta.url;\n');
  write(path.join(app, "components", "Counter.tsx"), 'import { useState } from "react";\nexport default function Counter() { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>n={n}</button>; }\n');
  write(
    path.join(app, "routes", "rich.tsx"),
    `import { island, Island } from "@devorajs/core";
import { greeting } from "../helpers/greeting";        // extensionless
import { here } from "../helpers/where.js";             // .js import of a .ts file
import "../helpers/style.css";
import logo from "../helpers/logo.svg";
const CounterIsland = island(() => import("../components/Counter"));
export const renderMode = "ssr";
export default function Rich() {
  return <main><h1>{greeting}</h1><p id="here">{here}</p><img id="logo" src={logo} alt="" /><Island component={CounterIsland} props={{}} /></main>;
}
`
  );
  write(path.join(app, "routes", "throws.tsx"), 'export const renderMode = "ssr";\nexport default function Throws() { throw new Error("boom in throws.tsx"); }\n');
  // dispose callbacks: `db.ts` registers one; `unrelated.ts` is a module nothing in the chain imports
  write(path.join(app, "helpers", "db.ts"), 'import { registerDisposable } from "@devorajs/core";\n(globalThis as any).__log ??= [];\n(globalThis as any).__log.push("db opened");\nregisterDisposable(import.meta.url, () => (globalThis as any).__log.push("db disposed"));\nexport const handle = "db-v1";\n');
  write(path.join(app, "helpers", "unrelated.ts"), 'export const noise = "n1";\n');
  write(path.join(app, "routes", "disposal.tsx"), 'import { handle } from "../helpers/db";\nimport { noise } from "../helpers/unrelated";\nexport const renderMode = "ssr";\nexport default function Disposal() { return <p id="d">{handle}|{noise}|{((globalThis as any).__log as string[]).join(",")}</p>; }\n');
  // tsconfig paths, CSS modules, import.meta.glob
  write(path.join(app, "tsconfig.json"), '{ // comments are allowed\n "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] }, }, }\n');
  write(path.join(app, "helpers", "box.module.css"), ".box { color: green; }\n");
  write(path.join(app, "helpers", "g-one.ts"), 'export const name = "one";\n');
  write(path.join(app, "helpers", "g-two.ts"), 'export const name = "two";\n');
  write(
    path.join(app, "routes", "features.tsx"),
    `import { greeting } from "@/helpers/greeting";
import styles from "../helpers/box.module.css";
const found = import.meta.glob("../helpers/g-*.ts", { eager: true, import: "name" });
export const renderMode = "ssr";
export default function Features() {
  return <p id="f" className={styles.box}>{greeting}|{Object.values(found).join(",")}|{styles.box}</p>;
}
`
  );
  write(path.join(app, "island-client.tsx"), 'import { hydrateIslands } from "@devorajs/core/client";\nhydrateIslands();\n');
  dev = await bootDevServer(
    {
      projectRoot: fixture.projectRoot,
      app: { name: "fixture", dir: "app", domain: "fixture.example.com" },
      appRoot: fixture.appRoot,
      authMode: "none",
      appConfig: {},
      sessions: undefined,
      port: 0,
    },
    "experimental"
  );
  base = `http://127.0.0.1:${(dev.httpServer!.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  await dev?.close();
  fixture?.cleanup();
  process.env = { ...ORIGINAL_ENV };
});

describe("experimental dev server — what its module loader does", () => {
  it("renders a page whose imports are extensionless, `.js` for a `.ts` file, a stylesheet and an image", async () => {
    const res = await fetch(`${base}/rich`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("hello from a helper");
    expect(html).toContain('id="logo" src="/_devora/m/app/helpers/logo.svg"');
    expect(html).toContain('<link rel="stylesheet" href="/_devora/m/app/helpers/style.css"');
  });

  it("import.meta.url in an app module is its real file URL, not the loader's internal one", async () => {
    const html = await (await fetch(`${base}/rich`)).text();
    const here = /id="here">([^<]*)</.exec(html)?.[1] ?? "";
    expect(here).toMatch(/^file:\/\/.*helpers\/where\.ts$/);
    expect(here).not.toContain("devora-src");
  });

  it("an island's browser URL is a served module URL; the page loads the preamble (token) and the island client from the same server", async () => {
    const html = await (await fetch(`${base}/rich`)).text();
    expect(html).toContain('data-island-url="/_devora/m/app/components/Counter.tsx"');
    expect(html).toMatch(/<script type="module" src="\/_devora\/preamble\.js\?token=[\w-]+"/);
    expect(html).toContain('src="/_devora/m/app/island-client.tsx"');
    expect(html).not.toContain("/@fs/");
    const module = await fetch(`${base}/_devora/m/app/components/Counter.tsx`);
    expect(module.status).toBe(200);
  });

  it("an error thrown while rendering is a 500 page that names the error and the file", async () => {
    const res = await fetch(`${base}/throws`);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).toContain("boom in throws.tsx");
    expect(text).toContain("routes/throws.tsx");
  });

  it("an edit to an app module is picked up by the next request (the module graph is re-executed)", async () => {
    write(path.join(fixture.appRoot, "helpers", "greeting.ts"), 'export const greeting = "changed greeting";\n');
    let html = "";
    for (let i = 0; i < 40 && !html.includes("changed greeting"); i++) {
      await sleep(100);
      html = await (await fetch(`${base}/rich`)).text();
    }
    expect(html).toContain("changed greeting");
  });

  it("dispose callbacks run for the modules that run again, and only those", async () => {
    const read = async () => /id="d">([^<]*)</.exec((await (await fetch(`${base}/disposal`)).text()).replaceAll("<!-- -->", ""))?.[1] ?? "";
    expect(await read()).toBe("db-v1|n1|db opened");
    write(path.join(fixture.appRoot, "helpers", "unrelated.ts"), 'export const noise = "n2";\n');
    let seen = "";
    for (let i = 0; i < 40 && !seen.includes("n2"); i++) {
      await sleep(100);
      seen = await read();
    }
    expect(seen).toBe("db-v1|n2|db opened"); // db.ts did not run again and was not disposed
    write(path.join(fixture.appRoot, "helpers", "db.ts"), (await import("node:fs")).readFileSync(path.join(fixture.appRoot, "helpers", "db.ts"), "utf8").replace("db-v1", "db-v2"));
    for (let i = 0; i < 40 && !seen.includes("db-v2"); i++) {
      await sleep(100);
      seen = await read();
    }
    expect(seen).toBe("db-v2|n2|db opened,db disposed,db opened"); // disposed once, then opened once more
  });

  it("tsconfig path aliases, CSS modules and import.meta.glob work on the server and in the page", async () => {
    const html = (await (await fetch(`${base}/features`)).text()).replaceAll("<!-- -->", "");
    const text = /id="f"[^>]*>([^<]*)</.exec(html)?.[1] ?? "";
    const [greetingText, globbed, cls] = text.split("|");
    expect(greetingText).toBeTruthy(); // "@/helpers/greeting" resolved through the tsconfig path
    expect(globbed).toBe("one,two"); // import.meta.glob matched both files
    expect(cls).toMatch(/box/);
    expect(cls).not.toBe("box"); // the class name was made unique
    expect(html).toContain(`class="${cls}"`);
    expect(html).toContain('<link rel="stylesheet" href="/_devora/m/app/helpers/box.module.css"');
    const css = await (await fetch(`${base}/_devora/m/app/helpers/box.module.css`)).text();
    expect(css).toContain(`.${cls}`);
    expect(css).not.toMatch(/\.box\b/);
    const asModule = await (await fetch(`${base}/_devora/m/app/helpers/box.module.css?import`)).text();
    expect(asModule).toContain(`"box":"${cls}"`);
    const clientRoute = await (await fetch(`${base}/_devora/m/app/routes/features.tsx`)).text();
    expect(clientRoute).toContain('"/_devora/m/app/helpers/greeting.ts"'); // the alias became a served URL
    expect(clientRoute).toContain('"/_devora/m/app/helpers/g-one.ts"'); // the glob became imports of served URLs
    expect(clientRoute).not.toContain("import.meta.glob");
  });
});
