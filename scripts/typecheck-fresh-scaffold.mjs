#!/usr/bin/env node
/**
 * Typechecks brand-new create-devora projects against the packages as they
 * would be published — built, packed tarballs, not the monorepo's .ts
 * sources — so the published .d.ts files are what's being tested. Two real
 * products hit framework type errors in a fresh project (CsrfField not a
 * valid JSX component, entry-server.tsx's React bindings rejected); this is
 * the gate that keeps that fixed.
 *
 * Usage: node scripts/typecheck-fresh-scaffold.mjs [--keep] [--prefer-offline]
 * Needs pnpm on PATH (CI installs it; locally: corepack or `npx pnpm@9.9.0`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");
const preferOffline = process.argv.includes("--prefer-offline");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "devora-fresh-typecheck-"));
const pnpm = process.env.PNPM ?? "pnpm";

function run(cmd, args, cwd) {
  console.log(`$ ${[cmd, ...args].join(" ")}   (in ${path.relative(work, cwd) || cwd})`);
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, NODE_ENV: undefined } });
}

try {
  run(pnpm, ["--filter", "@devorajs/core", "build"], repo);
  run(pnpm, ["--filter", "@devorajs/cli", "build"], repo);
  run(pnpm, ["--filter", "create-devora", "build"], repo);
  const tarballs = path.join(work, "tarballs");
  fs.mkdirSync(tarballs);
  run(pnpm, ["pack", "--pack-destination", tarballs], path.join(repo, "packages", "core"));
  run(pnpm, ["pack", "--pack-destination", tarballs], path.join(repo, "packages", "cli"));
  const tarball = (prefix) => path.join(tarballs, fs.readdirSync(tarballs).find((f) => f.startsWith(prefix)));
  const deps = { "@devorajs/core": `file:${tarball("devorajs-core-")}`, "@devorajs/cli": `file:${tarball("devorajs-cli-")}` };

  for (const [name, args] of [
    ["fullstack", ["--scope=fullstack", "--apps=site,app", "--auth=site:none,app:shared"]],
    ["backend", ["--scope=backend", "--apps=api", "--auth=api:shared"]],
  ]) {
    const create = path.join(repo, "create-devora", "dist", "index.js");
    run(process.execPath, [create, name, ...args, "--pm=pnpm", "--skip-install"], work);
    const project = path.join(work, name);
    // Point every package.json at the packed tarballs instead of npm.
    for (const pkgPath of findPackageJsons(project)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      for (const section of ["dependencies", "devDependencies"]) {
        for (const dep of Object.keys(pkg[section] ?? {})) if (deps[dep]) pkg[section][dep] = deps[dep];
      }
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }
    run(pnpm, ["install", ...(preferOffline ? ["--prefer-offline"] : [])], project);
    run(pnpm, ["run", "typecheck"], project);
    console.log(`✓ fresh "${name}" scaffold typechecks against the published types`);
  }
} finally {
  if (keep) console.log(`kept ${work}`);
  else fs.rmSync(work, { recursive: true, force: true });
}

function findPackageJsons(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPackageJsons(full));
    else if (entry.name === "package.json") out.push(full);
  }
  return out;
}
