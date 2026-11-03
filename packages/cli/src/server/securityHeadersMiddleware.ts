import type { Connect, Plugin } from "vite";
import { isSvgPath, resolveSecurityHeaders, SVG_CSP, type AppRuntimeConfig } from "@devorajs/core";

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
/**
 * `.svg` files in dev. Vite serves public files from its own middleware, which runs before
 * anything registered with `server.middlewares.use()` afterwards, so the page headers above never
 * reach them. This plugin registers earlier (like the API middleware plugin) and gives an SVG the
 * same sandboxing policy and `nosniff` that `devora start` sends (staticFiles.ts).
 */
export function createSvgHeadersPlugin(): Plugin {
  return {
    name: "devora-svg-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && isSvgPath(req.url)) {
          res.setHeader("Content-Security-Policy", SVG_CSP);
          res.setHeader("X-Content-Type-Options", "nosniff");
        }
        next();
      });
    },
  };
}

export function createSecurityHeadersMiddleware(
  security: AppRuntimeConfig["security"]
): Connect.NextHandleFunction {
  const headers = resolveSecurityHeaders(security);
  return function securityHeadersMiddleware(req, res, next) {
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    // Same as production (staticFiles.ts): an SVG gets a sandboxing policy.
    if (req.url && isSvgPath(req.url)) res.setHeader("Content-Security-Policy", SVG_CSP);
    next();
  };
}
