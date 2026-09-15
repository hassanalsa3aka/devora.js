import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Real Git plumbing shared by split.ts/sync.ts/status.ts (architecture-v2.md
 * §5) — thin wrappers, not a reimplementation: every one of these is a
 * single real `git` invocation. Synchronous (`execFileSync`) deliberately —
 * these commands run one at a time, in a fixed order, against a real
 * repository on disk; there's nothing to gain from async here and a lot to
 * lose in readability.
 */
export interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function git(args: string[], cwd: string): GitResult {
  try {
    const stdout = execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout: stdout.toString(), stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "" };
  }
}

/** Throws with git's own stderr on failure — for a step that must succeed
 * for anything downstream to make sense (e.g. `git init` on a fresh temp
 * dir failing means nothing else in `split` can proceed correctly). */
export function gitOrThrow(args: string[], cwd: string): string {
  const result = git(args, cwd);
  if (result.code !== 0) {
    throw new Error(`[devora] git ${args.join(" ")} failed (cwd: ${cwd}):\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

export function isGitClean(pathspec: string, cwd: string): boolean {
  const result = git(["status", "--porcelain", "--", pathspec], cwd);
  return result.code === 0 && result.stdout.trim() === "";
}

export interface SubmoduleEntry {
  name: string;
  path: string;
  url: string;
}

/** Real `.gitmodules` entries, read via `git config` (not hand-parsed INI —
 * git's own parser is the source of truth for its own file format). Empty
 * array (not a throw) if `.gitmodules` doesn't exist yet — the common case
 * before any `devora split` has run. */
export function listSubmodules(repoRoot: string): SubmoduleEntry[] {
  const result = git(["config", "--file", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"], repoRoot);
  if (result.code !== 0 || result.stdout.trim() === "") return [];

  const entries: SubmoduleEntry[] = [];
  for (const line of result.stdout.trim().split("\n")) {
    const [key, ...rest] = line.split(" ");
    const path = rest.join(" ");
    const name = key!.replace(/^submodule\./, "").replace(/\.path$/, "");
    const urlResult = git(["config", "--file", ".gitmodules", "--get", `submodule.${name}.url`], repoRoot);
    entries.push({ name, path, url: urlResult.stdout.trim() });
  }
  return entries;
}

/** Commit count each side is ahead — [behind, ahead] relative to `theirRef`
 * (e.g. "origin/main"), mirroring `git rev-list --left-right --count`'s own
 * column order. Both zero for "up to date"; behind>0 means `--from-main` has
 * something to pull; ahead>0 means `--to-main` has something to push. */
export function revListCounts(cwd: string, theirRef: string, ourRef = "HEAD"): { behind: number; ahead: number } {
  const result = git(["rev-list", "--left-right", "--count", `${theirRef}...${ourRef}`], cwd);
  if (result.code !== 0) return { behind: 0, ahead: 0 };
  const [behind, ahead] = result.stdout.trim().split(/\s+/).map(Number);
  return { behind: behind ?? 0, ahead: ahead ?? 0 };
}

/**
 * Real, previously-undiscovered vulnerability closed here (Phase 4 security
 * audit): every path this CLI treats as "a submodule/app directory to run
 * git commands inside, or to delete" — a `.gitmodules` `path` field (read by
 * `listSubmodules` above, git's own parser but never bounds-checked
 * afterward) or a `devora.config.ts` app `dir`/`shared.backend` value (used
 * by `resolveSplitTarget.ts`) — was joined onto `root` with plain
 * `path.join` and trusted outright. Both are realistic attacker-controlled
 * inputs (a malicious PR/template's `.gitmodules`; a compromised dependency
 * or template's `devora.config.ts`), and a `path` like `"../sibling-repo"`
 * escapes the project entirely. Verified end-to-end: a crafted `.gitmodules`
 * entry made `devora status`/`devora sync --all` genuinely `fetch`/`push` a
 * real, unrelated sibling repository outside the project, including
 * exfiltrating/pushing a private, never-pushed local commit from it; a
 * crafted app `dir` made `devora split` delete an unrelated tracked
 * directory outright. One containment check, called from every one of
 * those consumers before the resolved path is used as a git `cwd` or an
 * `rm()` target, closes all of them at the single real chokepoint.
 */
export function assertInsideRoot(root: string, targetPath: string, label: string): void {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error(
      `[devora] refusing to operate on "${label}" — it resolves to "${resolvedTarget}", outside the ` +
        `project root ("${resolvedRoot}"). Check devora.config.ts / .gitmodules for a path escaping the project.`
    );
  }
}

/** Files with unresolved merge conflicts — real state, not inferred. */
export function conflictedFiles(cwd: string): string[] {
  const result = git(["diff", "--name-only", "--diff-filter=U"], cwd);
  return result.stdout.trim() === "" ? [] : result.stdout.trim().split("\n");
}
