/**
 * Route module contract — what a file under apps/<name>/routes/ must export
 * to be servable by the SSR request handler (see ROADMAP.md #1).
 */
import type { RequestContext } from "./serverFn.js";
import type { RenderMode, RevalidateConfig } from "./config.js";

export interface RouteModule<Data = unknown> {
  renderMode?: RenderMode;
  /** Only meaningful for renderMode: "isr" — how long a build/re-render
   * stays fresh before the next request triggers a synchronous re-render
   * (architecture-v1.md §5's `revalidate: { seconds }` syntax). */
  revalidate?: RevalidateConfig;
  loader?: (ctx: RequestContext) => Promise<Data> | Data;
  /** May return a RedirectResult (see actionResult.ts) instead of ordinary
   * data — renderRoute.ts checks for this and sends a real redirect instead
   * of re-rendering the page with a 200. */
  action?: (formData: FormData, ctx: RequestContext) => Promise<unknown>;
  meta?: (data?: Data) => { title?: string; description?: string } | undefined;
  /** The route's UI. Typed loosely here since core has no dependency on
   * react — entry-server.tsx (which does) is where this becomes a real
   * component via createElement. `csrfToken` is only ever populated for a
   * GET render (see renderRoute.ts) — a route embeds it via csrf.ts's
   * `CsrfField` if its form needs CSRF protection. */
  default: (props: { data?: Data; csrfToken?: string }) => unknown;
}
