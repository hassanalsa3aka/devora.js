/**
 * Route module contract — what a file under apps/<name>/routes/ must export
 * to be servable by the SSR request handler (see docs/history/BUILD-LOG.md #1).
 */
import type { RequestContext } from "./serverFn.js";
import type { RenderMode, RevalidateConfig } from "./config.js";
import type { DocumentMeta } from "./html.js";

export interface RouteModule<Data = unknown> {
  renderMode?: RenderMode;
  /** Only meaningful for renderMode: "isr" — how long a build/re-render
   * stays fresh before the next request triggers a synchronous re-render
   * (architecture-v1.md §5's `revalidate: { seconds }` syntax). */
  revalidate?: RevalidateConfig;
  loader?: (ctx: RequestContext) => Promise<Data> | Data;
  /**
   * Static-params API (architecture-v2.md §3.6) — required for a dynamic
   * route (`[id].tsx`) to support `ssg`/`isr`: the build step
   * (buildAppStatic.ts) has no live request to derive `ctx.params` from, so
   * it needs to be told upfront which concrete values exist, one static
   * file rendered per entry. Not used for `ssr`/`csr` (both already work on
   * dynamic routes without this — a live request already carries its own
   * params) or a non-dynamic route (nothing to enumerate).
   */
  getStaticParams?: () => Promise<Record<string, string | string[]>[]> | Record<string, string | string[]>[];
  /** Runs for a POST. Return `redirect(to)` (303), `fail(status, data)`, or
   * any data — see actionResult.ts. Non-redirect results re-render the page
   * with the value as the `actionData` prop. A thrown `HttpError` keeps its
   * status. Uploads arrive as `File`s in `formData` (multipart/form-data). */
  action?: (formData: FormData, ctx: RequestContext) => Promise<unknown> | unknown;
  /** Title/description/og plus route-level `head` tags (html.ts). */
  meta?: (data?: Data) => DocumentMeta | undefined;
  /** The route's UI. Typed loosely here since core has no dependency on
   * react — entry-server.tsx (which does) is where this becomes a real
   * component via createElement. `csrfToken` is only ever populated for a
   * GET render (see renderRoute.ts) — a route embeds it via csrf.ts's
   * `CsrfField` if its form needs CSRF protection. */
  default: (props: RouteComponentProps<Data>) => unknown;
}

export interface RouteComponentProps<Data = unknown, ActionData = unknown> {
  data?: Data;
  csrfToken?: string;
  /** What this request's `action` returned (or `fail()`'s data) — undefined on a GET. */
  actionData?: ActionData;
}

/** Props of the app's error page (`apps/<name>/error.tsx`). */
export interface ErrorPageProps {
  status: number;
  /** Safe to show: an HttpError's own message, "Not found", or — for an
   * unexpected error in production — just "Internal Server Error". */
  message: string;
}

/** `apps/<name>/error.tsx`: renders 404s and errors thrown by pages. */
export interface ErrorPageModule {
  default: (props: ErrorPageProps) => unknown;
  meta?: (props: ErrorPageProps) => DocumentMeta | undefined;
}
