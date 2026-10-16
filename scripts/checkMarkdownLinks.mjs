#!/usr/bin/env node
/**
 * Checks every relative link in the repo's tracked *.md files: the target file
 * (or folder) must exist, and a #fragment must match a heading in a markdown
 * target. Absolute http(s) links are not fetched. Exit 1 when any is broken.
 * Usage: node scripts/checkMarkdownLinks.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" }).trim();
const files = execFileSync("git", ["ls-files", "*.md"], { cwd: root, encoding: "utf-8" }).split("\n").filter(Boolean);

const slug = (h) =>
  h.toLowerCase().replace(/[`*_~]/g, "").replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-"); // GitHub: one hyphen per space, no collapsing
const anchors = (file) => {
  const out = new Set();
  let fenced = false;
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    if (/^```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m) out.add(slug(m[1]));
  }
  return out;
};

let broken = 0;
let checked = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  let text = readFileSync(abs, "utf-8").replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const [p, frag] = target.split("#");
    const dest = p ? path.resolve(path.dirname(abs), p) : abs;
    checked++;
    if (!existsSync(dest)) {
      console.log(`BROKEN ${rel}: ${target}`);
      broken++;
      continue;
    }
    if (frag && dest.endsWith(".md") && statSync(dest).isFile() && !anchors(dest).has(frag.toLowerCase())) {
      console.log(`NO ANCHOR ${rel}: ${target}`);
      broken++;
    }
  }
}
console.log(`${checked} relative links in ${files.length} markdown files, ${broken} broken`);
process.exit(broken ? 1 : 0);
