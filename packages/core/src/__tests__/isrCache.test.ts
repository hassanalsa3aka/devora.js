import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readCachedRoute, writeCachedRoute, isStale, revalidatePath } from "../isrCache.js";

/**
 * Real filesystem, not a mocked one — isrCache.ts is deliberately literal
 * files on disk (see its own doc comment: "no hidden caching/magic"), so a
 * test that mocked `fs` would only prove the mock's own assumptions, not
 * this module's actual behavior.
 */
describe("isrCache", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "devora-isr-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("readCachedRoute returns undefined when nothing has been written yet", async () => {
    expect(await readCachedRoute(dir, "/about")).toBeUndefined();
  });

  it("round-trips real HTML content for a nested route", async () => {
    await writeCachedRoute(dir, "/about", "<html>about</html>");
    const cached = await readCachedRoute(dir, "/about");
    expect(cached?.html).toBe("<html>about</html>");
    expect(cached?.renderedAt).toBeGreaterThan(0);
  });

  it("the root route (\"/\") writes directly into staticOutDir, not a nested \"/\" folder", async () => {
    await writeCachedRoute(dir, "/", "<html>home</html>");
    const cached = await readCachedRoute(dir, "/");
    expect(cached?.html).toBe("<html>home</html>");
  });

  it("isStale is false immediately after writing, true after the revalidate window", () => {
    const now = Date.now();
    expect(isStale(now, 3600)).toBe(false);
    expect(isStale(now - 3600 * 1000 - 1, 3600)).toBe(true);
  });

  it("revalidatePath deletes the cached entry so the next read is a real miss", async () => {
    await writeCachedRoute(dir, "/about", "<html>about</html>");
    expect(await readCachedRoute(dir, "/about")).toBeDefined();
    await revalidatePath(dir, "/about");
    expect(await readCachedRoute(dir, "/about")).toBeUndefined();
  });

  it("a corrupt metadata file is treated as maximally stale rather than failing the read", async () => {
    await writeCachedRoute(dir, "/about", "<html>about</html>");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(dir, "about", "index.meta.json"), "{not valid json");
    const cached = await readCachedRoute(dir, "/about");
    expect(cached?.html).toBe("<html>about</html>");
    expect(cached?.renderedAt).toBe(0);
  });

  describe("real bug: concurrent regeneration no longer produces a torn/spliced cache file", () => {
    it("30 racing concurrent writes to the same route each land as one complete file, never a splice of two", async () => {
      // Real bug: a plain writeFile() truncates-on-open, so two requests
      // racing to regenerate the same stale isr page could interleave their
      // writes. Each writer here writes a large, internally-consistent
      // payload (one repeated character) so a spliced result — some of
      // writer A's bytes followed by some of writer B's — is detectable by
      // checking every byte matches ONE writer's character, not "either
      // writer's content, fully, with nothing in between."
      const size = 8 * 1024 * 1024; // 8MB per writer — matches the size that reliably reproduced torn writes during this audit
      const pairs = 30;
      let tornCount = 0;

      for (let i = 0; i < pairs; i++) {
        const testDir = path.join(dir, `race-${i}`);
        const a = "A".repeat(size);
        const b = "B".repeat(size);
        await Promise.all([writeCachedRoute(testDir, "/page", a), writeCachedRoute(testDir, "/page", b)]);

        const finalContent = await readFile(path.join(testDir, "page", "index.html"), "utf-8");
        const isAllA = finalContent === a;
        const isAllB = finalContent === b;
        if (!isAllA && !isAllB) tornCount++;
      }

      expect(tornCount).toBe(0);
    });
  });

  describe("real bug: path-traversal containment (a tainted getStaticParams() value)", () => {
    it("writeCachedRoute refuses a route path that escapes staticOutDir, and writes nothing outside it", async () => {
      const escapeTarget = path.join(path.dirname(dir), "escaped-marker.html");
      await rm(escapeTarget, { force: true });
      await expect(writeCachedRoute(dir, "/../../escaped-marker", "<html>pwned</html>")).rejects.toThrow(
        /resolves outside/
      );
      const { existsSync } = await import("node:fs");
      expect(existsSync(escapeTarget)).toBe(false);
    });

    it("revalidatePath refuses to delete outside staticOutDir (the same primitive, used as a delete)", async () => {
      const outsideFile = path.join(path.dirname(dir), "important-config.html");
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outsideFile, "do not delete me");
      try {
        await expect(revalidatePath(dir, "/../important-config")).rejects.toThrow(/resolves outside/);
        const { readFile } = await import("node:fs/promises");
        expect(await readFile(outsideFile, "utf-8")).toBe("do not delete me");
      } finally {
        await rm(outsideFile, { force: true });
      }
    });

    it("a route path that stays inside staticOutDir still works normally", async () => {
      await writeCachedRoute(dir, "/blog/my-post", "<html>ok</html>");
      expect((await readCachedRoute(dir, "/blog/my-post"))?.html).toBe("<html>ok</html>");
    });
  });
});
