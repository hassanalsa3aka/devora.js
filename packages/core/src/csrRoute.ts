/**
 * `renderMode: "csr"` (ROADMAP.md's render-modes item). Scoped tightly, on
 * purpose: a csr route never runs `loader` anywhere (server or client) —
 * data fetching for a client-only page is the component's own job
 * (`useEffect`+`fetch`, or `clientOnly()`), not a new server/client
 * serialization protocol (architecture-v1.md §5 already rules that out for
 * v1). The server's only job is a minimal shell + `meta()` (still real, for
 * whatever SEO value is possible on an inherently client-rendered page) and
 * a marker the generic csr-client bootstrap (apps/*\/csr-client.tsx) can
 * find to mount the real component into.
 */
import { renderHtmlDocument, escapeHtml } from "./html.js";
import type { RouteModule } from "./route.js";

export function renderCsrShell(
  routeModule: RouteModule,
  entryUrl: string | undefined,
  csrClientUrl: string | undefined
): string {
  const meta = routeModule.meta?.(undefined);
  const canMount = entryUrl !== undefined && csrClientUrl !== undefined;
  const bodyHtml = canMount ? `<div data-csr-entry="${escapeHtml(entryUrl as string)}"></div>` : "";
  return renderHtmlDocument({ bodyHtml, meta, csrScriptUrl: canMount ? csrClientUrl : undefined });
}
