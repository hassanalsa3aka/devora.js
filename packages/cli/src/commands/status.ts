import path from "node:path";
import { loadProjectConfig } from "@devorajs/core/config-loader";
import { git, listSubmodules, revListCounts, assertInsideRoot } from "../build/gitHelpers.js";
import { nameForSplitTarget } from "../build/resolveSplitTarget.js";

/**
 * `devora status --all` (architecture-v2.md §5) — sync state across every
 * split-off app/backend in one view: up to date, has local unsynced
 * changes (needs `sync --to-main`), remote has updates not pulled (needs
 * `sync --from-main`), diverged (needs both, in some order, and possibly a
 * real merge conflict), or not yet committed in the main repo at all (a
 * `devora split` was run but its result was never committed).
 */
export async function status(): Promise<void> {
  const root = process.cwd();
  const project = await loadProjectConfig(root);
  const submodules = listSubmodules(root);

  if (submodules.length === 0) {
    console.log(`[devora] no split-off apps/backend — nothing to report (see \`devora split\`).`);
    return;
  }

  console.log(`[devora] sync status:\n`);
  for (const sub of submodules) {
    const targetPath = path.join(root, sub.path);
    // Real bug fixed here (Phase 4 security audit): a crafted `.gitmodules`
    // `path` (e.g. "../sibling-repo") used to be trusted outright, running a
    // real `git fetch` (and every subsequent git command below) inside
    // whatever directory it resolved to, including outside this project
    // entirely — see assertInsideRoot's doc comment for the full account.
    try {
      assertInsideRoot(root, targetPath, sub.path);
    } catch (err) {
      console.log(`  ${sub.path} → ${sub.url}`);
      console.log(`    skipped: ${(err as Error).message}`);
      continue;
    }
    const name = nameForSplitTarget(root, project, sub.path);
    git(["fetch", "origin"], targetPath); // best-effort — a stale/offline remote still reports local state below.

    const { behind, ahead } = revListCounts(targetPath, "origin/main");
    const gitlinkDirty = git(["status", "--porcelain", "--", sub.path], root).stdout.trim() !== "";

    let state: string;
    if (ahead > 0 && behind > 0) {
      state = `diverged — ${ahead} local commit(s), ${behind} remote commit(s) not pulled`;
    } else if (ahead > 0) {
      state = `${ahead} local commit(s) not pushed — run \`devora sync ${name} --to-main\``;
    } else if (behind > 0) {
      state = `${behind} remote commit(s) not pulled — run \`devora sync ${name} --from-main\``;
    } else {
      state = `up to date`;
    }
    if (gitlinkDirty) {
      state += ` (gitlink change not yet committed in the main repo)`;
    }

    console.log(`  ${sub.path} → ${sub.url}`);
    console.log(`    ${state}`);
  }
}
