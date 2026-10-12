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
  const scheme = isHttpsRequest(req, trustProxy) ? "https" : "http";
  const forwardedHost = trustedProxyHops(trustProxy) > 0 ? firstHeaderValue(req.headers["x-forwarded-host"]) : undefined;
  const host = forwardedHost ?? firstHeaderValue(req.headers.host) ?? "localhost";
  let url: string;
  try {
    url = new URL(req.url ?? "/", `${scheme}://${host}`).href;
  } catch {
    url = new URL(req.url ?? "/", "http://localhost").href;
  }
  return { url, method: req.method ?? "GET", headers: req.headers, ip: clientIp(req, trustProxy) };
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const first = (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
  return first || undefined;
}
