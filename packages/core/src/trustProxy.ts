import type { IncomingHttpHeaders } from "node:http";
import type { RequestMeta } from "./serverFn.js";

/** app.config.ts `trustProxy`: true trusts one proxy hop; a number trusts that many. */
export type TrustProxySetting = boolean | number;

/** How many proxy hops to trust (0 = none). */
export function trustedProxyHops(setting: TrustProxySetting | undefined): number {
  if (setting === true) return 1;
  if (typeof setting === "number" && Number.isFinite(setting) && setting > 0) return Math.floor(setting);
  return 0;
}

/** The parts of a Node request this module reads — also satisfied by the
 * Netlify function's request shim (adapter-netlify). */
export interface ProxiedRequestLike {
  headers: IncomingHttpHeaders;
  /** A `tls.TLSSocket` has `encrypted: true`; a plain socket has no such
   * property. `remoteAddress` is the peer's address. */
  socket?: unknown;
  url?: string;
  method?: string;
}

/**
 * The first `X-Forwarded-Proto` value, lowercased. With several proxies in a
 * chain each one appends, so the first value is what the client used.
 * Untrusted on its own — any client can send this header; see
 * `isHttpsRequest`.
 */
export function forwardedProto(headers: IncomingHttpHeaders): string | undefined {
  const raw = headers["x-forwarded-proto"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const first = value?.split(",")[0]?.trim().toLowerCase();
  return first || undefined;
}

/**
 * Whether a request reached the app over HTTPS: a TLS socket, or — only
 * when `trustProxy` is on (app.config.ts) — `X-Forwarded-Proto: https` from
 * the proxy that terminated TLS. Without trustProxy the header is ignored,
 * since an app reachable directly would otherwise believe whatever a client
 * sent.
 */
export function isHttpsRequest(req: ProxiedRequestLike, trustProxy: TrustProxySetting | undefined): boolean {
  if ((req.socket as { encrypted?: unknown } | null | undefined)?.encrypted === true) return true;
  return trustedProxyHops(trustProxy) > 0 && forwardedProto(req.headers) === "https";
}

/**
 * The client's address. Without trustProxy: the socket's peer. With N
 * trusted hops: counting from the right of `X-Forwarded-For` + the peer —
 * each proxy *appends* the address it received from, so the entry N hops
 * back is the last one a trusted proxy wrote; anything further left came
 * from the client and could be forged. (Vercel overwrites the header with
 * just the client's IP, which this reads the same way.)
 */
export function clientIp(req: ProxiedRequestLike, trustProxy: TrustProxySetting | undefined): string | undefined {
  const peer = normalizeIp((req.socket as { remoteAddress?: unknown } | null | undefined)?.remoteAddress);
  const hops = trustedProxyHops(trustProxy);
  if (hops === 0) return peer;
  const raw = req.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const chain = peer === undefined ? forwarded : [...forwarded, peer];
  if (chain.length === 0) return undefined;
  return normalizeIp(chain[Math.max(0, chain.length - 1 - hops)]);
}

/** "::ffff:203.0.113.7" → "203.0.113.7" (an IPv4 client on a dual-stack socket). */
function normalizeIp(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return value.startsWith("::ffff:") && value.includes(".") ? value.slice(7) : value;
}

/**
 * Everything `ctx.url`/`ctx.headers`/`ctx.method`/`ctx.ip` are built from.
 * Host comes from `Host` (or `X-Forwarded-Host` with trustProxy), scheme
 * from `isHttpsRequest`. Like any Host-derived URL it's only as trustworthy
 * as the Host header — don't build password-reset links from it without
 * checking it against your known domain.
 */
export function describeRequest(req: ProxiedRequestLike, trustProxy: TrustProxySetting | undefined): RequestMeta {
  // What the URL is built from is read now; the URL itself is parsed and re-serialised the first
  // time `url` is read (ctx.url, or ctx.request), not for every request. It is a measurable part
  // of a small request, and most handlers never look at it.
  const scheme = isHttpsRequest(req, trustProxy) ? "https" : "http";
  const host = requestHost(req, trustProxy) ?? "localhost";
  const target = req.url ?? "/";
  let url: string | undefined;
  return {
    get url() {
      if (url === undefined) {
        // Only the path and query come from the request target. An absolute-form target
        // ("GET http://evil.example/x HTTP/1.1") or one starting with "//" used to replace the host, so
        // ctx.url could name a host that `allowedHosts` never saw (red team 2026-11-05, finding H27).
        const pathAndQuery = targetPathAndQuery(target);
        try {
          url = new URL(`${scheme}://${host}${pathAndQuery}`).href;
        } catch {
          url = new URL(pathAndQuery, "http://localhost").href;
        }
      }
      return url;
    },
    method: req.method ?? "GET",
    headers: req.headers,
    ip: clientIp(req, trustProxy),
  };
}

/**
 * The host this request is for, as `ctx.url` sees it: the first
 * `X-Forwarded-Host` value when the app trusts its proxy, else `Host`.
 * allowedHosts.ts checks this same value.
 */
export function requestHost(req: ProxiedRequestLike, trustProxy: TrustProxySetting | undefined): string | undefined {
  const forwardedHost = trustedProxyHops(trustProxy) > 0 ? firstHeaderValue(req.headers["x-forwarded-host"]) : undefined;
  return forwardedHost ?? firstHeaderValue(req.headers.host);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const first = (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
  return first || undefined;
}

/**
 * The path and query of a request target, always starting with a single "/": an origin-form target ("/a?b") as
 * sent; an absolute-form one ("http://host/a?b") without its scheme and host; "*" and anything unparsable as "/".
 * A target starting with "//" keeps its path ("//x/y" stays a path on this host, never a host named x).
 */
export function targetPathAndQuery(target: string): string {
  let pathAndQuery: string;
  if (target.startsWith("/")) pathAndQuery = target;
  else {
    try {
      const parsed = new URL(target);
      pathAndQuery = `${parsed.pathname}${parsed.search}`;
    } catch {
      return "/";
    }
  }
  return pathAndQuery.startsWith("//") ? `/${pathAndQuery.replace(/^\/+/, "")}` : pathAndQuery;
}

