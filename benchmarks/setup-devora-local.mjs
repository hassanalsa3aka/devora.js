#!/usr/bin/env node
// Creates apps/devora-vite and apps/devora-sekhem: copies of apps/devora-api that run THIS repository's CLI from source
// (build with --engine=vite or --engine=own) instead of the published packages, so the benchmark can compare the two engines
// of the same commit. node_modules is a link to the repository's; only generated folders, never committed (see .gitignore).
//   node setup-devora-local.mjs        (run once after `pnpm install` at the repository root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const source = path.join(here, "apps", "devora-api");
const TSX = path.join(repo, "node_modules", ".bin", "tsx");
const CLI_SRC = path.join(repo, "packages", "cli", "src", "index.ts");
const CLI_DIST = path.join(repo, "packages", "cli", "dist", "index.js");
const CLI_LAUNCHER = path.join(repo, "packages", "cli", "dist", "devora.js");
for (const [key, engine] of [["devora-vite", "vite"], ["devora-sekhem", "own"]]) {
  const dest = path.join(here, "apps", key);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, { recursive: true, filter: (s) => !["node_modules", "dist", "package-lock.json"].includes(path.basename(s)) });
  // The Vite engine runs the compiled CLI; Sekhem's build runs from source through tsx (its package exports TypeScript in the repository).
  const run = engine === "own" ? `${TSX} ${CLI_SRC}` : `node ${CLI_DIST}`;
  fs.writeFileSync(
    path.join(dest, "package.json"),
    JSON.stringify({ name: `bench-${key}`, private: true, version: "0.1.0", scripts: { build: `${run} build --engine=${engine}`, start: `node ${CLI_LAUNCHER} start` } }, null, 2) + "\n"
  );
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(dest, "node_modules"));
  const appModules = path.join(dest, "apps", "api", "node_modules", "@devorajs");
  fs.mkdirSync(appModules, { recursive: true });
  fs.symlinkSync(path.join(dest, "packages", "backend"), path.join(appModules, "backend"));
  // the app's vite.config.ts imports "vite": resolve it the way the repository's own apps do
  fs.symlinkSync(fs.realpathSync(path.join(repo, "apps", "api-only", "node_modules", "vite")), path.join(dest, "apps", "api", "node_modules", "vite"));
  console.log(`${key}: ${engine}`);
}

// The pages benchmark (run.mjs): the same two engines on apps/devora (a static page, a server-rendered page with an island, a form).
const pagesSource = path.join(here, "apps", "devora");
for (const [key, engine] of [["devora-pages-vite", "vite"], ["devora-pages-sekhem", "own"]]) {
  const dest = path.join(here, "apps", key);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(pagesSource, dest, { recursive: true, filter: (s) => !["node_modules", "dist", "package-lock.json"].includes(path.basename(s)) });
  const run = engine === "own" ? `${TSX} ${CLI_SRC}` : `node ${CLI_DIST}`;
  fs.writeFileSync(
    path.join(dest, "package.json"),
    JSON.stringify({ name: `bench-${key}`, private: true, version: "0.1.0", scripts: { build: `${run} build --engine=${engine}`, start: `node ${CLI_LAUNCHER} start` } }, null, 2) + "\n"
  );
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(dest, "node_modules"));
  // the app's own folder resolves what the repository's apps resolve: react, react-dom, vite and the React plugin
  const appModules = path.join(dest, "apps", "bench", "node_modules");
  fs.mkdirSync(path.join(appModules, "@vitejs"), { recursive: true });
  const dash = path.join(repo, "apps", "dashboard", "node_modules");
  for (const name of ["react", "react-dom", "vite"]) fs.symlinkSync(fs.realpathSync(path.join(dash, name)), path.join(appModules, name));
  fs.symlinkSync(fs.realpathSync(path.join(dash, "@vitejs", "plugin-react")), path.join(appModules, "@vitejs", "plugin-react"));
  console.log(`${key}: ${engine}`);
}
