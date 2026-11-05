/**
 * A small, in-memory rate limiter for the routes that create sessions (a
 * login form, a sign-up API route), declared by the route itself:
 *
 *   export const rateLimit = { max: 10, windowSeconds: 60 };
 *
 * Each client IP (`ctx.ip`) gets `max` requests with any method but GET,
 * HEAD and OPTIONS per window on that route; the next one is a 429 before the action or handler
 * runs. GET, HEAD and OPTIONS are never counted. Explicit per route, like
 * everything else here: nothing is limited unless a route says so.
 *
 * What it is not: shared between processes or serverless instances (each
 * counts on its own), or a substitute for limits at the proxy, CDN or
 * firewall in front of the app — see packages/backend/AUTH.md. Behind a
 * proxy, `ctx.ip` is the proxy's address unless the app sets `trustProxy`,
 * and every client would share one count.
 */
import { HttpError } from "./httpError.js";

export interface RateLimitConfig {
  /** Requests allowed per client IP per window (a positive integer). */
  max: number;
  /** The window length in seconds (a positive integer). */
  windowSeconds: number;
}

/** Client IPs remembered per route; when full, expired entries go first, then the oldest. */
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
  const retryAfter = limiter.hit(ip ?? "unknown");
  if (retryAfter !== undefined) throw new RateLimitError(retryAfter);
}
