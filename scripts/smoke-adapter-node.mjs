#!/usr/bin/env node
/**
 * Installs @devorajs/adapter-node the way a user gets it — the packed
 * tarball, in an empty folder outside this repo — and imports it with plain
 * Node. Catches a package that only works inside the monorepo: exports
 * still pointing at src/*.ts, a missing dist file, an undeclared dependency.
 *
 * @devorajs/core is packed alongside it, since the adapter depends on a core
 * version that may not be on npm yet.
 *
 * Usage: node scripts/smoke-adapter-node.mjs [--keep]
 * Needs pnpm on PATH (packing must apply publishConfig, which npm pack
 * ignores) and npm for the install.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "devora-adapter-node-smoke-"));
const pnpm = process.env.PNPM ?? "pnpm";

function run(cmd, args, cwd) {
  console.log(`$ ${[cmd, ...args].join(" ")}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

try {
  const tarballs = path.join(work, "tarballs");
  fs.mkdirSync(tarballs);
  for (const pkg of ["packages/core", "adapters/adapter-node"]) {
    const dir = path.join(repo, pkg);
    fs.rmSync(path.join(dir, "dist"), { recursive: true, force: true });
    run(pnpm, ["run", "build"], dir);
    run(pnpm, ["pack", "--pack-destination", tarballs], dir);
  }
  const tarball = (prefix) => path.join(tarballs, fs.readdirSync(tarballs).find((f) => f.startsWith(prefix)));

  const app = path.join(work, "app");
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, "package.json"), JSON.stringify({ name: "smoke", private: true, type: "module" }));
  run("npm", ["install", "--no-audit", "--no-fund", tarball("devorajs-core-"), tarball("devorajs-adapter-node-")], app);

  const installed = path.join(app, "node_modules", "@devorajs", "adapter-node");
  const pkg = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf-8"));
  const files = fs.readdirSync(installed);
  if (files.includes("src")) throw new Error("the tarball ships src/ — it should only contain dist/");
  if (!fs.existsSync(path.join(installed, "dist", "index.d.ts"))) throw new Error("the tarball has no dist/index.d.ts");
  if (pkg.exports["."].default !== "./dist/index.js") {
    throw new Error(`exports points at ${JSON.stringify(pkg.exports["."])} — pack with pnpm so publishConfig applies`);
  }

  // Plain Node, from the empty folder: import it and check the public export.
  fs.writeFileSync(
    path.join(app, "smoke.mjs"),
    'import { createNodeServer } from "@devorajs/adapter-node";\n' +
      'if (typeof createNodeServer !== "function") throw new Error("createNodeServer is not a function");\n' +
      'console.log("createNodeServer:", typeof createNodeServer);\n'
  );
  run(process.execPath, ["smoke.mjs"], app);
  console.log(`✓ @devorajs/adapter-node@${pkg.version} installs from its tarball and imports with plain Node`);
} finally {
  if (keep) console.log(`kept ${work}`);
  else fs.rmSync(work, { recursive: true, force: true });
}
