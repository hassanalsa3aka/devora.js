/**
 * The experimental dev server serving an app: browser modules (import rewriting, islands, Fast Refresh), dependencies,
 * stylesheets and assets, `public/`, the preamble token, and what a file change means for open browsers. Module loading
 * for pages and API routes (the Node hooks) is covered end to end by the CLI's integration tests, which run the same
 * assertions against Vite and against this server (DEVORA_TEST_DEV_SERVER=experimental).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startExperimentalDevServer, type DevServer } from "../index.js";
import { applyEdits as addEditsForTest, instrumentRefresh, listImports, parseModule, findIslandCalls, scanImports, urlForFile } from "../core.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

let tmp: string;
let app: string;
let dev: DevServer;
const sent: unknown[] = [];

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "devora-devserver-app-"));
  app = path.join(tmp, "app");
  fs.mkdirSync(path.join(app, "components"), { recursive: true });
  fs.mkdirSync(path.join(app, "public"), { recursive: true });
  fs.symlinkSync(path.join(REPO, "apps", "dashboard", "node_modules"), path.join(app, "node_modules"), "dir");
  fs.writeFileSync(path.join(app, "components", "Counter.tsx"), 'import { useState } from "react";\nexport default function Counter() { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>{n}</button>; }\n');
  fs.writeFileSync(path.join(app, "components", "util.ts"), "export const label = 'x';\n");
  fs.writeFileSync(path.join(app, "components", "Both.tsx"), 'export const flag = 1;\nexport function Both() { return <b />; }\n');
  fs.writeFileSync(path.join(app, "components", "Page.tsx"), 'import Counter from "./Counter";\nimport "./page.css";\nimport logo from "./logo.svg";\nimport { label } from "./util";\nexport default function Page() { return <Counter data-logo={logo} data-label={label} />; }\n');
  fs.writeFileSync(path.join(app, "components", "page.css"), "h1{color:red}\n");
  fs.writeFileSync(path.join(app, "components", "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  fs.writeFileSync(path.join(app, "island-client.tsx"), 'import { hydrateIslands } from "@devorajs/core/client";\nhydrateIslands();\n');
  fs.writeFileSync(path.join(app, "routes-island.tsx"), 'import { island } from "@devorajs/core";\nexport const C = island(() => import("./components/Counter"));\n');
  fs.writeFileSync(path.join(app, "public", "hello.txt"), "hello");
  fs.writeFileSync(path.join(app, "public", ".env"), "SECRET=dont-serve-me");
  fs.writeFileSync(path.join(tmp, "outside.svg"), "<svg>outside</svg>");
  fs.symlinkSync(path.join(tmp, "outside.svg"), path.join(app, "public", "link-out.svg"));
  fs.writeFileSync(path.join(app, "public", "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  dev = await startExperimentalDevServer({
    roots: [{ prefix: "/_devora/m/app/", dir: app }],
    env: { NODE_ENV: "development" },
    watch: false,
    app: { appRoot: app, publicDir: path.join(app, "public"), svgCsp: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
  });
  dev.hmr.broadcast = (message: unknown) => void sent.push(message);
}, 60_000);

afterAll(async () => {
  await dev?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function get(pathname: string, headers: Record<string, string> = {}) {
  const res = await fetch(`http://127.0.0.1:${dev.port}${pathname}`, { headers, redirect: "manual" });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

describe("browser modules", () => {
  it("rewrites relative imports to served URLs and bare imports to bundled dependencies, never an absolute path", async () => {
    const r = await get("/_devora/m/app/components/Page.tsx");
    expect(r.status).toBe(200);
    expect(r.body).toContain('from "/_devora/m/app/components/Counter.tsx"');
    expect(r.body).toContain('"/_devora/m/app/components/page.css?import"');
    expect(r.body).toContain('"/_devora/m/app/components/logo.svg?import"');
    expect(r.body).toContain('from "/_devora/deps/react_jsx-runtime.js"');
    expect(r.body).not.toContain(tmp);
    expect(r.body).not.toMatch(/\/Users\/|\/private\/var|\/tmp\//);
  });

  it("serves the dependencies it rewrote to, and a CommonJS package's named imports come from its default export", async () => {
    const counter = await get("/_devora/m/app/components/Counter.tsx");
    expect(counter.body).toMatch(/import __d\d+ from "\/_devora\/deps\/react\.js";const \{ useState \} = __d\d+;/);
    const dep = await get("/_devora/deps/react.js");
    expect(dep.status).toBe(200);
    expect(dep.headers.get("content-type")).toMatch(/javascript/);
    expect((await get("/_devora/deps/nope.js")).status).toBe(404);
    expect((await get("/_devora/deps/..%2f..%2fpackage.json")).status).toBe(404);
  });

  it("wraps components for Fast Refresh and makes a module with only component exports a refresh boundary", async () => {
    const counter = await get("/_devora/m/app/components/Counter.tsx");
    expect(counter.body).toContain("$RefreshReg$(Counter,");
    expect(counter.body).toContain('$RefreshSig$()');
    expect(counter.body).toContain("__devoraHot.accept()");
    const both = await get("/_devora/m/app/components/Both.tsx");
    expect(both.body).toContain("$RefreshReg$(Both,");
    expect(both.body).not.toContain("__devoraHot.accept()"); // exports a non-component: not a boundary
    const util = await get("/_devora/m/app/components/util.ts");
    expect(util.body).not.toContain("$RefreshReg$");
  });

  it("an island call gets the browser URL of its component", async () => {
    const r = await get("/_devora/m/app/routes-island.tsx");
    expect(r.body).toContain('import("/_devora/m/app/components/Counter.tsx"), "/_devora/m/app/components/Counter.tsx"');
  });

  it("a stylesheet or asset import is a module (?import); the file itself is served raw and sandboxed", async () => {
    const css = await get("/_devora/m/app/components/page.css?import");
    expect(css.body).toContain('link.rel = "stylesheet"');
    const raw = await get("/_devora/m/app/components/page.css");
    expect(raw.headers.get("content-type")).toMatch(/^text\/css/);
    expect(raw.body).toBe("h1{color:red}\n");
    expect(raw.headers.get("content-security-policy")).toContain("sandbox");
    const asset = await get("/_devora/m/app/components/logo.svg?import");
    expect(asset.body).toBe('export default "/_devora/m/app/components/logo.svg";');
  });

  it("a syntax error is a 500 naming the problem, not a blank page", async () => {
    fs.writeFileSync(path.join(app, "components", "broken.tsx"), "export default function (");
    const r = await get("/_devora/m/app/components/broken.tsx");
    expect(r.status).toBe(500);
    expect(r.body).toMatch(/broken\.tsx|Unexpected|Expected/);
  });
});

describe("public/", () => {
  it("serves a file at the site root and nothing else: no dotfile, no symlink out of the folder", async () => {
    expect((await get("/hello.txt")).body).toBe("hello");
    expect((await get("/.env")).status).toBe(404);
    expect((await get("/link-out.svg")).status).toBe(404);
    expect((await get("/%2e%2e/outside.svg")).status).toBe(404);
    expect((await get("/hello.txt%00.png")).status).toBe(404);
  });

  it("an svg gets the sandboxing policy", async () => {
    const r = await get("/logo.svg");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox");
  });
});

describe("the preamble carries the launch token", () => {
  it("is served with the token and refused without it", async () => {
    expect(dev.preambleUrl).toMatch(/^\/_devora\/preamble\.js\?token=/);
    const ok = await get(dev.preambleUrl);
    expect(ok.status).toBe(200);
    expect(ok.body).toContain("injectIntoGlobalHook");
    expect(ok.body).toContain(dev.token);
    expect((await get("/_devora/preamble.js")).status).toBe(403);
    expect((await get("/_devora/preamble.js?token=guess")).status).toBe(403);
  });
});

describe("what a change means for open browsers", () => {
  const last = () => sent[sent.length - 1] as { type: string; urls?: string[]; url?: string; message?: string };

  it("a component module that was loaded by the browser is a Fast Refresh update", async () => {
    await get("/_devora/m/app/components/Counter.tsx");
    await dev.changed(path.join(app, "components", "Counter.tsx"));
    expect(last()).toMatchObject({ type: "update", urls: ["/_devora/m/app/components/Counter.tsx"] });
  });

  it("a module with a non-component export bubbles to its importers; with none that accept, a full reload", async () => {
    await get("/_devora/m/app/components/Both.tsx");
    await dev.changed(path.join(app, "components", "Both.tsx"));
    expect(last()).toMatchObject({ type: "full-reload" });
  });

  it("a change in a plain module reaches the component that imports it", async () => {
    await get("/_devora/m/app/components/Page.tsx");
    await dev.changed(path.join(app, "components", "util.ts"));
    expect(last()).toMatchObject({ type: "update", urls: ["/_devora/m/app/components/Page.tsx"] });
  });

  it("a change under a link that points out of the served folders is never read: no error message can quote that file", async () => {
    fs.writeFileSync(path.join(tmp, "outside-broken.tsx"), 'export default function ( { /* SECRET_OUTSIDE_SOURCE */');
    fs.symlinkSync(path.join(tmp, "outside-broken.tsx"), path.join(app, "components", "linked-out.tsx"));
    await dev.changed(path.join(app, "components", "linked-out.tsx"));
    const message = JSON.stringify(last());
    expect(message).not.toContain("SECRET_OUTSIDE_SOURCE");
    expect(last()).toMatchObject({ type: "full-reload" });
  });

  it("a stylesheet change is a css-update, a file the browser never loaded is a full reload, a syntax error goes to the overlay", async () => {
    await dev.changed(path.join(app, "components", "page.css"));
    expect(last()).toMatchObject({ type: "css-update", url: "/_devora/m/app/components/page.css" });
    await dev.changed(path.join(app, "components", "never-requested.tsx"));
    expect(last()).toMatchObject({ type: "full-reload" });
    await dev.changed(path.join(app, "components", "broken.tsx"));
    expect(last().type).toBe("error");
  });
});

