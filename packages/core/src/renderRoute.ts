import { escapeHtml, renderHtmlDocument, renderShellMarkup, type HeadConfig } from "./html.js";
import { createRequestContext, createNoAuthContext } from "./session.js";
import { createIslandCollector, IslandCollectorContext } from "./islandComponent.js";
import { ShellUsageContext } from "./branding.js";
import { isFailResult, isRedirectResult, redirectStatus, type RedirectResult } from "./actionResult.js";
import { createBuildTimeContext } from "./buildTimeContext.js";
import { getHttpErrorStatus } from "./httpError.js";
import type { ErrorPageModule, ErrorPageProps, RouteComponentProps, RouteModule } from "./route.js";
import type { SessionCookieOptions } from "./session.js";
import type { RequestMeta } from "./serverFn.js";
import type { RenderMode } from "./config.js";
import type { RawRouteParams } from "./router.js";

/**
 * `apps/{admin,dashboard,marketing}/entry-server.tsx` used to each carry a
 * full, byte-for-byte identical copy of this logic (confirmed via diff —
 * not "probably identical"). Only the `createElement`/`renderToString`
 * injection genuinely needs to live per-app, so react-dom/server resolves
 * against that app's own node_modules (Vite's SSR guide's own pattern);
 * everything else is portable and now lives here, once, so a future fix
 * (redirects, CSRF, new render modes) is written in one place instead of
 * copied by hand into three.
 */
export function resolveRenderMode(routeModule: RouteModule, appDefault?: RenderMode): RenderMode {
  return routeModule.renderMode ?? appDefault ?? "ssr";
}

export interface RenderRouteRequest {
  method: string;
  formData?: FormData;
  cookieHeader?: string;
  /** The raw `Authorization` header, if any — the Bearer transport
   * (session.ts). Browsers navigating to a page won't send one, but the
   * lookup is the same single function either way. */
  authorizationHeader?: string | string[];
  /** Values captured from any `[param]` segments the route matched on
   * (router.ts) — empty/absent for a route with no dynamic segments. */
  params?: RawRouteParams;
  /** Absent for an app with `auth: "none"` — see createNoAuthContext(). */
  sessionCookieOptions?: SessionCookieOptions;
  /** Where to fetch the island hydration bootstrap — dev: "/island-client.tsx";
   * prod: the real built asset URL, or undefined if this app has no islands. */
  islandClientUrl?: string;
  /** Project/app-level default render mode (AppRuntimeConfig.defaultRenderMode),
   * used only when the route file itself has no explicit `renderMode` export. */
  appDefaultRenderMode?: RenderMode;
  /** Dev-mode-only React Refresh preamble virtual module URL — see
   * html.ts's `renderTail` doc comment. Never set in production. */
  devPreambleUrl?: string;
  /** URL, headers, method, client IP — what `ctx.url`/`ctx.headers`/`ctx.ip` read. */
  meta?: RequestMeta;
  /** app.config.ts `head`. */
  head?: HeadConfig;
  /** URLs of the CSS this route imports. */
  styles?: string[];
  /** The app's `error.tsx`, if it has one — rendered for any error thrown here. */
  errorPage?: ErrorPageModule;
  /** CSS the error page imports. */
  errorPageStyles?: string[];
}

export interface RenderRouteResult {
  status: number;
  html: string;
  setCookie?: string[];
  /** Set only for a redirect (see actionResult.ts) — `html` is empty and the
   * caller sends `status` + Location instead of a body. */
  redirectTo?: string;
  /** What was thrown, when this is an error page — for the caller to log
   * (5xx). Never sent to the client. */
  error?: unknown;
}

export interface RenderRouteDeps {
  // Method syntax on purpose: its parameters are checked bivariantly, so
  // React's real (narrower) createElement/renderToString signatures are
  // assignable here without core depending on React's types — the property
  // form made every app's entry-server.tsx fail `tsc` (TS2322).
  createElement(type: unknown, props: unknown, ...children: unknown[]): unknown;
  renderToString(element: unknown): string;
}

export interface RenderErrorOptions {
  status: number;
  /** The thrown value; its message is only shown for an HttpError, or in dev. */
  error?: unknown;
  head?: HeadConfig;
  errorPage?: ErrorPageModule;
  errorPageStyles?: string[];
  devPreambleUrl?: string;
}

/**
 * The two-pass island render (ROADMAP.md #3) + HTML document assembly,
 * shared by both a live `ssr` request (createRenderRoute below) and a
 * build-time `ssg`/`isr` render (createRenderStatic below) — the render
 * mechanism itself doesn't care whether `data` came from a per-request
 * loader or a build-time one, and islands work identically either way
 * (islandComponent.ts's collector is renderer-agnostic).
 */
