import { renderHtmlDocument } from "./html.js";
import { createRequestContext } from "./session.js";
import { createIslandCollector, IslandCollectorContext } from "./islandComponent.js";
import { isRedirectResult } from "./actionResult.js";
import { createBuildTimeContext } from "./buildTimeContext.js";
import type { RouteModule } from "./route.js";
import type { SessionCookieOptions } from "./session.js";
import type { RenderMode } from "./config.js";

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
  sessionCookieOptions: SessionCookieOptions;
  /** Where to fetch the island hydration bootstrap — dev: "/island-client.tsx";
   * prod: the real built asset URL, or undefined if this app has no islands. */
  islandClientUrl?: string;
  /** Project/app-level default render mode (AppRuntimeConfig.defaultRenderMode),
   * used only when the route file itself has no explicit `renderMode` export. */
  appDefaultRenderMode?: RenderMode;
}

export interface RenderRouteResult {
  status: number;
  html: string;
  setCookie?: string[];
  /** Set only for a redirect (see actionResult.ts's redirect()) — `html` is
   * empty and the caller should send a 302 + Location instead of a body. */
  redirectTo?: string;
}

export interface RenderRouteDeps {
  createElement: (type: unknown, props: unknown, ...children: unknown[]) => unknown;
  renderToString: (element: unknown) => string;
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
  data: unknown,
  csrfToken: string | undefined,
  islandClientUrl: string | undefined
): Promise<string> {
  const collector = createIslandCollector();
  const element = deps.createElement(
    IslandCollectorContext.Provider,
    { value: collector },
    deps.createElement(routeModule.default as never, { data, csrfToken })
  );

  let bodyHtml = deps.renderToString(element);
  if (collector.pending.length > 0) {
    await Promise.all(collector.pending);
    bodyHtml = deps.renderToString(element);
  }

  const meta = routeModule.meta?.(data);
  const hasHydratableIsland = [...collector.resolved.keys()].some((d) => d.clientUrl);
  const islandScriptUrl = hasHydratableIsland ? islandClientUrl : undefined;

  return renderHtmlDocument({ bodyHtml, meta, islandScriptUrl });
}

export function createRenderRoute(deps: RenderRouteDeps) {
  return async function renderRoute(
    routeModule: RouteModule,
    request: RenderRouteRequest
  ): Promise<RenderRouteResult | null> {
    const renderMode = resolveRenderMode(routeModule, request.appDefaultRenderMode);
    if (renderMode !== "ssr") {
      // Only "ssr" is wired up in this slice — ssg/csr/streaming/isr are next.
      return null;
    }

    if (typeof routeModule.default !== "function") {
      throw new Error("[devora] route has no default export component");
    }

    const { ctx, csrfToken, getSetCookie } = createRequestContext(
      request.cookieHeader,
      request.sessionCookieOptions
    );

    if (request.method === "POST" && request.formData && routeModule.action) {
      const actionResult = await routeModule.action(request.formData, ctx);
      if (isRedirectResult(actionResult)) {
        // Skip loader and rendering entirely — nothing downstream of a
        // redirect (e.g. login setting a session cookie) needs the page's
        // own HTML in this response.
        return { status: 302, html: "", setCookie: getSetCookie(), redirectTo: actionResult.redirect };
      }
    }

    const data = routeModule.loader ? await routeModule.loader(ctx) : undefined;
    const html = await renderPage(deps, routeModule, data, csrfToken, request.islandClientUrl);

    return { status: 200, html, setCookie: getSetCookie() };
  };
}

export interface RenderStaticOptions {
  /** Where to fetch the island hydration bootstrap, if this page uses one —
   * same real hashed URL islandsBuildPlugin.ts resolves for ssr pages. */
  islandClientUrl?: string;
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
    const ctx = createBuildTimeContext();
    const data = routeModule.loader ? await routeModule.loader(ctx) : undefined;
    const html = await renderPage(deps, routeModule, data, undefined, options.islandClientUrl);
    return { html };
  };
}
