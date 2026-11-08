/**
 * A small, in-memory rate limiter for the routes that create sessions (a
 * login form, a sign-up API route), declared by the route itself:
 *
 *   export const rateLimit = { max: 10, windowSeconds: 60 };
 *
 * Each client (`ctx.ip`) gets `max` requests with any method but GET,
 * HEAD and OPTIONS per window on that route; the next one is a 429 before the action or handler
 * runs. A client is an IPv4 address, or the /64 prefix of an IPv6 address (see `rateLimitKey`): one
 * IPv6 subscriber is usually handed a whole /64, so counting each address separately would give it
 * billions of fresh counts. GET, HEAD and OPTIONS are never counted. Explicit per route, like
 * everything else here: nothing is limited unless a route says so.
 *
 * What it is not: shared between processes or serverless instances (each
 * counts on its own), or a substitute for limits at the proxy, CDN or
 * firewall in front of the app — see packages/backend/AUTH.md. Behind a
 * proxy, `ctx.ip` is the proxy's address unless the app sets `trustProxy`,
 * and every client would share one count.
 */
import { isIPv6 } from "node:net";
import { HttpError } from "./httpError.js";

export interface RateLimitConfig {
  /** Requests allowed per client per window (a positive integer). A client is an IPv4 address or an IPv6 /64. */
  max: number;
  /** The window length in seconds (a positive integer). */
  windowSeconds: number;
}

/**
 * What a client is for counting: the address itself for IPv4, the /64 prefix (the first four groups, written in
 * one canonical form such as `2001:db8:0:1::/64`) for IPv6. An IPv4-mapped IPv6 address (`::ffff:203.0.113.7`,
 * what a dual-stack socket reports for an IPv4 client) counts as its IPv4 address, and a zone id (`%eth0`) is
 * ignored. A value that is not a readable IPv6 address, an IPv4 address included, is used as it is. No address
 * (`undefined`) is one shared key, as before.
 */
export function rateLimitKey(ip: string | undefined): string {
  if (!ip) return "unknown";
  let address = ip;
  if (address.startsWith("[") && address.endsWith("]")) address = address.slice(1, -1);
  const zone = address.indexOf("%");
  if (zone !== -1) address = address.slice(0, zone);
  if (!isIPv6(address)) return ip;
  const groups = ipv6Groups(address);
  if (!groups) return ip;
  // ::ffff:a.b.c.d (and its hex form) is an IPv4 client on a dual-stack socket
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return `${groups[6]! >> 8}.${groups[6]! & 255}.${groups[7]! >> 8}.${groups[7]! & 255}`;
  }
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
}

/** The eight 16-bit groups of an IPv6 address that `isIPv6` accepted, or undefined. */
function ipv6Groups(address: string): number[] | undefined {
  let text = address.toLowerCase();
  const tail = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail) {
    const [a, b, c, d] = tail.slice(1).map(Number) as [number, number, number, number];
    if (a > 255 || b > 255 || c > 255 || d > 255) return undefined;
    text = text.slice(0, tail.index) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined;
  const all = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const groups = all.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return groups.length === 8 && groups.every((g) => !Number.isNaN(g)) ? groups : undefined;
}

/** Clients remembered per route; when full, expired entries go first, then the oldest. */
export const RATE_LIMIT_MAX_KEYS = 10_000;

// Every method except these is counted (an API route without `methods` runs its handler for any method).
const UNCOUNTED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class RateLimitError extends HttpError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, "Too many requests, try again later");
    this.name = "RateLimitError";
  }
}

interface Window {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly windowMs: number;

  constructor(
    readonly config: RateLimitConfig,
    private readonly maxKeys: number = RATE_LIMIT_MAX_KEYS
  ) {
    if (!Number.isInteger(config.max) || config.max < 1 || !Number.isInteger(config.windowSeconds) || config.windowSeconds < 1) {
      throw new Error(
        `[devora] rateLimit needs whole numbers above zero: { max, windowSeconds } (got ${JSON.stringify(config)})`
      );
    }
    this.windowMs = config.windowSeconds * 1000;
  }

  /** Counts one request for `key`; seconds to wait when it is over the limit, else undefined. */
  hit(key: string, now: number = Date.now()): number | undefined {
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      if (window) this.windows.delete(key);
      else if (this.windows.size >= this.maxKeys) this.makeRoom(now);
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
    }
    window.count++;
    return window.count > this.config.max ? Math.max(1, Math.ceil((window.resetAt - now) / 1000)) : undefined;
  }

  get size(): number {
    return this.windows.size;
  }

  private makeRoom(now: number): void {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
    // Still full: drop the oldest (Map keeps insertion order).
    while (this.windows.size >= this.maxKeys) this.windows.delete(this.windows.keys().next().value!);
  }
}

// One limiter per route module's `rateLimit` object, for as long as the module is loaded.
const limiters = new WeakMap<RateLimitConfig, FixedWindowRateLimiter>();

/**
 * Throws a RateLimitError (a 429 HttpError) when this request goes over the
 * route's `rateLimit`. Does nothing for a route without one, or for a
 * method that is never counted.
 */
export function enforceRateLimit(config: RateLimitConfig | undefined, method: string, ip: string | undefined): void {
  if (!config || UNCOUNTED_METHODS.has(method.toUpperCase())) return;
  let limiter = limiters.get(config);
  if (!limiter) limiters.set(config, (limiter = new FixedWindowRateLimiter(config)));
  const retryAfter = limiter.hit(rateLimitKey(ip));
  if (retryAfter !== undefined) throw new RateLimitError(retryAfter);
}
