import { describe, expect, it } from "vitest";
import { ttlMemo } from "../ttlMemo.js";

describe("ttlMemo", () => {
  it("loads once within the ttl and again after it", async () => {
    let t = 0, n = 0;
    const get = ttlMemo(async () => ++n, 1000, () => t);
    expect(await get()).toBe(1);
    t = 999;
    expect(await get()).toBe(1);
    t = 1000;
    expect(await get()).toBe(2);
    expect(n).toBe(2);
  });
  it("shares one load between concurrent callers", async () => {
    let n = 0;
    const get = ttlMemo(async () => { n++; await new Promise((r) => setTimeout(r, 5)); return "x"; }, 1000);
    expect(await Promise.all([get(), get(), get()])).toEqual(["x", "x", "x"]);
    expect(n).toBe(1);
  });
  it("does not remember a failed load", async () => {
    let n = 0;
    const get = ttlMemo(async () => { if (++n === 1) throw new Error("boom"); return n; }, 1000);
    await expect(get()).rejects.toThrow("boom");
    await Promise.resolve();
    expect(await get()).toBe(2);
  });
});
