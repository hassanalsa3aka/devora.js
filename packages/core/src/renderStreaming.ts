import { PassThrough } from "node:stream";
import { createRequestContext, createNoAuthContext } from "./session.js";
import { IslandStreamingContext } from "./islandComponent.js";
import { renderDocumentHead, renderDocumentTail } from "./html.js";
import type { RouteModule } from "./route.js";
import type { SessionCookieOptions } from "./session.js";
import type { RenderMode } from "./config.js";

/**
 * Streaming render (architecture-v2.md's Phase 3) — the piece the two-pass
 * island model (renderRoute.ts) fundamentally can't do:
 * `renderToPipeableStream` starts writing HTML before the whole tree is
 * ready, patching in each Suspense boundary's real content as it resolves.
 * GET-only, on purpose — an `action` (form mutation) needs to decide
 * "redirect or re-render" *before* any HTML is sent, which conflicts with
 * having already started streaming a response; ssg/isr took the same
 * "no action" restriction for an unrelated reason (see buildAppStatic.ts),
 * this is a second, independent reason this render mode doesn't support it.
 */
export interface RenderStreamingDeps {
  createElement: (type: unknown, props: unknown, ...children: unknown[]) => unknown;
  renderToPipeableStream: (
    element: unknown,
    options: {
      onShellReady?: () => void;
      onShellError?: (error: unknown) => void;
      onError?: (error: unknown) => void;
      /** React's own accommodation for a strict CSP with no `unsafe-inline`
       * — see securityHeaders.ts's `addNonceToCsp` doc comment for the full
       * account of the real, previously-undiscovered bug this fixes
       * (React's own inline Suspense-boundary-patch script, blocked
       * outright without it). Applied by React to every inline script IT
       * injects for this render; this framework's own script tags
       * (island-client.tsx, etc.) are external `src=` references, which
       * `'self'` in script-src already allows without needing the nonce. */
      nonce?: string;
    }
  ) => { pipe: (dest: NodeJS.WritableStream) => void; abort: (reason?: unknown) => void };
}

export interface RenderStreamingRequest {
  cookieHeader?: string;
  params?: Record<string, string>;
  sessionCookieOptions?: SessionCookieOptions;
  islandClientUrl?: string;
  appDefaultRenderMode?: RenderMode;
  /** Dev-mode-only React Refresh preamble virtual module URL — see
   * html.ts's `renderTail` doc comment. Never set in production. */
  devPreambleUrl?: string;
  /** This response's real CSP nonce — see `RenderStreamingDeps.
   * renderToPipeableStream`'s `nonce` doc comment. The caller (ssrMiddleware.ts/
   * prodRequestHandler.ts) generates it and must apply the SAME value to
   * this response's own Content-Security-Policy header, or React's inline
   * patch script gets a nonce attribute the browser has no reason to trust. */
  nonce?: string;
}

export interface StreamingRenderResult {
  status: number;
  setCookie?: string[];
  /**
   * Starts writing to `destination` immediately (the document head, then
   * React's own streamed output, then the document tail once React's
   * stream ends) — a real Node Writable, e.g. an HTTP response or a
   * PassThrough an adapter wraps into a Web ReadableStream (Netlify's
   * wrapper does exactly this — see adapters/adapter-netlify/src/index.ts).
   *
   * `onError`'s `phase` distinguishes two genuinely different situations a
   * caller needs to react to differently: `"shell"` means the shell itself
   * (everything not inside a Suspense boundary) failed — `destination.write`
   * was never called, so the caller can still send a real error response
   * instead. `"boundary"` means a Suspense boundary past the shell failed
   * after streaming already started — React keeps that boundary's fallback
   * permanently and the response continues; this is a reporting hook only,
   * nothing about the already-sent response can change at that point.
   */
  pipeTo: (destination: NodeJS.WritableStream, onError?: (error: unknown, phase: "shell" | "boundary") => void) => void;
}

export function createRenderStreaming(deps: RenderStreamingDeps) {
  return async function renderStreaming(
    routeModule: RouteModule,
    request: RenderStreamingRequest
  ): Promise<StreamingRenderResult | null> {
    if (typeof routeModule.default !== "function") {
      throw new Error("[devora] route has no default export component");
    }

    const { ctx, getSetCookie } = request.sessionCookieOptions
      ? createRequestContext(request.cookieHeader, request.sessionCookieOptions, request.params)
      : createNoAuthContext(request.params);

    // Awaited before any HTML is written — real headers (including
    // Set-Cookie) must be decided before a streaming response starts, and
    // this framework's session cookies are already fully resolved by the
    // time `createRequestContext` above returns (loader can't add a new
    // one; only setSession()/clearSession() can, and those aren't
    // reachable without an `action`, which this render mode doesn't run).
    const data = routeModule.loader ? await routeModule.loader(ctx) : undefined;
    const meta = routeModule.meta?.(data);

    const element = deps.createElement(
      IslandStreamingContext.Provider,
      { value: true },
      deps.createElement(routeModule.default as never, { data, csrfToken: undefined })
    );

    return {
      status: 200,
      setCookie: getSetCookie(),
      pipeTo(destination, onError) {
        let shellSent = false;

        const { pipe } = deps.renderToPipeableStream(deps.createElement("div", { id: "root" }, element), {
          nonce: request.nonce,
          onShellReady() {
            shellSent = true;
            destination.write(renderDocumentHead(meta));

            const passThrough = new PassThrough();
            pipe(passThrough);
            passThrough.on("data", (chunk: Buffer) => destination.write(chunk));
            passThrough.on("end", () => {
              destination.write(
                renderDocumentTail({ islandScriptUrl: request.islandClientUrl, devPreambleUrl: request.devPreambleUrl })
              );
              destination.end();
            });
          },
          onShellError(error) {
            onError?.(error, "shell");
          },
          onError(error) {
            // React calls this for a shell error too (in addition to
            // onShellError above) — only report it here if the shell had
            // already been sent, so a shell failure is reported exactly
            // once, as "shell", not twice.
            if (shellSent) onError?.(error, "boundary");
          },
        });
      },
    };
  };
}
