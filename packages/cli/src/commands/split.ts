import path from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { loadProjectConfig } from "@devorajs/core/config-loader";
import { resolveSplitTarget } from "../build/resolveSplitTarget.js";
import { git, gitOrThrow, isGitClean, listSubmodules } from "../build/gitHelpers.js";
import { confirmAction } from "../build/confirmAction.js";

/**
 * `devora split <app-name|backend> --repo=<git-url>` (architecture-v2.md
 * §5) — converts a directory that's currently plain, tracked content in
 * this repo into a git submodule pointing at a *real, already-created*
 * remote (the user creates the empty repo themselves first — account/auth
 * actions aren't this tool's job, same reasoning `devora deploy` requires
 * `vercel link`/`netlify link` to already exist rather than automating
 * platform account setup).
 *
 * Real Git surgery, not something with an atomic single command — the
 * actual sequence:
 *  1. Copy the target directory's current content to a temp dir.
 *  2. Turn that copy into its own fresh repo and push it to `--repo` as the
 *     submodule's real initial history (an empty remote has nothing to
 *     reference otherwise).
 *  3. Untrack + delete the original directory from this repo.
 *  4. `git submodule add` the same `--repo` back at the same path.
 *
 * Deliberately stops short of committing step 3/4's result in the main
 * repo — same "show a real diff, require confirmation, leave the actual
 * commit to the user" pattern as everywhere else in this CLI. The
 * confirmation happens *before* any of this runs, since steps 2 onward are
 * not easily reversible (a real push already happened).
 */
export async function split(name: string, opts: { repo?: string; yes?: boolean }): Promise<void> {
  if (!opts.repo) {
    console.error(`[devora] --repo=<git-url> is required — create the empty remote repo yourself first.`);
    process.exit(1);
  }

  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const targetPath = resolveSplitTarget(root, project, name);
  const relPath = path.relative(root, targetPath);

  if (!existsSync(targetPath)) {
    console.error(`[devora] ${relPath} doesn't exist`);
    process.exit(1);
  }
  if (listSubmodules(root).some((s) => s.path === relPath)) {
    console.error(`[devora] ${relPath} is already a submodule — nothing to split.`);
    process.exit(1);
  }
  if (!isGitClean(relPath, root)) {
    console.error(
      `[devora] ${relPath} has uncommitted changes — commit or stash them first, so "split" starts from a known state.`
    );
    process.exit(1);
  }

  console.log(`[devora] about to split ${relPath} into its own repo:`);
  console.log(`  1. Push ${relPath}'s current content to ${opts.repo} as that repo's initial history.`);
  console.log(`  2. Remove ${relPath} from this repo's own tracked files.`);
  console.log(`  3. Re-add it as a git submodule pointing at ${opts.repo}.`);
  console.log(`  Nothing is committed here in this repo — you review and commit yourself afterward.`);

  const confirmed = await confirmAction(`Proceed?`, opts);
  if (!confirmed) {
    console.log(`[devora] aborted — nothing changed.`);
    return;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "devora-split-"));
  try {
    await cp(targetPath, tempDir, { recursive: true });

    gitOrThrow(["init", "-b", "main"], tempDir);
    gitOrThrow(["add", "-A"], tempDir);
    gitOrThrow(["commit", "-m", `Initial split of ${relPath} via devora split`], tempDir);
    gitOrThrow(["remote", "add", "origin", opts.repo], tempDir);
    const push = git(["push", "-u", "origin", "main"], tempDir);
    if (push.code !== 0) {
      throw new Error(
        `[devora] failed to push the initial split content to ${opts.repo}:\n${push.stderr}\n` +
          `Nothing in this repo has changed yet — fix the remote (does it exist? do you have push access?) and retry.`
      );
    }

    // Only touch the main repo once the push above actually succeeded —
    // this is the point of no easy return, so it comes last.
    gitOrThrow(["rm", "-r", "--cached", relPath], root);
    await rm(targetPath, { recursive: true, force: true });
    const addResult = git(["submodule", "add", opts.repo, relPath], root);
    if (addResult.code !== 0) {
      throw new Error(
        `[devora] "git submodule add" failed after ${relPath} was already removed from this repo's ` +
          `tracked files:\n${addResult.stderr}\nYour real content is safely pushed to ${opts.repo} — ` +
          `run \`git submodule add ${opts.repo} ${relPath}\` manually to finish, or \`git checkout -- ` +
          `${relPath}\` to abandon the split and restore the original tracked files.`
      );
    }

    console.log(`[devora] ${relPath} is now a submodule pointing at ${opts.repo}.`);
    console.log(`[devora] review with \`git status\` / \`git diff --cached\`, then commit yourself.`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