describe("the parser rules (core.mjs)", () => {
  it("finds island() calls in every supported shape and refuses the rest", () => {
    const ok = findIslandCalls(parseModule('import { island } from "@devorajs/core";\nconst A = island(() => import("./A"));\nconst B = island(() => import(`./B`), "/x");'));
    expect(ok.supported.map((c: { specifier: string }) => c.specifier)).toEqual(["./A", "./B"]);
    expect(ok.supported[1].alreadyResolved).toBe(true);
    expect(findIslandCalls(parseModule('import { island } from "@devorajs/core";\nconst n = "./A"; island(() => import(n));')).unsupported).toHaveLength(1);
    expect(findIslandCalls(parseModule('import { island } from "./mine";\nisland(() => import("./A"));')).supported).toHaveLength(0);
    expect(findIslandCalls(parseModule('import * as core from "@devorajs/core/client";\ncore.island(() => import("./A"));')).supported).toHaveLength(1);
  });

  it("walks every kind of child node (an island nested in an object, a call and a ternary is found)", () => {
    const code = 'import { island } from "@devorajs/core";\nexport const x = { a: [cond ? island(() => import("./A")) : null] };';
    expect(findIslandCalls(parseModule(code)).supported).toHaveLength(1);
  });

  it("lists static, re-exported and literal dynamic imports", () => {
    const refs = listImports(parseModule('import a from "./a"; export { b } from "./b"; export * from "./c"; const d = import("./d"); const e = import(x);'));
    expect(refs.map((r: { specifier: string }) => r.specifier)).toEqual(["./a", "./b", "./c", "./d"]);
  });

  it("registers components, signs hook use, and decides boundaries", () => {
    const code = 'import { useState } from "react";\nfunction Counter() { const [n] = useState(0); return n; }\nfunction helper() {}\nexport { Counter as default };\n';
    const r = instrumentRefresh(code, parseModule(code));
    expect(r.components).toEqual(["Counter"]);
    expect(r.isBoundary).toBe(true);
    const out = addEditsForTest(code, r.edits);
    expect(out).toContain("_s1();");
    expect(out).toContain('_s1(Counter, "useState(0)", false);');
    const mixed = 'export const flag = 1;\nexport function Both() { return 1; }\n';
    expect(instrumentRefresh(mixed, parseModule(mixed)).isBoundary).toBe(false);
    const memo = 'import { memo } from "react";\nexport const M = memo(function M() { return 1; });\n';
    expect(instrumentRefresh(memo, parseModule(memo)).components).toEqual(["M"]);
  });

  it("scans import specifiers without parsing, and maps files to URLs only inside the roots", () => {
    expect(scanImports('import a from "./a";\nimport type { T } from "./t";\nexport * from "./c";\nconst x = import("./d");\nimport "./e.css";')).toEqual(["./a", "./t", "./c", "./d", "./e.css"]);
    const roots = [{ prefix: "/_devora/m/app/", dir: "/p/app" }, { prefix: "/_devora/m/packages/", dir: "/p/packages" }];
    expect(urlForFile("/p/app/a b.tsx", roots)).toBe("/_devora/m/app/a%20b.tsx");
    expect(urlForFile("/p/packages/x/y.ts", roots)).toBe("/_devora/m/packages/x/y.ts");
    expect(urlForFile("/p/other/y.ts", roots)).toBeUndefined();
    expect(urlForFile("/p/app-secret/y.ts", roots)).toBeUndefined();
  });
});

describe("limits that apply to the app routes too", () => {
  it("a raw request line that tries to leave the module root is refused", async () => {
    const text = await new Promise<string>((resolve) => {
      const socket = net.connect(dev.port, "127.0.0.1", () => socket.write(`GET /_devora/m/app/../../etc/passwd HTTP/1.1\r\nHost: 127.0.0.1:${dev.port}\r\nConnection: close\r\n\r\n`));
      let out = "";
      socket.on("data", (c) => (out += c));
      socket.on("end", () => resolve(out));
    });
    expect(text).not.toMatch(/root:/);
    expect(text.split("\r\n")[0]).toMatch(/ (403|404) /);
  });
});
