/**
 * Worst-case inputs for the regular expressions on request data (multipart part headers, boundary, host, cookie,
 * Accept-Encoding). Prints the time for each; anything over 500 ms for a 10 MB input is a finding.
 *   npx tsx work-notes/redteam/scripts/redos.mts
 */
import { parseFormBody } from "../../../packages/core/src/readBody.js";
import { normalizeHost } from "../../../packages/core/src/allowedHosts.js";
import { parseCookieHeader } from "../../../packages/core/src/session.js";
import { requestPathname } from "../../../packages/core/src/fastPathname.js";
const MB = 1024 * 1024;
async function time(name: string, fn: () => unknown) {
  const t = performance.now();
  try { await fn(); } catch { /* errors are fine, time is what matters */ }
  const ms = performance.now() - t;
  console.log(`${ms > 500 ? "SLOW" : "ok  "} ${name}: ${ms.toFixed(0)} ms`);
}
const semis = "Content-Disposition: form-data" + "; ".repeat(5 * MB / 2);
await time("multipart: one 10 MB part header of '; '", () => parseFormBody(Buffer.from(`--b\r\n${semis}\r\n\r\nx\r\n--b--\r\n`), "multipart/form-data; boundary=b"));
const spaces = "Content-Disposition: form-data;" + " ".repeat(10 * MB) + "x";
await time("multipart: ';' then 10 MB of spaces", () => parseFormBody(Buffer.from(`--b\r\n${spaces}\r\n\r\nx\r\n--b--\r\n`), "multipart/form-data; boundary=b"));
const lines = ("Content-Disposition:" + ";".repeat(50) + "\r\n").repeat(MB / 8);
await time("multipart: 130k header lines of ';'", () => parseFormBody(Buffer.from(`--b\r\n${lines}\r\n\r\nx\r\n--b--\r\n`), "multipart/form-data; boundary=b"));
await time("multipart: 10 MB of boundaries with no header end", () => parseFormBody(Buffer.from("--b\r\n".repeat(2 * MB)), "multipart/form-data; boundary=b"));
await time("content-type: 1 MB boundary parameter", () => parseFormBody(Buffer.from("x"), "multipart/form-data; boundary=" + "\"".repeat(MB)));
await time("content-type: boundary= repeated", () => parseFormBody(Buffer.from("x"), "multipart/form-data; " + "boundary=;".repeat(100000)));
await time("urlencoded: 10 MB of '&' (field limit)", () => parseFormBody(Buffer.from("&".repeat(10 * MB)), "application/x-www-form-urlencoded"));
await time("host: 1 MB of ':'", () => normalizeHost(":".repeat(MB)));
await time("host: 1 MB of '.'", () => normalizeHost(".".repeat(MB)));
await time("cookie: 1 MB of '; a='", () => parseCookieHeader("; a=".repeat(MB / 4)));
await time("path: 1 MB of '/./'", () => requestPathname("/./".repeat(MB / 3)));
await time("path: 1 MB plain", () => requestPathname("/" + "a".repeat(MB)));
