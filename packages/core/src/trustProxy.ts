import type { IncomingHttpHeaders } from "node:http";

/** The parts of a Node request this module reads — also satisfied by the
 * Netlify function's request shim (adapter-netlify). */
export interface ProxiedRequestLike {
  headers: IncomingHttpHeaders;
  /** A `tls.TLSSocket` has `encrypted: true`; a plain socket has no such property. */
  socket?: unknown;
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
export function isHttpsRequest(req: ProxiedRequestLike, trustProxy: boolean): boolean {
  if ((req.socket as { encrypted?: unknown } | null | undefined)?.encrypted === true) return true;
  return trustProxy && forwardedProto(req.headers) === "https";
}
