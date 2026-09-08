import type { Connect } from "vite";
import { resolveSecurityHeaders, type AppRuntimeConfig } from "@devorajs/core";

/**
 * Applies CSP/HSTS/X-Frame-Options to every response this middleware sees
 * (ROADMAP.md #5) — not just SSR-matched routes, so it's a true default
 * rather than something only "real" pages get. Registered before
 * ssrMiddleware so the headers are set before any response is sent.
 *
 * Known dev-mode-only gap: on a true 404 (no route matches), Vite's own
 * built-in fallback handler runs after this and overwrites these headers
 * with its own (stricter, but not this app's configured values). Confirmed
 * empirically, not chased further — this only affects `devora dev`'s
 * fallback path; once real production serving exists (ROADMAP.md #4), every
 * response goes through Devora.js code, not Vite's own handler, and this
 * gap disappears on its own.
 */
export function createSecurityHeadersMiddleware(
  security: AppRuntimeConfig["security"]
): Connect.NextHandleFunction {
  const headers = resolveSecurityHeaders(security);
  return function securityHeadersMiddleware(_req, res, next) {
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    next();
  };
}
