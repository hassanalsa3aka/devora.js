import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { git, gitOrThrow, isGitClean, listSubmodules, revListCounts, conflictedFiles } from "../gitHelpers.js";

let repoDir: string;

function runGit(args: string[], cwd = repoDir): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

beforeEach(() => {
  repoDir = mkdtempSync(path.join(tmpdir(), "devora-githelpers-test-"));
  runGit(["init", "-q", "-b", "main"]);
  runGit(["config", "user.email", "test@example.com"]);
  runGit(["config", "user.name", "Test"]);
  writeFileSync(path.join(repoDir, "README.md"), "hello\n");
  runGit(["add", "-A"]);
  runGit(["commit", "-q", "-m", "initial"]);
});

afterEach(() => {
  rmSync(repoDir, { recursive: true, force: true });
});

describe("git / gitOrThrow", () => {
  it("git() returns code 0 and real stdout for a successful command", () => {
    const result = git(["log", "--oneline"], repoDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("initial");
  });

  it("git() returns a nonzero code and stderr for a failing command, without throwing", () => {
    const result = git(["not-a-real-git-command"], repoDir);
    expect(result.code).not.toBe(0);
  });

  it("gitOrThrow() throws with git's own stderr on failure", () => {
    expect(() => gitOrThrow(["not-a-real-git-command"], repoDir)).toThrow(/git not-a-real-git-command failed/);
  });
});

describe("isGitClean", () => {
  it("is true for a clean working tree", () => {
    expect(isGitClean(".", repoDir)).toBe(true);
  });

  it("is false once a tracked file is modified", () => {
    writeFileSync(path.join(repoDir, "README.md"), "changed\n");
    expect(isGitClean("README.md", repoDir)).toBe(false);
  });

  it("only checks the given pathspec, not the whole repo", () => {
    writeFileSync(path.join(repoDir, "README.md"), "changed\n");
    writeFileSync(path.join(repoDir, "other.txt"), "new file\n");
    runGit(["add", "other.txt"]);
    // other.txt is staged+new, README.md is dirty — a pathspec scoped to a
    // directory that contains neither should still read clean.
    expect(isGitClean("nonexistent-subdir", repoDir)).toBe(true);
  });
});

describe("listSubmodules", () => {
  it("returns an empty array when .gitmodules doesn't exist", () => {
    expect(listSubmodules(repoDir)).toEqual([]);
  });

  it("reads real entries once .gitmodules exists", () => {
    writeFileSync(
      path.join(repoDir, ".gitmodules"),
      `[submodule "apps/widget"]\n\tpath = apps/widget\n\turl = https://example.com/widget.git\n`
    );
    const entries = listSubmodules(repoDir);
    expect(entries).toEqual([{ name: "apps/widget", path: "apps/widget", url: "https://example.com/widget.git" }]);
  });

  it("reads multiple entries", () => {
    writeFileSync(
      path.join(repoDir, ".gitmodules"),
      `[submodule "apps/widget"]\n\tpath = apps/widget\n\turl = https://example.com/widget.git\n` +
        `[submodule "packages/backend"]\n\tpath = packages/backend\n\turl = https://example.com/backend.git\n`
    );
    const entries = listSubmodules(repoDir);
    expect(entries.map((e) => e.path).sort()).toEqual(["apps/widget", "packages/backend"]);
  });
});

describe("revListCounts", () => {
  it("is {0, 0} when both refs point at the same commit", () => {
    runGit(["branch", "other"]);
    expect(revListCounts(repoDir, "other", "main")).toEqual({ behind: 0, ahead: 0 });
  });

  it("reports ahead-only when HEAD has commits the other ref doesn't", () => {
    runGit(["branch", "other"]);
    writeFileSync(path.join(repoDir, "new.txt"), "x\n");
    runGit(["add", "-A"]);
    runGit(["commit", "-q", "-m", "ahead commit"]);
    expect(revListCounts(repoDir, "other", "main")).toEqual({ behind: 0, ahead: 1 });
  });

  it("reports behind-only when the other ref has commits HEAD doesn't", () => {
    runGit(["checkout", "-q", "-b", "other"]);
    writeFileSync(path.join(repoDir, "new.txt"), "x\n");
    runGit(["add", "-A"]);
    runGit(["commit", "-q", "-m", "other's commit"]);
    runGit(["checkout", "-q", "main"]);
    expect(revListCounts(repoDir, "other", "main")).toEqual({ behind: 1, ahead: 0 });
  });

  it("reports both counts when diverged", () => {
    runGit(["checkout", "-q", "-b", "other"]);
    writeFileSync(path.join(repoDir, "other-file.txt"), "x\n");
    runGit(["add", "-A"]);
    runGit(["commit", "-q", "-m", "other's commit"]);
    runGit(["checkout", "-q", "main"]);
    writeFileSync(path.join(repoDir, "main-file.txt"), "y\n");
    runGit(["add", "-A"]);
    runGit(["commit", "-q", "-m", "main's commit"]);
    expect(revListCounts(repoDir, "other", "main")).toEqual({ behind: 1, ahead: 1 });
  });
});

describe("conflictedFiles", () => {
  it("is empty with no conflict in progress", () => {
    expect(conflictedFiles(repoDir)).toEqual([]);
  });

  it("names the real conflicting file during an actual unresolved merge", () => {
    runGit(["checkout", "-q", "-b", "other"]);
    writeFileSync(path.join(repoDir, "README.md"), "other's version\n");
    runGit(["commit", "-aq", "-m", "other's edit"]);
    runGit(["checkout", "-q", "main"]);
    writeFileSync(path.join(repoDir, "README.md"), "main's version\n");
    runGit(["commit", "-aq", "-m", "main's edit"]);

    const merge = git(["merge", "other", "--no-edit"], repoDir);
    expect(merge.code).not.toBe(0); // a real conflict, not a clean merge

    expect(conflictedFiles(repoDir)).toEqual(["README.md"]);
  });
});
