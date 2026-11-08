#!/usr/bin/env node
// Fast Refresh and HMR in a real Chrome against the experimental dev server: an island keeps its state across a component edit,
// a changed hook resets it instead of breaking it, CSS applies without a reload, a route edit reloads, a syntax error shows the
// overlay and fixing it clears it, a CSR route mounts. Starts the server itself (port 11022) on a temporary project. Every
// response with a status of 400 or more, every failed request, every console error and page error is a failure (no allow-list).
// Needs playwright-core (a devDependency) and Chrome (CHROME_PATH, or the usual install locations).
//   node scripts/dev-server-compare/browser-checks.mjs
import fs from "node:fs";
import path from "node:path";
import { PORT_BROWSER as PORT, chromePath, makeSyntheticProject, sleep, startServer, write } from "./lib.mjs";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("playwright-core is not installed: run `pnpm install` in the repository root");
  process.exit(2);
}

const results = [];
const check = (name, ok, note = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? `  (${note})` : ""}`);
};

const project = makeSyntheticProject({ name: "browser", port: PORT });
write(path.join(project.appDir, "routes", "csr.tsx"), 'import { PageShell } from "@devorajs/core/client";\nexport const renderMode = "csr";\nexport default function Csr() { return <PageShell appName="web"><h1 id="csr-h">csr mounted</h1></PageShell>; }\n');
const css = path.join(project.appDir, "components", "style.css");
const route = path.join(project.appDir, "routes", "index.tsx");
const widget = path.join(project.appDir, "components", "Widget.tsx");
const originals = Object.fromEntries([css, route, widget].map((f) => [f, fs.readFileSync(f, "utf8")]));
let server;
let browser;
const problems = [];
try {
  server = await startServer({ root: project.root, experimental: true, port: PORT });
  browser = await chromium.launch({ executablePath: chromePath(), headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Download the React DevTools/.test(m.text()) && problems.push(`console error: ${m.text()}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
  const base = `http://localhost:${PORT}`;
  const settle = async () => {
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => Object.keys(document.querySelector("[data-island]") ?? {}).some((k) => k.startsWith("__reactContainer")), null, { timeout: 15000 });
    await sleep(300);
  };

  await page.goto(`${base}/`);
  await page.waitForFunction(() => Object.keys(document.querySelector("[data-island]") ?? {}).some((k) => k.startsWith("__reactContainer")), null, { timeout: 15000 });
  check("island hydrates (page, island and dependencies served by the experimental server)", true);
  await page.click("#inc");
  await page.click("#inc");
  await page.evaluate(() => { window.__same = 1; });

  const before = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).color);
  fs.writeFileSync(css, "h1 { color: rgb(1, 2, 3); }\n");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("h1")).color === "rgb(1, 2, 3)", null, { timeout: 10000 });
  check("CSS edit applied without a reload", (await page.evaluate(() => window.__same)) === 1, `${before} -> rgb(1, 2, 3)`);

  fs.writeFileSync(widget, originals[widget].replace("leaf-v1", "leaf-v2"));
  await page.waitForFunction(() => document.querySelector("#leaf")?.textContent === "leaf-v2", null, { timeout: 10000 });
  check("component edit keeps its state (n=2) and the page", (await page.textContent("#inc")) === "n=2" && (await page.evaluate(() => window.__same)) === 1);

  fs.writeFileSync(widget, originals[widget].replace("const [n, setN] = useState(0);", "const [n, setN] = useState(0); const [extra] = useState(5);").replace("n={n}", "n={n}+{extra}"));
  await page.waitForFunction(() => document.querySelector("#inc")?.textContent?.includes("+5"), null, { timeout: 10000 });
  check("adding a hook resets the component's state instead of breaking it", (await page.textContent("#inc")).startsWith("n=0"), await page.textContent("#inc"));
  fs.writeFileSync(widget, originals[widget]);
  await sleep(800);
  await settle();

  fs.writeFileSync(route, originals[route].replace("<h1>browser</h1>", "<h1>browser-edited</h1>"));
  await page.waitForFunction(() => document.querySelector("h1")?.textContent === "browser-edited", null, { timeout: 10000 });
  check("a route-file edit shows after a full reload", (await page.evaluate(() => window.__same)) === undefined);
  await settle(); // the reloaded page finishes loading before the next edit reloads it again (an aborted load is not an error, but it hides one)
  fs.writeFileSync(route, originals[route]);
  await page.waitForFunction(() => document.querySelector("h1")?.textContent === "browser", null, { timeout: 10000 });
  await settle();

  fs.writeFileSync(widget, "export default function Widget( {");
  await page.waitForSelector("#devora-error-overlay", { timeout: 10000 });
  check("a syntax error shows the overlay", true);
  fs.writeFileSync(widget, originals[widget]);
  await page.waitForFunction(() => !document.getElementById("devora-error-overlay"), null, { timeout: 10000 });
  check("fixing it clears the overlay", true);

  await settle();
  const raw = await (await fetch(`${base}/csr`)).text();
  await page.goto(`${base}/csr`);
  await page.waitForSelector("#csr-h", { timeout: 10000 });
  check("a CSR route mounts in the browser (the server sent only the shell)", !raw.includes("csr mounted"));

  check("no failed request, no response of 400 or more, no console or page error (no allow-list)", problems.length === 0, problems.slice(0, 5).join(" | "));
} catch (error) {
  check("the browser checks ran to the end", false, String(error.message ?? error).split("\n")[0]);
} finally {
  for (const [f, text] of Object.entries(originals)) fs.writeFileSync(f, text);
  await browser?.close();
  try { await server?.stop(); } catch (error) { check("the server stopped cleanly", false, error.message); }
  project.cleanup();
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `\nPASS (${results.length} checks)` : `\nFAILED: ${failed} of ${results.length} checks`);
process.exit(failed === 0 ? 0 : 1);
