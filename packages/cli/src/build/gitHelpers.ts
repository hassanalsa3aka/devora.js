import { execFileSync } from "node:child_process";

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

/** Files with unresolved merge conflicts — real state, not inferred. */
export function conflictedFiles(cwd: string): string[] {
  const result = git(["diff", "--name-only", "--diff-filter=U"], cwd);
  return result.stdout.trim() === "" ? [] : result.stdout.trim().split("\n");
}
