/**
 * app.config.ts `allowedHosts`: when set, a request whose host is not in the
 * list gets a 400 before any route runs. The host checked is the one
 * `ctx.url` is built from (trustProxy.ts's `requestHost`): `X-Forwarded-Host`
 * when the app trusts its proxy, else `Host`. Without the list nothing is
 * checked, as before.
 *
 * Why it matters: anything built from the request's host (an absolute link
 * in an email, a redirect, a canonical URL) takes whatever the client sent.
 * The list stops a forged Host from reaching the app at all. A password-reset
 * or sign-in link should still be built from a configured origin, never from
 * the request (see packages/backend/AUTH.md).
 *
 * Entries: an exact host ("app.example.com", "localhost", "127.0.0.1",
 * "[::1]"), or a leading dot for a domain and all its subdomains
 * (".example.com"). Ports are ignored on both sides; case does not matter.
 */
import type { ServerResponse } from "node:http";

export type HostCheck = (host: string | undefined) => boolean;

const LOOPBACK = ["localhost", "127.0.0.1", "::1"];

/** Lowercase, no port, no IPv6 brackets, no trailing dot; undefined for something that is not a host. */
export function normalizeHost(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let host = value.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end === -1) return undefined;
    host = host.slice(1, end);
  } else {
    const colon = host.indexOf(":");
    if (colon !== -1 && host.indexOf(":", colon + 1) === -1) host = host.slice(0, colon);
  }
  host = host.replace(/\.$/, "");
  if (!host || /[\s/\\@?#]/.test(host)) return undefined;
  return host;
}

/**
 * The check for an app's `allowedHosts`, or undefined when the app has none.
 * `allowLoopback` (the dev server) also accepts localhost and loopback
 * addresses, so the production list works unchanged in `devora dev`.
 */
export function createHostCheck(allowedHosts: readonly string[] | undefined, options: { allowLoopback?: boolean } = {}): HostCheck | undefined {
  if (allowedHosts === undefined) return undefined;
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    throw new Error(`[devora] app.config.ts allowedHosts must be a non-empty list of hosts, e.g. ["app.example.com", ".example.com"]`);
  }
  const exact = new Set<string>();
  const suffixes: string[] = [];
  for (const entry of allowedHosts) {
    const wildcard = typeof entry === "string" && entry.startsWith(".");
    const host = typeof entry === "string" ? normalizeHost(wildcard ? entry.slice(1) : entry) : undefined;
    if (!host || (typeof entry === "string" && /^[a-z]+:\/\//i.test(entry))) {
      throw new Error(`[devora] app.config.ts allowedHosts entry ${JSON.stringify(entry)} is not a host such as "app.example.com" or ".example.com"`);
    }
    if (wildcard) suffixes.push(host);
    else exact.add(host);
  }
  if (options.allowLoopback) for (const host of LOOPBACK) exact.add(host);
  return (value) => {
    const host = normalizeHost(value);
    if (host === undefined) return false;
    if (exact.has(host)) return true;
    return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  };
}

/** The 400 for a host that is not allowed. Plain text: nothing app-specific runs. */
export function sendUnknownHost(res: ServerResponse): void {
  res.statusCode = 400;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Bad Request: unknown host");
}
