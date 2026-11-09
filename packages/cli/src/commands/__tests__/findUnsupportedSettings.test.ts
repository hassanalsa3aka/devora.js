import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findUnsupportedSettings } from "../devExperimental.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
function app(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-unsupported-"));
  dirs.push(dir);
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), c);
  return dir;
}

describe("settings the experimental dev server does not honour", () => {
  it("says nothing for the setup the repository's apps use (react() only)", () => {
    const dir = app({ "vite.config.ts": 'import react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()], build: { target: "es2022" } });\n' });
    expect(findUnsupportedSettings(dir, dir)).toEqual([]);
  });

  it("names PostCSS, Tailwind, other plugins, alias, define, proxy and css options", () => {
    const dir = app({
      "postcss.config.js": "module.exports = {};",
      "tailwind.config.ts": "export default {};",
      "vite.config.ts": 'export default defineConfig({ plugins: [react(), svgr()], resolve: { alias: { a: "b" } }, define: { X: 1 }, server: { proxy: {} }, css: { preprocessorOptions: {} } });',
    });
    const found = findUnsupportedSettings(dir, dir).join("\n");
    expect(found).toMatch(/postcss\.config\.js/);
    expect(found).toMatch(/tailwind\.config\.ts/);
    expect(found).toMatch(/plugins other than react\(\)/);
    expect(found).toMatch(/resolve\.alias/);
    expect(found).toMatch(/define/);
    expect(found).toMatch(/server\.proxy/);
    expect(found).toMatch(/css options/);
  });

  it("ignores settings that only appear in comments", () => {
    const dir = app({ "vite.config.ts": "// define: { X: 1 }\n/* plugins: [svgr()] */\nexport default {};" });
    expect(findUnsupportedSettings(dir, dir)).toEqual([]);
  });
});
