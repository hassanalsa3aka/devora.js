#!/usr/bin/env node
/**
 * Release day for Devora.js 0.4.0, framework side. One argument, the publishing date:
 *
 *   node scripts/release-day.mjs 2026-11-20                  fill the date in, then print the publish plan
 *   node scripts/release-day.mjs 2026-11-20 --dry-run        show what would change; write nothing
 *   node scripts/release-day.mjs 2026-11-20 --notes out.md   also write the GitHub release notes to a file
 *
 * It edits text only (it runs no build, no npm, no git and publishes nothing):
 *   - CHANGELOG.md: the heading "## 0.4.0 — DATE-TO-FILL" gets the date;
 *   - ROADMAP.md: the 0.4.0 timeline heading gets the date, its CHANGELOG link gets the new anchor
 *     (GitHub turns "## 0.4.0 — 2026-11-20" into "#040--2026-11-20"), the "prepared, not published" wording goes, and the
 *     "Publish 0.4.0" item under Now becomes "verify 0.4.0 on a live deployment";
 *   - CLAUDE.md: "the release is 0.4.0 once published" becomes "the release is 0.4.0";
 * then runs the repository's link and version checks (they fail if an anchor or a version is wrong), and PRINTS the
 * exact commands for the rest of the day: build and check each package, the publish order, the fresh-folder check,
 * the example and benchmark lockfiles, the tag, and the GitHub release notes (generated from the CHANGELOG entry).
 * Every text edit names the text it expects; if a file changed and the text is gone it stops and says which. A second
 * run with the same date changes nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const notesIndex = args.indexOf("--notes");
const notesFile = notesIndex === -1 ? undefined : args[notesIndex + 1];
const notesValueIndex = notesIndex === -1 ? -1 : notesIndex + 1;
const date = args.find((a, i) => !a.startsWith("--") && i !== notesValueIndex);
const DRY = args.includes("--dry-run");

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
  console.error("usage: node scripts/release-day.mjs <YYYY-MM-DD> [--dry-run] [--notes <file>]   (a real date, the day 0.4.0 is published)");
  process.exit(2);
}
if (notesIndex !== -1 && !notesFile) {
  console.error("--notes needs a file name");
  process.exit(2);
}
const VERSION = "0.4.0";
const ANCHOR = `040--${date}`;
const PACKAGES = [
  { dir: "packages/core", name: "@devorajs/core", version: "0.4.0" },
  { dir: "adapters/adapter-node", name: "@devorajs/adapter-node", version: "0.3.0" },
  { dir: "adapters/adapter-vercel", name: "@devorajs/adapter-vercel", version: "0.3.0" },
  { dir: "adapters/adapter-netlify", name: "@devorajs/adapter-netlify", version: "0.3.0" },
  { dir: "packages/cli", name: "@devorajs/cli", version: "0.4.0" },
  { dir: "create-devora", name: "create-devora", version: "0.4.0" },
];

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const changed = [];
function write(p, text) {
  if (read(p) === text) return;
  changed.push(p);
  if (!DRY) fs.writeFileSync(path.join(root, p), text);
}
/** Replaces `from` with `to`; skips an edit already in place (checked first); throws when neither text is there. */
function edit(file, pairs) {
  let s = read(file);
  for (const { from, to } of pairs) {
    if (s.includes(to)) continue;
    if (s.includes(from)) s = s.replace(from, () => to);
    else throw new Error(`${file}: expected text not found, the file changed since this script was written:\n${from.slice(0, 200)}`);
  }
  write(file, s);
}
/** Replaces the whole line that starts with `prefix` with `line` (or leaves it if `line` is already there). */
function editLine(file, prefix, line) {
  const lines = read(file).split("\n");
  if (lines.includes(line)) return;
  const i = lines.findIndex((l) => l.startsWith(prefix));
  if (i === -1) throw new Error(`${file}: no line starts with: ${prefix}`);
  lines[i] = line;
  write(file, lines.join("\n"));
}

console.log(`Release day for Devora.js ${VERSION}, dated ${date}${DRY ? " (dry run: nothing is written)" : ""}\n`);

edit("CHANGELOG.md", [{ from: `## ${VERSION} — DATE-TO-FILL`, to: `## ${VERSION} — ${date}` }]);
edit("ROADMAP.md", [
  { from: `### ${VERSION} — date to fill when published (tag \`v${VERSION}\` after publishing)`, to: `### ${VERSION} — ${date} (tag \`v${VERSION}\`)` },
  { from: "(CHANGELOG.md#040--date-to-fill)", to: `(CHANGELOG.md#${ANCHOR})` },
  { from: "Prepared, not published: until it is on npm, 0.3.5 is the release. A security hardening release:", to: "A security hardening release:" },
]);
editLine(
  "ROADMAP.md",
  "- **Publish 0.4.0**",
  "- **Verify 0.4.0 on a live Vercel and Netlify deployment** with sessions and API routes (finding N1): the generated output was checked locally only."
);
edit("CLAUDE.md", [{ from: `the release is ${VERSION} once published (0.3.5 is the one on npm until then);`, to: `the release is ${VERSION};` }]);

