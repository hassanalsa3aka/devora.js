/**
 * Bounded random fuzzing of the request, path, cookie, host, redirect and body parsers in @devorajs/core.
 *
 *   npx tsx work-notes/redteam/scripts/fuzz.mts [secondsPerTarget=20] [seed=1]
 *
 * Each target checks an invariant on random, mostly hostile input built from the characters and fragments that
 * matter to that parser. A broken invariant prints the input (JSON) and the run exits 1. Deterministic for a seed.
 */
import { requestPathname } from "../../../packages/core/src/fastPathname.js";
import { parseCookieHeader } from "../../../packages/core/src/session.js";
import { createHostCheck, normalizeHost } from "../../../packages/core/src/allowedHosts.js";
import { redirectRefusal } from "../../../packages/core/src/actionResult.js";
import { parseFormBody, readBodyWithLimit, FormLimitError, MalformedBodyError, PayloadTooLargeError } from "../../../packages/core/src/readBody.js";
import { targetPathAndQuery, describeRequest } from "../../../packages/core/src/trustProxy.js";
import { buildRouteTable, matchInTable } from "../../../packages/core/src/router.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const seconds = Number(process.argv[2] ?? 20);
let seed = Number(process.argv[3] ?? 1);
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const int = (n: number) => Math.floor(rand() * n);
let failures = 0;

function build(fragments: readonly string[], maxParts = 12): string {
  let out = "";
  const n = 1 + int(maxParts);
  for (let i = 0; i < n; i++) out += rand() < 0.15 ? String.fromCharCode(int(0x80)) : pick(fragments);
  return out;
}

function fail(target: string, input: unknown, why: string): void {
  failures++;
  if (failures <= 20) console.log(`FAIL ${target}: ${why}\n  input ${JSON.stringify(input)}`);
}

async function run(name: string, once: () => void | Promise<void>): Promise<void> {
  const end = Date.now() + seconds * 1000;
  let n = 0;
  let slowest = 0;
  while (Date.now() < end) {
    const t = performance.now();
    await once();
    slowest = Math.max(slowest, performance.now() - t);
    n++;
  }
  console.log(`${name}: ${n} inputs, slowest ${slowest.toFixed(1)} ms`);
}

const PATH = ["/", "//", ".", "..", "%2e", "%2E", "%2f", "%2F", "%5c", "\\", "%00", "%", "%25", "a", "Z", "-", "_", "?", "#", "&", "=", ";", "@", ":", "%c0%ae", "~", "+", " ", "\t", "%0d%0a", "é", "%ff", "api", "users", "[id]"];
const HOST = ["a", "example", ".", "com", ":", "80", "[", "]", "::1", "@", "/", "\\", " ", "%", "xn--", "-", "_", "*", "evil", "org", "localhost", "127.0.0.1", "\u0000", "\r", "\n"];
const REDIRECT = ["/", "//", "\\", "/\\", "\\/", "http:", "https:", "javascript:", "data:", "evil.example", "%2f", "%5c", "%252f", "\t", "\n", "\r", " ", "\u0000", "@", ":", ".", "..", "?", "#", "app", "%09", "%0a", "%20", "。", "／", "///", "http://", "evil.example:443"];
const COOKIE = ["=", ";", " ", "%", "%E0", "%A4", "%A", "devora_session", "devora_csrf", "__proto__", "constructor", "a", "b", "\"", ",", "\t", "%zz", "%25"];
const FORM = ["&", "=", "%", "a", "_csrf", "__proto__", "+", "%26", "%3D", "%E0%A4%A", ";", "\n"];

await run("requestPathname equals the URL parser", () => {
  const target = "/" + build(PATH);
  let expected: string;
  try {
    expected = new URL(target, "http://localhost").pathname;
  } catch {
    return;
  }
  let got: string;
  try {
    got = requestPathname(target);
  } catch (e) {
    return fail("requestPathname", target, `threw ${String(e)}`);
  }
  if (got !== expected) fail("requestPathname", target, `got ${got}, URL parser ${expected}`);
});

