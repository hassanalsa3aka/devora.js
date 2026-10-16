/**
 * The pathname of a request target, without building a URL object when the target is plain.
 *
 * `new URL(req.url, base).pathname` is the exact answer; it also costs a few percent of a small
 * request (measured with --cpu-prof). For a target made only of letters, digits, `-`, `_`, `.`,
 * `/` and an optional query, with no `//`, no `.` or `..` segment and no `%`, the URL parser
 * returns the target up to the `?` unchanged, so we return that. Anything else (an absolute-form
 * target, an encoded byte, a dot segment, a backslash) goes through `new URL`, so the result is
 * always identical to the URL parser's.
 */
const PLAIN_TARGET = /^\/[A-Za-z0-9_\-./]*(?:\?[^#]*)?$/;
const DOT_SEGMENT = /(?:^|\/)\.\.?(?:\/|$)/;

export function requestPathname(target: string): string {
  if (PLAIN_TARGET.test(target)) {
    const q = target.indexOf("?");
    const p = q === -1 ? target : target.slice(0, q);
    if (!p.includes("//") && !DOT_SEGMENT.test(p)) return p;
  }
  return new URL(target, "http://localhost").pathname;
}
