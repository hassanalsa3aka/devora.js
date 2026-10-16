import path from "node:path";
import { describe, expect, it } from "vitest";
import { cachedRoutePaths } from "../isrCache.js";
import { generateSessionId, sessionStoreKey } from "../session.js";

// The per-process memories added for speed must stay bounded and must not weaken a protection.

describe("cachedRoutePaths memory", () => {
  const out = path.join("/tmp", "devora-bounds-test", "static");
  const expected = (p: string) => path.join(path.resolve(out, p.slice(1)), "index.html");

  it("returns the same answer from memory, and the right one for every path in a flood", () => {
    const a = cachedRoutePaths(out, "/posts/one");
    expect(cachedRoutePaths(out, "/posts/one")).toBe(a);
    for (let i = 0; i < 5000; i++) expect(cachedRoutePaths(out, `/posts/p${i}`).htmlPath).toBe(expected(`/posts/p${i}`));
  });

  it("is bounded: past 2,000 distinct paths the memory is emptied, so an old answer is built again", () => {
    const first = cachedRoutePaths(out, "/bound/first");
    expect(cachedRoutePaths(out, "/bound/first")).toBe(first);
    for (let i = 0; i < 2500; i++) cachedRoutePaths(out, `/bound/flood-${i}`);
    const again = cachedRoutePaths(out, "/bound/first");
    expect(again).not.toBe(first); // it was evicted...
    expect(again).toEqual(first); // ...and the rebuilt answer is identical
  });

  it("a path that escapes the output folder is refused every time, before and after a flood, and never remembered", () => {
    for (const bad of ["/../escape", "/a/../../escape", "/../../etc/passwd"]) {
      expect(() => cachedRoutePaths(out, bad)).toThrow(/outside/);
      expect(() => cachedRoutePaths(out, bad)).toThrow(/outside/);
    }
    for (let i = 0; i < 2600; i++) cachedRoutePaths(out, `/flood2/${i}`);
    expect(() => cachedRoutePaths(out, "/../escape")).toThrow(/outside/);
  });
});

describe("sessionStoreKey memory", () => {
  it("returns the same key after a flood that emptied the memory", () => {
    const o = { name: "devora_session", secret: "bounds-secret" };
    const id = generateSessionId();
    const before = sessionStoreKey(id, o);
    for (let i = 0; i < 12000; i++) sessionStoreKey(generateSessionId(), o);
    expect(sessionStoreKey(id, o)).toBe(before);
  });
});
