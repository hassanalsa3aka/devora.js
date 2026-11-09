#!/usr/bin/env node
/**
 * The documentation site's address is written in docs-site.json and nowhere else it can drift from: this script finds every
 * place the repository repeats it (README files, the adapters' and the scaffold's links) and either checks that they all
 * match (`--check`, part of `pnpm run check:docs`) or switches them all to a new address.
 *   node scripts/docsSiteUrl.mjs --check
 *   node scripts/docsSiteUrl.mjs https://docs.example.com     (rewrites the files and docs-site.json; the packages' dist/ folders are rebuilt by the build)
 * A site address inside a file that is built (a dist folder) is not edited here; rebuild after switching.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "docs-site.json");
const current = JSON.parse(readFileSync(configPath, "utf8")).url.replace(/\/+$/, "");
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/(^|\/)(dist|node_modules)\//.test(f) && !/\.(png|jpg|ico|woff2?|lock|yaml)$/.test(f) && f !== "docs-site.json" && !/package-lock\.json$/.test(f));
const mentions = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(path.join(root, f), "utf8");
  } catch {
    continue;
  }
  if (text.includes(current)) mentions.push(f);
}
const arg = process.argv[2];
if (arg === "--check" || arg === undefined) {
  // every https://*.vercel.app docs link must be the configured one
  const stray = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(path.join(root, f), "utf8"); } catch { continue; }
    for (const m of text.matchAll(/https:\/\/devorajs-docs[\w.-]*\.vercel\.app/g)) if (m[0] !== current) stray.push(`${f}: ${m[0]}`);
  }
  if (stray.length > 0) {
    console.error(`docs address differs from docs-site.json (${current}):\n  ${stray.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`docs address: ${mentions.length} files use ${current}, none differ`);
} else {
  const next = arg.replace(/\/+$/, "");
  if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(next)) {
    console.error("give an https address without a path, e.g. https://docs.example.com");
    process.exit(1);
  }
  for (const f of mentions) writeFileSync(path.join(root, f), readFileSync(path.join(root, f), "utf8").split(current).join(next));
  writeFileSync(configPath, JSON.stringify({ url: next }, null, 2) + "\n");
  console.log(`switched ${mentions.length} files from ${current} to ${next}; rebuild the packages (pnpm run build) so dist/ follows`);
}
