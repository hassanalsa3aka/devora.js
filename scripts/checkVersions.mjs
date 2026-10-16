#!/usr/bin/env node
/**
 * Fails when a document or source file names an old version as if it were current, or uses the word
 * "unreleased", outside the places that are about history (CHANGELOG.md, docs/history/, results files).
 *
 *  1. "unreleased": the CHANGELOG has an "Unreleased" heading while a release is being prepared; any other
 *     file that says it is out of date as soon as the release ships.
 *  2. An old version string (0.1.x, 0.2.x, 0.3.0 to 0.3.<current - 1>) on a line that does not read as
 *     history. A line is history when it has a word like before, since, from, up to, through, until,
 *     earlier, was, were, tested, measured, published, ranges, or an arrow. Anything else is flagged:
 *     either update it, or add "version-ok" to the line (a comment, or an HTML comment in Markdown) when it
 *     is deliberately that version.
 *
 * Usage: node scripts/checkVersions.mjs   (exit 1 with the list when something is flagged)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const current = JSON.parse(readFileSync(path.join(root, "packages/core/package.json"), "utf-8")).version;
const [major, minor, patch] = current.split(".").map(Number);

const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf-8" }).split("\n").filter(Boolean);
const SKIP_ALL = [/^CHANGELOG\.md$/, /^docs\/history\//, /^benchmarks\/results\//, /(^|\/)package(-lock)?\.json$/, /pnpm-lock\.yaml$/, /^packages\/cli\/dist\//, /__tests__\//, /^scripts\/checkVersions\.mjs$/, /\.(png|jpg|svg|mp4|webm|ico)$/, /^examples\/[^/]+\/(apps|packages)\//];
const SKIP_OLD_VERSIONS = [/^ROADMAP\.md$/]; // a by-version record: old versions are its content
const TEXT = /\.(md|ts|tsx|mjs|js|sh|yml|yaml|toml)$/;
// 0.1.x to 0.3.x, not part of a longer dotted number (an IP address such as 127.0.0.1 or 0.0.0.0).
const OLD = /(?<![\d.])0\.(?:[1-2]\.\d+|3\.(\d+))(?!\d|\.\d)/g;
const HISTORY = /\b(before|since|from|up to|through|until|earlier|older|prior|was|were|had|used to|first|introduced|added|changed|fixed|replaced|published|tested|measured|ran|run on|captured|history|release notes|pinned|ranges?|tag|and earlier|or later|went|nobody)\b|→|CHANGELOG|version-ok|version: "/i;

const problems = [];
for (const file of files) {
  if (!TEXT.test(file) || SKIP_ALL.some((re) => re.test(file))) continue;
  const lines = readFileSync(path.join(root, file), "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (/version-ok/.test(line)) return;
    if (/unreleased/i.test(line)) problems.push(`${file}:${i + 1}: "unreleased": ${line.trim().slice(0, 110)}`);
    if (SKIP_OLD_VERSIONS.some((re) => re.test(file)) || HISTORY.test(line)) return;
    for (const m of line.matchAll(OLD)) {
      const old = m[1] === undefined ? true : major === 0 && minor === 3 && Number(m[1]) < patch;
      if (old) problems.push(`${file}:${i + 1}: old version ${m[0]} (current is ${current}): ${line.trim().slice(0, 110)}`);
    }
  });
}
if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s). Update the line, or add "version-ok" if it is deliberately that version.`);
  process.exit(1);
}
console.log(`versions: no stale version strings or "unreleased" wording (current ${current}, ${files.length} tracked files scanned)`);