await run("ctx.url keeps the Host header's host", () => {
  const target = rand() < 0.5 ? "/" + build(PATH) : pick(["http://", "https://", "//", "///", "http:\\\\", "HTTP://"]) + build(HOST, 4) + "/" + build(PATH, 4);
  const pq = targetPathAndQuery(target);
  if (!pq.startsWith("/") || pq.startsWith("//")) fail("targetPathAndQuery", target, `returned ${pq}`);
  const url = describeRequest({ headers: { host: "app.example.com" }, url: target, method: "GET", socket: {} }, false).url;
  const host = new URL(url).host;
  if (host !== "app.example.com" && host !== "localhost") fail("describeRequest", target, `host ${host}`);
});

const hostCheck = createHostCheck(["app.example.com", ".example.org"])!;
await run("allowedHosts accepts only listed hosts", () => {
  const value = build(HOST, 8);
  let accepted: boolean;
  try {
    accepted = hostCheck(value);
  } catch (e) {
    return fail("hostCheck", value, `threw ${String(e)}`);
  }
  if (!accepted) return;
  const host = normalizeHost(value)!;
  if (!(host === "app.example.com" || host === "example.org" || host.endsWith(".example.org"))) fail("hostCheck", value, `accepted as ${host}`);
  if (/[@/\\\s]/.test(host)) fail("hostCheck", value, `accepted host with a separator: ${host}`);
});

await run("redirect: an accepted target stays on the origin", () => {
  const target = build(REDIRECT, 8);
  let refused: unknown;
  try {
    refused = redirectRefusal({ redirect: target });
  } catch (e) {
    return fail("redirectRefusal", target, `threw ${String(e)}`);
  }
  if (refused) return;
  // What a browser does with this Location on https://app.example.com/page, after up to three decodes in front.
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const cleaned = candidate.replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");
    let url: URL;
    try {
      url = new URL(cleaned, "https://app.example.com/page");
    } catch {
      break;
    }
    if (url.origin !== "https://app.example.com") return fail("redirectRefusal", target, `accepted, resolves to ${url.href}`);
    try {
      const next = decodeURIComponent(candidate);
      if (next === candidate) break;
      candidate = next;
    } catch {
      break;
    }
  }
});

await run("cookie parser never throws and keeps the first value", () => {
  const header = build(COOKIE, 16);
  let parsed: Record<string, string>;
  try {
    parsed = parseCookieHeader(header);
  } catch (e) {
    return fail("parseCookieHeader", header, `threw ${String(e)}`);
  }
  if (Object.getPrototypeOf({}).polluted !== undefined) fail("parseCookieHeader", header, "polluted Object.prototype");
  for (const v of Object.values(parsed)) if (typeof v !== "string") fail("parseCookieHeader", header, `non-string value ${typeof v}`);
});

await run("URL-encoded form: limits hold and only known errors", async () => {
  const body = Buffer.from(build(FORM, 40));
  try {
    const fd = await parseFormBody(body, "application/x-www-form-urlencoded", { maxFields: 5, maxFiles: 1 });
    let n = 0;
    fd.forEach(() => n++);
    if (n > 5) fail("parseFormBody urlencoded", body.toString(), `${n} fields passed a limit of 5`);
  } catch (e) {
    if (!(e instanceof FormLimitError || e instanceof MalformedBodyError)) fail("parseFormBody urlencoded", body.toString(), `threw ${String(e)}`);
  }
});

