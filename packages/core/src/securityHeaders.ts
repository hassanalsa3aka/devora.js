/**
 * CSP/HSTS/X-Frame-Options defaults (ROADMAP.md #5, architecture doc §7:
 * "security is a default, not opt-in"). These apply even when an app's
 * app.config.ts declares no `security` block at all — the whole point is
 * that a dev has to opt OUT, not in.
 */
import type { AppRuntimeConfig } from "./config.js";

// 'self' locks scripts/connect/img/etc to same-origin by default — this is
// the security-critical part (blocks injected/inline/eval'd script
// execution, consistent with "no eval anywhere in framework internals").
// style-src additionally allows 'unsafe-inline' as a deliberate, documented
// tradeoff: React's style={{...}} prop compiles to an inline `style`
// attribute, which a strict default-src would otherwise silently break for
// every app — see ROADMAP.md #5.
const DEFAULT_CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'";
// Typed as the literal union, not derived from the (optional, so
// possibly-undefined) config property — real tsc build caught that the
// derived type let `undefined` leak into a Record<string, string>.
const DEFAULT_FRAME_OPTIONS: "DENY" | "SAMEORIGIN" = "DENY";
const DEFAULT_HSTS_VALUE = "max-age=63072000; includeSubDomains";

export function resolveSecurityHeaders(security: AppRuntimeConfig["security"]): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": security?.csp ?? DEFAULT_CSP,
    "X-Frame-Options": security?.frameOptions ?? DEFAULT_FRAME_OPTIONS,
  };

  // HSTS is a no-op over plain HTTP (browsers only honor it on responses
  // received over HTTPS per RFC 6797) — safe to always send in dev.
  if (security?.hsts !== false) {
    headers["Strict-Transport-Security"] = DEFAULT_HSTS_VALUE;
  }

  return headers;
}
