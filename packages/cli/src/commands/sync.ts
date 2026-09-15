import path from "node:path";
import { loadProjectConfig } from "@devorajs/core/config-loader";
import { resolveSplitTarget } from "../build/resolveSplitTarget.js";
import { git, listSubmodules, conflictedFiles, assertInsideRoot } from "../build/gitHelpers.js";
import { confirmAction } from "../build/confirmAction.js";

/**
 * `devora sync <name> [--from-main | --to-main]` (architecture-v2.md §5) —
 * a thin wrapper around real submodule fetch/merge/push, one direction at a
 * time (never both in one invocation — pulling and pushing in the same
 * command hides which direction actually changed something). Supports one
 * named target, several (space-separated), or every split-off piece
 * (`--all`).
 *
 * `--from-main`: fetches the submodule's own remote and merges its latest
 * `main` into the local checkout, then stages the updated gitlink in this
 * repo. `--to-main`: pushes commits already made directly inside the
 * submodule's checkout up to its own remote's `main`. Neither auto-commits
 * in this repo — same pattern `split.ts` uses.
 */
export async function sync(
  names: string[],
  opts: { fromMain?: boolean; toMain?: boolean; all?: boolean; yes?: boolean }
): Promise<void> {
  if (opts.fromMain === opts.toMain) {
    console.error(`[devora] specify exactly one of --from-main or --to-main.`);
    process.exit(1);
  }

  const root = process.cwd();
  const project = await loadProjectConfig(root);

  let anyFailed = false;
  let targets: { name: string; path: string }[];
  if (opts.all) {
    // Real bug fixed here (Phase 4 security audit): unlike resolveSplitTarget
    // (used by the named-target branch below), this used to trust a
    // `.gitmodules` `path` field outright — see assertInsideRoot's doc
    // comment for the real cross-repo fetch/push this allowed. A single bad
    // entry is skipped (not a hard abort), so one malicious/corrupt gitlink
    // doesn't prevent syncing every legitimate one.
    targets = [];
    for (const s of listSubmodules(root)) {
      const targetPath = path.join(root, s.path);
      try {
        assertInsideRoot(root, targetPath, s.path);
        targets.push({ name: s.path, path: targetPath });
      } catch (err) {
        console.error(`[devora] skipping "${s.path}": ${(err as Error).message}`);
        anyFailed = true;
      }
    }
  } else {
    targets = names.map((name) => ({ name, path: resolveSplitTarget(root, project, name) }));
  }

  if (targets.length === 0) {
    console.log(`[devora] nothing to sync — no split-off apps/backend found.`);
    if (anyFailed) process.exit(1);
    return;
  }

  for (const target of targets) {
    const relPath = path.relative(root, target.path);
    console.log(`\n[devora] ${relPath}:`);

    const fetch = git(["fetch", "origin"], target.path);
    if (fetch.code !== 0) {
      console.error(`  fetch failed: ${fetch.stderr}`);
      anyFailed = true;
      continue;
    }

    if (opts.fromMain) {
      anyFailed = !(await syncFromMain(root, target.path, relPath, opts)) || anyFailed;
    } else {
      anyFailed = !(await syncToMain(target.path, relPath, opts)) || anyFailed;
    }
  }

  if (anyFailed) process.exit(1);
}

async function syncFromMain(
  root: string,
  targetPath: string,
  relPath: string,
  opts: { yes?: boolean }
): Promise<boolean> {
  const log = git(["log", "--oneline", "HEAD..origin/main"], targetPath);
  if (log.stdout.trim() === "") {
    console.log(`  up to date with origin/main — nothing to pull.`);
    return true;
  }

  console.log(`  ${log.stdout.trim().split("\n").length} commit(s) to pull from origin/main:`);
  console.log(
    log.stdout
      .trim()
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")
  );

  const confirmed = await confirmAction(`  Merge these into ${relPath}?`, opts);
  if (!confirmed) {
    console.log(`  skipped.`);
    return true;
  }

  const merge = git(["merge", "origin/main", "--no-edit"], targetPath);
  if (merge.code !== 0) {
    const conflicts = conflictedFiles(targetPath);
    if (conflicts.length > 0) {
      console.error(`  merge conflict — resolve manually inside ${relPath}:`);
      for (const file of conflicts) {
        const diffStat = git(["diff", "--stat", "HEAD", "origin/main", "--", file], targetPath);
        console.error(`    ${file}${diffStat.stdout ? ` (${diffStat.stdout.trim()})` : ""}`);
      }
      console.error(`  this is a real conflict — not auto-resolved. Fix it inside ${relPath}, then commit there.`);
    } else {
      console.error(`  merge failed: ${merge.stderr}`);
    }
    return false;
  }

  // Stages the submodule's updated gitlink in the main repo — not
  // committed, same as everywhere else in this CLI.
  git(["add", relPath], root);
  console.log(`  merged. Updated gitlink staged in the main repo — commit there yourself.`);
  return true;
}

async function syncToMain(targetPath: string, relPath: string, opts: { yes?: boolean }): Promise<boolean> {
  const log = git(["log", "--oneline", "origin/main..HEAD"], targetPath);
  if (log.stdout.trim() === "") {
    console.log(`  nothing local to push — up to date with origin/main.`);
    return true;
  }

  console.log(`  ${log.stdout.trim().split("\n").length} local commit(s) to push to origin/main:`);
  console.log(
    log.stdout
      .trim()
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")
  );

  const confirmed = await confirmAction(`  Push these from ${relPath} to its own origin/main?`, opts);
  if (!confirmed) {
    console.log(`  skipped.`);
    return true;
  }

  const push = git(["push", "origin", "HEAD:main"], targetPath);
  if (push.code !== 0) {
    console.error(`  push failed (likely diverged — pull with --from-main first): ${push.stderr}`);
    return false;
  }
  console.log(`  pushed.`);
  return true;
}