async function renderPage(
  deps: RenderRouteDeps,
  routeModule: RouteModule,
  props: RouteComponentProps,
  islandClientUrl: string | undefined,
  devPreambleUrl: string | undefined,
  head: { appHead?: HeadConfig; styles?: string[] }
): Promise<string> {
  const collector = createIslandCollector();
  const shellUsage = { used: false };
  const element = deps.createElement(
    ShellUsageContext.Provider,
    { value: shellUsage },
    deps.createElement(
      IslandCollectorContext.Provider,
      { value: collector },
      deps.createElement(routeModule.default as never, props)
    )
  );

  let bodyHtml = deps.renderToString(element);
  if (collector.pending.length > 0) {
    await Promise.all(collector.pending);
    bodyHtml = deps.renderToString(element);
  }

  const meta = routeModule.meta?.(props.data);
  const hasHydratableIsland = [...collector.resolved.keys()].some((d) => d.clientUrl);
  const islandScriptUrl = hasHydratableIsland ? islandClientUrl : undefined;

  return renderHtmlDocument({
    bodyHtml,
    meta,
    islandScriptUrl,
    devPreambleUrl: islandScriptUrl ? devPreambleUrl : undefined,
    head: { ...head, usedShell: shellUsage.used },
  });
}

/** The message an error page may show for `error` with `status`. */
export function publicErrorMessage(status: number, error: unknown): string {
  if (status === 404 && error === undefined) return "Not found";
  const own = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (getHttpErrorStatus(error) !== undefined && own) return own;
  if (process.env.NODE_ENV !== "production" && own) return own;
  return status >= 500 ? "Internal Server Error" : "Request failed";
}

/**
 * An error page: the app's `error.tsx` if it has one (and it renders),
 * otherwise a small built-in page. In dev an unexpected error's stack is
 * shown under the built-in page; in production only the status and the
 * public message are.
 */
function renderErrorDocument(deps: RenderRouteDeps, options: RenderErrorOptions): string {
  const message = publicErrorMessage(options.status, options.error);
  const props: ErrorPageProps = { status: options.status, message };
  if (options.errorPage && typeof options.errorPage.default === "function") {
    try {
      const shellUsage = { used: false };
      const bodyHtml = deps.renderToString(
        deps.createElement(ShellUsageContext.Provider, { value: shellUsage }, deps.createElement(options.errorPage.default as never, props))
      );
      return renderHtmlDocument({
        bodyHtml,
        meta: options.errorPage.meta?.(props) ?? { title: `${options.status} — ${message}` },
        head: { appHead: options.head, styles: options.errorPageStyles, usedShell: shellUsage.used },
      });
    } catch (renderError) {
      console.error("[devora] the app's error page itself failed to render — using the built-in one:", renderError);
    }
  }
  const showStack =
    process.env.NODE_ENV !== "production" && options.error instanceof Error && getHttpErrorStatus(options.error) === undefined;
  const bodyHtml = renderShellMarkup(
    `<h1>${options.status}</h1><p>${escapeHtml(message)}</p>` +
      `<p><a class="devora-button" href="/">Back to the home page</a></p>` +
      (showStack ? `<pre>${escapeHtml((options.error as Error).stack ?? "")}</pre>` : ""),
    { mainClass: "devora-error" }
  );
  // The built-in page is framework UI, so it uses the framework theme unless the app turned it off.
  return renderHtmlDocument({
    bodyHtml,
    meta: { title: `${options.status} — ${message}` },
    head: { appHead: options.head, usedShell: true },
  });
}

/** Status for a thrown value: an HttpError's (or any `status`/`statusCode` 4xx/5xx), else 500. */
function errorStatus(error: unknown): number {
  return getHttpErrorStatus(error) ?? 500;
}

