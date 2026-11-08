/**
 * Request rules of the experimental dev server (work-notes/dev-server/DESIGN.md, "Security rules"): loopback
 * binding, the host check against DNS rebinding, refusing production, and the per-launch token.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";

export const LOOPBACK_HOSTS = ["127.0.0.1", "::1"] as const;

/** Throws when the server would run in production or bind anything but loopback. */
export function assertDevOnly(env: NodeJS.ProcessEnv, bindHost: string): void {
  if (env.NODE_ENV === "production") {
    throw new Error("[devora dev-server] refuses to run with NODE_ENV=production: it is a development server");
  }
  if (!(LOOPBACK_HOSTS as readonly string[]).includes(bindHost)) {
    throw new Error(`[devora dev-server] binds 127.0.0.1 or ::1 only (got "${bindHost}")`);
  }
}

/** The host name of a Host header, lowercase, without port or IPv6 brackets; undefined for something else. */
export function hostName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (/[\s/\\@?#]/.test(v)) return undefined;
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end === -1 || (v.length > end + 1 && !/^:\d{1,5}$/.test(v.slice(end + 1)))) return undefined;
    return v.slice(1, end);
  }
  const m = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/.exec(v);
  return m ? m[1]!.replace(/\.$/, "") : undefined;
}

/**
 * Localhost names, loopback addresses and the app's `allowedHosts` (exact, or ".example.com" for a domain and its
 * subdomains). Anything else, including a name that only resolves to 127.0.0.1 (DNS rebinding), is refused.
 */
export function createDevHostCheck(allowedHosts: readonly string[] = []): (host: string | undefined) => boolean {
  const exact = new Set(["localhost", "127.0.0.1", "::1"]);
  const suffixes: string[] = [];
  for (const entry of allowedHosts) {
    if (entry.startsWith(".")) suffixes.push(entry.slice(1).toLowerCase());
    else exact.add(entry.toLowerCase());
  }
  return (header) => {
    const host = hostName(header);
    if (host === undefined) return false;
    return exact.has(host) || suffixes.some((s) => host === s || host.endsWith(`.${s}`));
  };
}

/** 32 random bytes, base64url: the HMR WebSocket token for one launch. */
export function generateDevToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenMatches(expected: string, presented: unknown): boolean {
  if (typeof presented !== "string" || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
}
