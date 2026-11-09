import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { buildClientBundle, buildServerBundle, replaceIslandPlaceholders } from "../build.js";

const tmp = mkdtempSync(path.join(realpathSync(os.tmpdir()), "devora-build-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const write = (file: string, text: string | Buffer) => {
  mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true });
  writeFileSync(path.join(tmp, file), text);
};

// react resolves from the app, like a real project
const reactDir = path.dirname(createRequire(import.meta.url).resolve("react/package.json"));
mkdirSync(path.join(tmp, "node_modules"), { recursive: true });
symlinkSync(reactDir, path.join(tmp, "node_modules", "react"), "dir");

write("components/Counter.tsx", `export default function Counter() { return <button>count</button>; }`);
write("components/styles.css", `.box { background: url("./dot.png"); color: red }`);
write("components/dot.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
write("components/Card.module.css", `.card { color: blue }`);
write("components/data.ts", `export const files = import.meta.glob("./parts/*.ts", { eager: true });`);
write("components/parts/a.ts", `export const a = 1;`);
write("lib/where.ts", `export const where = import.meta.env.PROD ? "prod" : "dev";`);
write(
  "routes/index.tsx",
  `import "../components/styles.css";
import card from "../components/Card.module.css";
import logo from "../components/dot.png";
import { files } from "../components/data";
import { where } from "@lib/where";
import { island } from "@devorajs/core";
export const marker = JSON.stringify({ card, logo, n: Object.keys(files).length, where, island: island(() => import("../components/Counter")) });
`
);
write("node_modules/@devorajs/core/package.json", `{ "name": "@devorajs/core", "type": "module", "exports": "./index.js" }`);
write("node_modules/@devorajs/core/index.js", `export function island(load, url) { return url; }`);
write("tsconfig.json", `{ "compilerOptions": { "baseUrl": ".", "paths": { "@lib/*": ["lib/*"] }, "jsx": "react-jsx" } }`);

describe("the own engine's production build", () => {
  it("builds the server bundle: named entries, hashed assets, stylesheets under assets/, island placeholders", async () => {
    const out = path.join(tmp, "dist", "server");
    const built = await buildServerBundle({ appRoot: tmp, entries: { "routes/index": path.join(tmp, "routes/index.tsx") }, outDir: out, logLevel: "silent" });
    expect(existsSync(path.join(out, "routes/index.js"))).toBe(true);
    const css = built.routeCss["routes/index"];
    expect(css?.length).toBeGreaterThan(0);
    for (const url of css!) expect(existsSync(path.join(out, url.slice(1)))).toBe(true);
    // the stylesheet's url(...) became an absolute public URL of a file that exists
    const sheet = readFileSync(path.join(out, css![0]!.slice(1)), "utf8");
    const ref = /url\(["']?(\/assets\/dot-[A-Z0-9]{8}\.png)/.exec(sheet)?.[1];
    expect(ref).toBeTruthy();
    expect(existsSync(path.join(out, ref!.slice(1)))).toBe(true);
    const js = readFileSync(path.join(out, "routes/index.js"), "utf8");
    expect(js).toMatch(/"\/assets\/dot-[0-9a-f]{8}\.png"/); // an imported image is its public URL
    expect(js).toContain('"prod"'); // import.meta.env.PROD and the tsconfig path alias
    expect(built.islands.size).toBe(1);
    expect(js).not.toMatch(/__DEVORA_ISLAND_[0-9a-f]{16}__[^"]/); // placeholders only as whole string arguments
    await replaceIslandPlaceholders(out, built.islands, () => "/assets/Counter-X.js");
    expect(readFileSync(path.join(out, "routes/index.js"), "utf8")).toContain("/assets/Counter-X.js");
    expect(readFileSync(path.join(out, "routes/index.js"), "utf8")).not.toContain("__DEVORA_ISLAND_");
    const mod = await import(path.join(out, "routes/index.js"));
    const parsed = JSON.parse(mod.marker);
    expect(parsed.n).toBe(1); // import.meta.glob matched one file
    expect(parsed.card.card).toMatch(/card/);
  });

  it("builds the client bundle: split chunks, hashed names, the public folder, entry URLs", async () => {
    write("public/robots.txt", "ok");
    const out = path.join(tmp, "dist", "client");
    const { urls } = await buildClientBundle({ appRoot: tmp, entries: { "components/Counter": path.join(tmp, "components/Counter.tsx") }, outDir: out, publicDir: path.join(tmp, "public"), logLevel: "silent" });
    const url = urls.get("components/Counter");
    expect(url).toMatch(/^\/assets\/components\/Counter-[A-Z0-9]{8}\.js$/);
    expect(existsSync(path.join(out, url!.slice(1)))).toBe(true);
    expect(readFileSync(path.join(out, "robots.txt"), "utf8")).toBe("ok");
    // an entry keeps its default export even though nothing in the build imports it
    expect(readFileSync(path.join(out, url!.slice(1)), "utf8")).toMatch(/export\{[^}]*as default/);
  });
});