export function createRenderRoute(deps: RenderRouteDeps) {
  async function renderRoute(routeModule: RouteModule, request: RenderRouteRequest): Promise<RenderRouteResult | null> {
    const renderMode = resolveRenderMode(routeModule, request.appDefaultRenderMode);
    if (renderMode !== "ssr") {
      // Only "ssr" is wired up in this slice — ssg/csr/streaming/isr are next.
      return null;
    }

    if (typeof routeModule.default !== "function") {
      throw new Error("[devora] route has no default export component");
    }

    let getSetCookie: () => string[] | undefined = () => undefined;
    let settle: () => Promise<void> = async () => {};
    const redirectTo = (result: RedirectResult): RenderRouteResult => ({
      status: redirectStatus(result, request.method),
      html: "",
      setCookie: getSetCookie(),
      redirectTo: result.redirect,
    });

    try {
      const context = request.sessionCookieOptions
        ? await createRequestContext(
            { cookieHeader: request.cookieHeader, authorizationHeader: request.authorizationHeader },
            request.sessionCookieOptions,
            request.params,
            request.meta
          )
        : createNoAuthContext(request.params, request.meta);
      const { ctx, csrfToken } = context;
      getSetCookie = context.getSetCookie;
      settle = context.settle;

      let status = 200;
      let actionData: unknown;
      if (request.method === "POST" && request.formData && routeModule.action) {
        const actionResult = await routeModule.action(request.formData, ctx);
        if (isRedirectResult(actionResult)) {
          await settle();
          // Skip loader and rendering entirely — nothing downstream of a
          // redirect (e.g. login setting a session cookie) needs the page's
          // own HTML in this response.
          return redirectTo(actionResult);
        }
        if (isFailResult(actionResult)) {
          status = actionResult.status;
          actionData = actionResult.data;
        } else {
          actionData = actionResult;
        }
      }

      const data = routeModule.loader ? await routeModule.loader(ctx) : undefined;
      if (isRedirectResult(data)) {
        await settle();
        return redirectTo(data);
      }
      const html = await renderPage(deps, routeModule, { data, csrfToken, actionData }, request.islandClientUrl, request.devPreambleUrl, {
        appHead: request.head,
        styles: request.styles,
      });
      await settle();

      return { status, html, setCookie: getSetCookie() };
    } catch (error) {
      // `throw redirect("/login")` from a loader or action.
      if (isRedirectResult(error)) {
        await settle().catch(() => {});
        return redirectTo(error);
      }
      // A thrown HttpError keeps its status (401 from requireAuth, 403 from
      // verifyCsrf, an app's own 400/404) instead of every failure being a
      // bare 500. Cookies already decided (e.g. a cleared dead session) still go out.
      await settle().catch(() => {});
      const status = errorStatus(error);
      return {
        status,
        html: renderErrorDocument(deps, {
          status,
          error,
          head: request.head,
          errorPage: request.errorPage,
          errorPageStyles: request.errorPageStyles,
          devPreambleUrl: request.devPreambleUrl,
        }),
        setCookie: getSetCookie(),
        error,
      };
    }
  }

  /** A standalone error page (e.g. a 404 for an unmatched URL), with the same rendering as above. */
  function renderError(options: RenderErrorOptions): { status: number; html: string } {
    return { status: options.status, html: renderErrorDocument(deps, options) };
  }

  // Attached rather than a separate export so every existing entry-server.tsx
  // (which exports only renderRoute/renderStatic/renderStreaming) gets it too.
  return Object.assign(renderRoute, { renderError });
}

export interface RenderStaticOptions {
  /** Where to fetch the island hydration bootstrap, if this page uses one —
   * same real hashed URL islandsBuildPlugin.ts resolves for ssr pages. */
  islandClientUrl?: string;
  /** Values for this render's `[param]` segments (architecture-v2.md §3.6) —
   * from a build-time `getStaticParams()` entry (buildAppStatic.ts), or a
   * live request's own matched params for dev/isr-regeneration (which
   * already have a real value, no `getStaticParams()` involved). Empty for
   * a non-dynamic route. */
  params?: RawRouteParams;
  /** Dev-mode-only React Refresh preamble virtual module URL — see
   * html.ts's `renderTail` doc comment. Never set in production (a real
   * build's ssg/isr pre-render has no Vite dev server/HMR to preamble for
   * in the first place). */
  devPreambleUrl?: string;
  /** The page's own URL (no query) for `ctx.url` — e.g. "https://example.com/about". */
  url?: string;
  /** app.config.ts `head`. */
  head?: HeadConfig;
  /** URLs of the CSS this route imports. */
  styles?: string[];
}

/**
 * Build-time render for `ssg`/`isr` routes (see buildAppStatic.ts) — no
 * request, so no session/cookie/action machinery around it at all; a
 * route exporting `action` for one of these modes is a build-time error
 * (buildAppStatic.ts's guard), not something this function needs to check.
 */
export function createRenderStatic(deps: RenderRouteDeps) {
  return async function renderStatic(
    routeModule: RouteModule,
    options: RenderStaticOptions = {}
  ): Promise<{ html: string }> {
    if (typeof routeModule.default !== "function") {
      throw new Error("[devora] route has no default export component");
    }
    const ctx = createBuildTimeContext(
      options.params,
      options.url ? { url: options.url, method: "GET", headers: {} } : undefined
    );
    const data = routeModule.loader ? await routeModule.loader(ctx) : undefined;
    const html = await renderPage(deps, routeModule, { data }, options.islandClientUrl, options.devPreambleUrl, {
      appHead: options.head,
      styles: options.styles,
    });
    return { html };
  };
}
