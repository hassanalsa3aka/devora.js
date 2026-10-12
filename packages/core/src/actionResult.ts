/**
 * What a route's `action` (or `loader`) can return besides plain data.
 *
 * - `redirect(to)` — send the browser elsewhere. After a POST the default is
 *   303 See Other (the browser follows it with a GET, so a refresh doesn't
 *   resubmit the form); from a loader (a GET) it's 302. Pass a status to
 *   choose (301/302/303/307/308). A loader may also `throw redirect(...)`.
 * - `fail(status, data)` — re-render the page with this HTTP status and
 *   `data` as the `actionData` prop, e.g. `fail(400, { error: "Wrong code" })`
 *   for a form that needs to show what went wrong.
 * - anything else — re-render the page (200) with it as `actionData`.
 */
export interface RedirectResult {
  redirect: string;
  /** Explicit redirect status; default 303 after a POST, 302 otherwise. */
  status?: 301 | 302 | 303 | 307 | 308;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function redirect(to: string, status?: RedirectResult["status"]): RedirectResult {
  if (status !== undefined && !REDIRECT_STATUSES.has(status)) {
    throw new Error(`[devora] redirect() status must be 301, 302, 303, 307 or 308 (got ${status})`);
  }
  return status === undefined ? { redirect: to } : { redirect: to, status };
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
