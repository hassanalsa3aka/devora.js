/**
 * What a route's `action` (or `loader`) can return besides plain data.
 *
 * - `redirect(to)` — send the browser elsewhere. After a POST the default is
 *   303 See Other (the browser follows it with a GET, so a refresh doesn't
 *   resubmit the form); from a loader (a GET) it's 302. Pass a status to
 *   choose (301/302/303/307/308). A loader may also `throw redirect(...)`.
 *   The target must stay on this app's origin (a path such as "/account");
 *   another origin needs `redirect(url, { allowedOrigins: [...] })`.
 * - `fail(status, data)` — re-render the page with this HTTP status and
 *   `data` as the `actionData` prop, e.g. `fail(400, { error: "Wrong code" })`
 *   for a form that needs to show what went wrong.
 * - anything else — re-render the page (200) with it as `actionData`.
 */
import { HttpError } from "./httpError.js";

export interface RedirectResult {
  redirect: string;
  /** Explicit redirect status; default 303 after a POST, 302 otherwise. */
  status?: 301 | 302 | 303 | 307 | 308;
  /** Origins (e.g. "https://accounts.example.com") this redirect may leave the app for. */
  allowedOrigins?: readonly string[];
}

export interface RedirectOptions {
  status?: RedirectResult["status"];
  /**
   * The only other origins the target may point to, each a full origin
   * ("https://checkout.example.com"). Without it, a target that leaves the
   * app's origin is refused: "https://evil.example", "//evil.example",
   * "/\evil.example", and their percent-encoded forms.
   */
  allowedOrigins?: readonly string[];
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function redirect(to: string, statusOrOptions?: RedirectResult["status"] | RedirectOptions): RedirectResult {
  const options: RedirectOptions =
    typeof statusOrOptions === "object" && statusOrOptions !== null ? statusOrOptions : { status: statusOrOptions };
  const { status, allowedOrigins } = options;
  if (status !== undefined && !REDIRECT_STATUSES.has(status)) {
    throw new Error(`[devora] redirect() status must be 301, 302, 303, 307 or 308 (got ${status})`);
  }
  const result: RedirectResult = { redirect: to };
  if (status !== undefined) result.status = status;
  if (allowedOrigins !== undefined) result.allowedOrigins = allowedOrigins.map(normalizeAllowedOrigin);
  const refusal = redirectRefusal(result);
  if (refusal) throw refusal;
  return result;
}

// Any origin that is not a real one: a path resolves against it, and only a
// target that resolves somewhere else is "off-origin".
const PLACEHOLDER_ORIGIN = "http://devora-app.invalid";

function normalizeAllowedOrigin(entry: string): string {
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    throw new Error(`[devora] redirect() allowedOrigins entry "${entry}" is not an origin such as "https://accounts.example.com"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`[devora] redirect() allowedOrigins entry "${entry}" must be an http or https origin`);
  }
  return url.origin;
}

/**
 * Where a browser would go for this Location value: browsers drop leading
 * and trailing control characters and spaces, remove tabs and newlines
 * anywhere, and treat "\" as "/". The WHATWG URL parser does the same.
 * `undefined` for a value no URL can be made from.
 */
function resolveLikeBrowser(to: string): { url: URL; absolute: boolean } | undefined {
  const cleaned = to.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "").replace(/[\t\n\r]/g, "");
  try {
    return { url: new URL(cleaned, PLACEHOLDER_ORIGIN), absolute: URL.canParse(cleaned) };
  } catch {
    return undefined;
  }
}

/**
 * The 400 a redirect target earns, or undefined when it is allowed. Checked
 * when `redirect()` is called and again when the response is sent (a loader
 * can return a plain `{ redirect }` object). The target is checked as
 * written and after each round of percent-decoding (up to three), so
 * "/%2F%2Fevil.example" is refused even if something in front of the app
 * decodes it.
 */
export function redirectRefusal(result: RedirectResult): HttpError | undefined {
  const allowed = result.allowedOrigins ?? [];
  let candidate = result.redirect;
  for (let round = 0; round < 4; round++) {
    const resolved = resolveLikeBrowser(candidate);
    const onOrigin = resolved !== undefined && !resolved.absolute && resolved.url.origin === PLACEHOLDER_ORIGIN;
    const allowedElsewhere =
      resolved !== undefined &&
      (resolved.url.protocol === "https:" || resolved.url.protocol === "http:") &&
      allowed.includes(resolved.url.origin);
    if (!onOrigin && !allowedElsewhere) {
      const shown = result.redirect.length > 100 ? `${result.redirect.slice(0, 100)}…` : result.redirect;
      return new HttpError(
        400,
        `[devora] redirect() refused "${shown}": it leaves this app's origin. Redirect to a path such as "/account", ` +
          `or list the origins you trust: redirect(url, { allowedOrigins: ["https://accounts.example.com"] }).`
      );
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      break;
    }
    if (decoded === candidate) break;
    candidate = decoded;
  }
  return undefined;
}

export function isRedirectResult(value: unknown): value is RedirectResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "redirect" in value &&
    typeof (value as { redirect: unknown }).redirect === "string"
  );
}

/** The status a redirect is sent with for a request of this method. */
export function redirectStatus(result: RedirectResult, method: string): number {
  return result.status ?? (method === "POST" ? 303 : 302);
}

const FAIL = Symbol.for("devora.actionFail");

export interface FailResult<Data = unknown> {
  readonly [FAIL]: true;
  status: number;
  data: Data;
}

/** Re-render the page with an error status and data for the form — see the module comment. */
export function fail<Data>(status: number, data: Data): FailResult<Data> {
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new Error(`[devora] fail() status must be a 4xx/5xx status (got ${status})`);
  }
  return { [FAIL]: true, status, data };
}

export function isFailResult(value: unknown): value is FailResult {
  return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[FAIL] === true;
}