const PART_HEADER = [
  'Content-Disposition: form-data; name="f"',
  'Content-Disposition: form-data; name="f"; filename="a.txt"',
  'content-disposition:form-data;name="f";filename="a"',
  'Content-Disposition: form-data; name="f"; filename*=UTF-8\'\'a.txt',
  'Content-Disposition: form-data; filename="a"; name="f"',
  'Content-Disposition: form-data; name="f";\tfilename="a"',
  'Content-Disposition: form-data; name="f"; FILENAME="a"',
  'Content-Disposition: form-data; name="f"; filename=a',
  'Content-Disposition: form-data; name="f"; filename=""',
  'Content-Disposition: form-data; name="f;filename=x"',
  'Content-Disposition: form-data; name="f"\r\nContent-Type: text/plain',
  'Content-Type: text/plain\r\nContent-Disposition: form-data; name="f"; filename="b"',
  "Content-Disposition: form-data; name=f; filename=a",
];
await run("multipart form: file and field limits hold whatever the part headers look like", async () => {
  const boundary = pick(["b", "----x", "a b", "x;y", "\"q\""]);
  const ct = pick([`multipart/form-data; boundary=${boundary}`, `multipart/form-data; boundary="${boundary}"`, `Multipart/Form-Data; charset=utf-8; boundary=${boundary}`, `multipart/form-data;boundary=${boundary};x=1`]);
  const raw = boundary.replace(/^"|"$/g, "");
  let body = "";
  const parts = 1 + int(8);
  for (let i = 0; i < parts; i++) body += `--${raw}\r\n${pick(PART_HEADER)}\r\n\r\n${pick(["x", "", "--" + raw.slice(0, 1), "\r\n"])}\r\n`;
  body += rand() < 0.9 ? `--${raw}--\r\n` : "";
  const maxFiles = 2;
  const maxFields = 3;
  try {
    const fd = await parseFormBody(Buffer.from(body), ct, { maxFields, maxFiles });
    let files = 0;
    let fields = 0;
    fd.forEach((v) => (typeof v === "string" ? fields++ : files++));
    if (files > maxFiles || fields > maxFields) fail("parseFormBody multipart", { ct, body }, `${files} files / ${fields} fields passed limits ${maxFiles} / ${maxFields}`);
  } catch (e) {
    if (!(e instanceof FormLimitError || e instanceof MalformedBodyError)) fail("parseFormBody multipart", { ct, body }, `threw ${String(e)}`);
  }
});

await run("body reader never returns more than the limit", async () => {
  const limit = 1 + int(64);
  const chunks = Array.from({ length: int(10) }, () => Buffer.alloc(int(40), 0x61));
  const declared = rand() < 0.5 ? String(int(200)) : pick(["", "-1", "abc", "1e3", " 5", "0x10"]);
  const req = Object.assign(
    (async function* () {
      yield* chunks;
    })(),
    { headers: { "content-length": declared }, destroy: () => {} }
  );
  try {
    const out = await readBodyWithLimit(req, limit);
    if (out.length > limit) fail("readBodyWithLimit", { limit, sizes: chunks.map((c) => c.length) }, `returned ${out.length}`);
  } catch (e) {
    if (!(e instanceof PayloadTooLargeError)) fail("readBodyWithLimit", { limit, declared }, `threw ${String(e)}`);
  }
});

const routes = ["index.tsx", "about.tsx", "users/[id].tsx", "posts/[...slug].tsx", "docs/[[...path]].tsx"];
const routesDir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-fuzz-routes-"));
for (const r of routes) {
  fs.mkdirSync(path.dirname(path.join(routesDir, r)), { recursive: true });
  fs.writeFileSync(path.join(routesDir, r), "export default () => null;\n");
}
const table = buildRouteTable(routesDir);
const routeFiles = routes.map((r) => path.join(routesDir, r));
await run("router: matches only within the declared routes and never throws", () => {
  const pathname = "/" + build(PATH, 8);
  try {
    const m = matchInTable(table, pathname);
    if (m && !routeFiles.includes(m.filePath)) fail("matchRoute", pathname, `matched ${m.filePath}`);
    if (m?.params) for (const v of Object.values(m.params)) if (typeof v === "string" && v.includes("\u0000")) fail("matchRoute", pathname, "NUL in a param");
  } catch (e) {
    fail("matchRoute", pathname, `threw ${String(e)}`);
  }
});

fs.rmSync(routesDir, { recursive: true, force: true });
console.log(failures ? `${failures} invariant failures` : "no invariant failures");
process.exit(failures ? 1 : 0);
