import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
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
});
