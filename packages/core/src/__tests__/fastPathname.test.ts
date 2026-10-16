import { describe, expect, it } from "vitest";
import { requestPathname } from "../fastPathname.js";

const viaUrl = (t: string) => new URL(t, "http://localhost").pathname;

describe("requestPathname", () => {
  const targets = [
    "/", "/a", "/a/b/c", "/api/items", "/api/items?x=1&y=2", "/assets/index-abc123.js", "/favicon.ico", "/a.b/c.d",
    "/a?", "/a?q=%2e%2e/", "/a/?q", "/a//b", "//a/b", "/./a", "/a/./b", "/a/../b", "/..", "/a/..", "/a/.", "/.hidden", "/a/.hidden/b",
    "/a%2eb", "/%2e%2e/etc/passwd", "/a%2fb", "/a b", "/a\\b", "/a\tb", "/é", "/a#frag", "/a?x#frag", "http://evil.test/a/b", "//evil.test/a",
    "/a/b/", "/dotted.v1.2/intro", "/a:b", "/a;b", "/a,b", "/~user", "/a@b", "/a+b", "?q=1", "", "*",
  ];
  it("matches new URL().pathname for every target, plain or not", () => {
    for (const t of targets) {
      let expected: string | Error;
      try { expected = viaUrl(t); } catch (e) { expected = e as Error; }
      if (expected instanceof Error) expect(() => requestPathname(t), t).toThrow();
      else expect(requestPathname(t), t).toBe(expected);
    }
  });
  it("matches on randomly generated targets from a hostile alphabet", () => {
    const alphabet = ["/", ".", "a", "b", "0", "-", "_", "%", "2", "e", "?", "#", "\\", " ", "x=1", "..", "//", "~", ":"];
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 5000; i++) {
      let t = "/";
      for (let n = Math.floor(rnd() * 8); n > 0; n--) t += alphabet[Math.floor(rnd() * alphabet.length)];
      let expected: string | undefined;
      try { expected = viaUrl(t); } catch { expected = undefined; }
      if (expected === undefined) expect(() => requestPathname(t), JSON.stringify(t)).toThrow();
      else expect(requestPathname(t), JSON.stringify(t)).toBe(expected);
    }
  });
});
