#!/usr/bin/env node
// An end-to-end check of the desktop window on the machine it runs on (macOS, Windows or Linux with Rust installed): builds a small
// app, runs `devora desktop dev` with DEVORA_DESKTOP_DEBUG=1 so the page reports what it did, and passes only when the window itself
// reported: the app loaded, an island hydrated (a click changed it), window.open returned null, and a _blank link and
// location.assign to another site left the window on the app's own origin. The server then stops itself and the window closes.
// The first run compiles the Tauri crates (several minutes). Usage: node scripts/desktop-check.mjs   (pnpm run check:desktop-window)
import { spawn } from "node:child_process";
import path from "node:path";
import { REPO, makeSyntheticProject, sleep } from "./dev-server-compare/lib.mjs";

const PORT = 11050;
const project = makeSyntheticProject({ name: "desktop", port: 11060 });
const tsx = path.join(REPO, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const child = spawn(tsx, [path.join(REPO, "packages/cli/src/index.ts"), "desktop", "dev", "--experimental", "--app", "web"], {
  cwd: project.root,
  env: { ...process.env, DEVORA_DESKTOP_DEBUG: "1", DEVORA_DESKTOP_EXIT_AFTER_REPORT: "1", PORT: String(PORT), DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef" },
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});
let out = "";
const show = (c) => {
  out += c;
  process.stdout.write(c);
};
child.stdout.on("data", show);
child.stderr.on("data", show);
const code = await new Promise((resolve) => {
  const timer = setTimeout(() => { child.kill("SIGTERM"); resolve("timeout"); }, 25 * 60 * 1000);
  child.on("exit", (c) => { clearTimeout(timer); resolve(c); });
});
await sleep(300);
project.cleanup();
const checks = [
  ["the window opened and the CLI started it", /opening a window for "web"/.test(out)],
  ["no window possible (a prerequisite is missing)", !/NO WINDOW WILL OPEN/.test(out)],
  ["the app page loaded in the window", /page: document complete/.test(out)],
  ["no resource failed to load", !/page: error:/.test(out)],
  ["an island hydrated and a click changed it (n=0 -> n=1)", /island button: n=0 -> n=1/.test(out)],
  ["window.open returned null", /window\.open returns null/.test(out)],
  ["a _blank link and location.assign to another site left the window on the app", /the window is still on http:\/\/127\.0\.0\.1:\d+/.test(out)],
  ["the window closed after the server stopped", /the window closed|the app server stopped/.test(out)],
];
console.log("\n--- desktop window check");
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
if (code === "timeout") { console.log("FAIL  it did not finish within 25 minutes"); failed++; }
console.log(failed === 0 ? "\nPASS" : `\nFAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
