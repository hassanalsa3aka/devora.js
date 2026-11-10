import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeDotfiles } from "../removeDotfiles.js";

const dirs: string[] = [];
function make(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-dotfiles-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("removeDotfiles", () => {
  it("removes dotfiles and dot folders at any depth, keeps .well-known and ordinary files", async () => {
    const dir = make({
      "index.html": "x",
      ".env": "SECRET",
      ".git/config": "SECRET",
      "docs/.htaccess": "SECRET",
      "docs/.private/a.txt": "SECRET",
      "docs/readme.txt": "ok",
      ".well-known/security.txt": "ok",
      ".well-known/.hidden": "SECRET",
      "assets/app.js": "ok",
    });
    const removed = (await removeDotfiles(dir)).sort();
    expect(removed).toEqual([".env", ".git", ".well-known/.hidden", "docs/.htaccess", "docs/.private"]);
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "docs", "readme.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".well-known", "security.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "assets", "app.js"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".env"))).toBe(false);
  });

  it("does nothing for a missing folder", async () => {
    expect(await removeDotfiles(path.join(os.tmpdir(), "devora-no-such-folder-xyz"))).toEqual([]);
  });
});
