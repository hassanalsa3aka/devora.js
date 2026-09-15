import path from "node:path";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
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
 *  1. `git subtree split` this directory's own history into a real,
 *     temporary local branch — every commit that ever touched it, rewritten
 *     so paths are relative to the directory's own root. Not the same
 *     decision as "use git subtree for ongoing sync" (architecture-v2.md §5
 *     explicitly rejected that, in favor of submodules) — this is purely
 *     "how do we seed the new repo," a one-time operation with no bearing
 *     on how `sync` works afterward.
 *  2. Push that branch to `--repo` as `main` — the submodule's real initial
 *     history, not a single flattened "here's a snapshot" commit (a real,
 *     previously-undiscovered gap this closes: the original version of this
 *     command discarded every prior commit/author/blame line for the
 *     directory being split, silently, with no warning anywhere).
 *  3. Delete the local temporary branch — it already did its job once pushed.
 *  4. Untrack + delete the original directory from this repo.
 *  5. `git submodule add` the same `--repo` back at the same path.
 *
 * Deliberately stops short of committing step 4/5's result in the main
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
  console.log(`  1. Extract ${relPath}'s real commit history (git subtree split) and push it to ${opts.repo}.`);
  console.log(`  2. Remove ${relPath} from this repo's own tracked files.`);
  console.log(`  3. Re-add it as a git submodule pointing at ${opts.repo}.`);
  console.log(`  Nothing is committed here in this repo — you review and commit yourself afterward.`);

  const confirmed = await confirmAction(`Proceed?`, opts);
  if (!confirmed) {
    console.log(`[devora] aborted — nothing changed.`);
    return;
  }

  const splitBranch = `devora-split-${Date.now()}`;
  try {
    const splitResult = git(["subtree", "split", `--prefix=${relPath}`, "-b", splitBranch], root);
    if (splitResult.code !== 0) {
      throw new Error(
        `[devora] "git subtree split" failed — nothing has changed yet:\n${splitResult.stderr || splitResult.stdout}`
      );
    }

    const push = git(["push", opts.repo, `${splitBranch}:main`], root);
    if (push.code !== 0) {
      throw new Error(
        `[devora] failed to push ${relPath}'s extracted history to ${opts.repo}:\n${push.stderr}\n` +
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
          `tracked files:\n${addResult.stderr}\nYour real content (with its real history) is safely pushed ` +
          `to ${opts.repo} — run \`git submodule add ${opts.repo} ${relPath}\` manually to finish, or ` +
          `\`git checkout -- ${relPath}\` to abandon the split and restore the original tracked files.`
      );
    }

    console.log(`[devora] ${relPath} is now a submodule pointing at ${opts.repo}, with its real commit history.`);
    console.log(`[devora] review with \`git status\` / \`git diff --cached\`, then commit yourself.`);
  } finally {
    // The temporary split branch already did its job once pushed (or the
    // push failed and it's not needed either way) — always clean it up,
    // success or failure, so a retry doesn't collide with a stale one.
    git(["branch", "-D", splitBranch], root);
  }
}