console.log(`${DRY ? "Would change" : "Changed"} ${new Set(changed).size} file(s): ${[...new Set(changed)].join(", ") || "(nothing)"}`);

if (!DRY) {
  for (const script of ["scripts/checkMarkdownLinks.mjs", "scripts/checkVersions.mjs"]) {
    try {
      console.log(execFileSync("node", [script], { cwd: root, encoding: "utf8" }).trim().split("\n").pop());
    } catch (err) {
      console.error(`\n${script} FAILED:\n${err.stdout || err.message}`);
      process.exit(1);
    }
  }
}

// The GitHub release notes: the CHANGELOG entry for this version, without its heading.
const changelog = read("CHANGELOG.md");
const start = changelog.indexOf(`## ${VERSION} — `);
const end = changelog.indexOf("\n## ", start + 5);
if (start === -1) throw new Error("CHANGELOG.md has no 0.4.0 entry");
const notes = changelog.slice(changelog.indexOf("\n", start) + 1, end === -1 ? undefined : end).trim() + "\n";
if (notesFile && !DRY) {
  fs.writeFileSync(path.resolve(notesFile), notes);
  console.log(`release notes written to ${path.resolve(notesFile)} (${notes.length} characters)`);
}

const bar = "=".repeat(78);
console.log(`
${bar}
THE REST OF THE DAY. Nothing below has been run. Run from the repository root, on main, after the
release/0.4.0 and chore/release-day-0.4.0 branches are merged and this script's edits are committed.
${bar}

1. Check the state
   git status --short          # must print nothing
   git log --oneline -1        # the commit you are about to publish from
   pnpm --version              # 9.x (CONTRIBUTING.md); the lockfile is pnpm 9's
   npm whoami                  # logged in as the maintainer; publishing asks for the one-time code
   CI=true pnpm install --frozen-lockfile

2. Build and check every package first (nothing is published yet)
${PACKAGES.map((p) => `   pnpm --filter ${p.name} run build\n   node scripts/checkPublishable.mjs ${p.dir}`).join("\n")}
   node scripts/checkPackContents.mjs
   pnpm run test && pnpm run check:docs

3. Publish, one package at a time, in THIS order (core first: the adapters depend on it). After each one, wait for the
   npm view line to print the new version before you continue.
${PACKAGES.map((p, i) => `   (cd ${p.dir} && pnpm publish --access public --no-git-checks)\n   npm view ${p.name}@${p.version} version`).join("\n")}

4. Install the published packages into a fresh folder (this is the first check of what users get)
   cd "$(mktemp -d)" && npm create devora@latest rd-check -- --scope=fullstack --apps=site,app --auth=site:none,app:shared --pm=npm
   cd rd-check
   npm ls @devorajs/core @devorajs/cli        # both ${VERSION}
   npm run typecheck && npm run build
   # devora start needs a session store: set  sessions: { store: "memory" }  under shared in devora.config.ts
   DEVORA_SESSION_SECRET="$(openssl rand -base64 32)" npm run start     # open the printed URLs, sign in at /login
   # then the same with pnpm: pnpm create devora@latest, and with Yarn 4 (corepack): yarn dlx create-devora

5. Refresh the lockfiles that still resolve 0.3.5 (the examples and the benchmark apps)
   for d in examples/multi-app examples/api-bearer examples/content-site examples/realtime examples/background-jobs; do
     (cd $d && npm install && npm run typecheck && npm run build) || break
   done
   for d in benchmarks/apps/devora benchmarks/apps/devora-api; do (cd $d && npm install); done
   git add examples/*/package-lock.json benchmarks/apps/*/package-lock.json
   git commit -m "examples, benchmarks: lockfiles resolve ${VERSION}"
   # the examples CI job runs npm ci against these lockfiles; push and watch it

6. Tag and push
   git tag -a v${VERSION} -m "Devora.js ${VERSION}" HEAD
   git push origin main
   git push origin v${VERSION}

7. GitHub release (the text below is the CHANGELOG entry; ${notesFile ? notesFile : "write it with --notes <file>"} holds the same)
   gh release create v${VERSION} --title "Devora.js ${VERSION}" --notes-file ${notesFile || "<file>"} --verify-tag

8. The documentation site: see ~/Developer/_lab/RELEASE-DAY-0.4.0.md (devorajs-docs, scripts/release-day.mjs ${date}).

${bar}
GitHub release notes (from CHANGELOG.md, ${VERSION} — ${date}):
${bar}
${notes}${bar}`);
