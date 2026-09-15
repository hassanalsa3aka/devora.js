/**
 * CSP/HSTS/X-Frame-Options defaults (ROADMAP.md #5, architecture doc §7:
 * "security is a default, not opt-in"). These apply even when an app's
 * app.config.ts declares no `security` block at all — the whole point is
 * that a dev has to opt OUT, not in.
 */
import { randomBytes } from "node:crypto";
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

/**
 * `renderMode: "streaming"` needs one real CSP accommodation: React's own
 * `renderToPipeableStream` injects a small **inline** `<script>` itself
 * (unrelated to this framework/Vite) to patch a Suspense boundary's real
 * content into the DOM once it resolves after the shell was already sent —
 * this is React's own mechanism for streaming SSR, not something this
 * framework added. `default-src 'self'` with no `unsafe-inline`/nonce/hash
 * blocks it outright — confirmed directly in a real browser (Playwright),
 * not assumed: a real streaming page's island never hydrated, with a
 * console error naming the exact CSP directive. React's server-render APIs
 * accept a `nonce` option for exactly this case (real, typed —
 * `@types/react-dom/server.d.ts`); a per-request nonce is generated here
 * and threaded into both the CSP header and `renderToPipeableStream`'s own
 * `nonce` option (renderStreaming.ts) so React's inline patch script gets
 * this response's real nonce, not a blanket `unsafe-inline` weakening.
 */
export function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

/** Adds `'nonce-<nonce>'` to an existing `script-src` directive, or a new
 * `script-src 'self' 'nonce-<nonce>'` directive if the policy doesn't
 * declare one (in which case `default-src` was covering scripts) — a
 * custom app-provided `security.csp` override is respected either way,
 * not replaced wholesale.
 *
 * Real bug fixed here (Phase 4 security audit, low severity — no app in
 * this repo customizes CSP today, so not attacker-reachable, but a real
 * functional break waiting for the first one that does): CSP3's
 * `script-src-elem` directive takes precedence over `script-src`
 * specifically for `<script>` elements. A custom policy declaring ONLY
 * `script-src-elem` (a real, spec-legal way to scope element vs.
 * attribute/eval sources separately) used to fall through this function
 * entirely unrecognized — `sawScriptSrc` stayed false, so it appended a
 * brand-new, spec-ineffective `script-src 'self' 'nonce-X'` directive that
 * `script-src-elem`'s precedence makes the browser ignore for script
 * elements, silently leaving React's own inline Suspense-patch script
 * blocked on a `renderMode: "streaming"` route. Now recognized and given
 * the nonce directly, the same way `script-src` already was. */
export function addNonceToCsp(csp: string, nonce: string): string {
  const directives = csp.split(";").map((d) => d.trim()).filter(Boolean);
  const nonceToken = `'nonce-${nonce}'`;
  let sawScriptSrc = false;
  let sawScriptSrcElem = false;

  const updated = directives.map((directive) => {
    if (directive === "script-src" || directive.startsWith("script-src ")) {
      sawScriptSrc = true;
      return `${directive} ${nonceToken}`;
    }
    if (directive === "script-src-elem" || directive.startsWith("script-src-elem ")) {
      sawScriptSrcElem = true;
      return `${directive} ${nonceToken}`;
    }
    return directive;
  });

  if (!sawScriptSrc && !sawScriptSrcElem) {
    updated.push(`script-src 'self' ${nonceToken}`);
  }
  return updated.join("; ");
}

export function resolveSecurityHeaders(
  security: AppRuntimeConfig["security"],
  /** Set only for a `renderMode: "streaming"` response — see this file's
   * `addNonceToCsp` doc comment. Every other render mode omits this and
   * gets exactly the CSP it already got before streaming existed. */
  streamingNonce?: string
): Record<string, string> {
  const baseCsp = security?.csp ?? DEFAULT_CSP;
  const headers: Record<string, string> = {
    "Content-Security-Policy": streamingNonce ? addNonceToCsp(baseCsp, streamingNonce) : baseCsp,
    "X-Frame-Options": security?.frameOptions ?? DEFAULT_FRAME_OPTIONS,
  };

  // HSTS is a no-op over plain HTTP (browsers only honor it on responses
  // received over HTTPS per RFC 6797) — safe to always send in dev.
  if (security?.hsts !== false) {
    headers["Strict-Transport-Security"] = DEFAULT_HSTS_VALUE;
  }

  return headers;
}
