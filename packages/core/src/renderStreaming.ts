import { PassThrough } from "node:stream";
import { createRequestContext, createNoAuthContext } from "./session.js";
import { IslandStreamingContext, type StreamingIslandTracker } from "./islandComponent.js";
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
  /** Overrides `DEFAULT_STREAM_TIMEOUT_MS` — see that constant's doc
   * comment. Exposed mainly for tests; real callers should rarely need it. */
  streamTimeoutMs?: number;
}

/**
 * Real, previously-undiscovered gap closed here (Phase 4 security audit):
 * nothing anywhere in the streaming path (this file, ssrMiddleware.ts,
 * prodRequestHandler.ts, adapter-node) ever called `abort()` for a timeout
 * reason — only ever in response to a destination error. A Suspense
 * boundary whose island import never settles (a genuinely hung `fetch`
 * inside a loader, a dependency that never resolves) held the connection,
 * its `PassThrough`, and the whole render tree open indefinitely — worse
 * than the equivalent stall on `ssr`/`ssg`, which at least withholds every
 * byte rather than pinning a half-served connection. Self-hosted
 * deployments (adapter-node, Docker, a bare VPS) had zero protection;
 * Vercel/Netlify's own external duration caps were the only real backstop,
 * and only for those two targets. 30 seconds is generous for any real
 * page — genuine content typically streams in well under a second — while
 * still bounding the worst case for every deployment target.
 */
export const DEFAULT_STREAM_TIMEOUT_MS = 30_000;

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

    const islandTracker: StreamingIslandTracker = { hasIsland: false };
    const element = deps.createElement(
      IslandStreamingContext.Provider,
      { value: islandTracker },
      deps.createElement(routeModule.default as never, { data, csrfToken: undefined })
    );

    return {
      status: 200,
      setCookie: getSetCookie(),
      pipeTo(destination, onError) {
        let shellSent = false;
        let destinationErrored = false;
        let passThrough: PassThrough | undefined;

        // See DEFAULT_STREAM_TIMEOUT_MS's doc comment. `.unref()` so this
        // timer alone never keeps the process alive (e.g. in a test, or a
        // script that awaits the render and expects to exit promptly) —
        // real servers stay alive on their own listening socket regardless.
        const timeoutMs = request.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;
        const timeoutHandle = setTimeout(() => {
          abort(
            new Error(
              `[devora] streaming render exceeded ${timeoutMs}ms without completing — aborting rather than ` +
                `holding the connection open indefinitely (see DEFAULT_STREAM_TIMEOUT_MS's doc comment).`
            )
          );
        }, timeoutMs);
        timeoutHandle.unref?.();

        // Real bug fixed here: `destination` (a real ServerResponse, or an
        // EventEmitter shim — see adapter-netlify's response shim) can emit
        // its own `"error"` event independent of anything React does, most
        // realistically a client disconnecting mid-stream. Node's own
        // EventEmitter contract *throws* (crashing the whole process, not
        // just this request) if an `"error"` event has zero listeners —
        // there was no listener here at all before this fix. Also stops the
        // now-pointless render/stream via `abort()` (previously discarded
        // entirely — `const { pipe } = ...`) instead of letting React keep
        // rendering output nothing will ever consume, and marks the
        // destination as gone so the `passThrough` handlers below don't
        // then try to write React's own abort-reporting output (or the
        // document tail) to a destination that's already errored.
        destination.on("error", (error) => {
          destinationErrored = true;
          clearTimeout(timeoutHandle);
          abort(error);
          passThrough?.destroy();
        });

        const { pipe, abort } = deps.renderToPipeableStream(deps.createElement("div", { id: "root" }, element), {
          nonce: request.nonce,
          onShellReady() {
            shellSent = true;
            destination.write(renderDocumentHead(meta));

            passThrough = new PassThrough();
            pipe(passThrough);
            // Real bug fixed here (Phase 4 security audit): this used to be
            // a hand-rolled `passThrough.on("data", chunk =>
            // destination.write(chunk))` loop that never checked
            // `write()`'s boolean return value — the exact "ignoring
            // backpressure" mistake `stream.pipeline()`/`.pipe()` exist to
            // prevent. Measured impact: piping 12.5MB through the old
            // pattern into a deliberately slow destination accumulated
            // ~12.19MB in the destination's internal buffer; the same data
            // through `.pipe()` (which pauses the source on a `false`
            // return and resumes on `"drain"`, both automatically) kept it
            // at ~0.06MB. In production `destination` is a real
            // `http.ServerResponse` — a slow or throttled client could
            // otherwise force the server to buffer React's entire streamed
            // output in memory, unbounded, regardless of actual network
            // throughput. `{ end: false }` — this file's own `"end"`
            // handler below still needs to write the document tail and
            // call `destination.end()` itself.
            passThrough.pipe(destination, { end: false });
            passThrough.on("end", () => {
              clearTimeout(timeoutHandle);
              if (destinationErrored) return;
              destination.write(
                renderDocumentTail({
                  // Only when this render actually used an <Island> — see
                  // StreamingIslandTracker's doc comment. By the time
                  // React's stream has fully ended, every <Island> in the
                  // tree has already run at least once (even a suspended
                  // one runs up to the point it throws), so islandTracker
                  // is reliably settled here.
                  islandScriptUrl: islandTracker.hasIsland ? request.islandClientUrl : undefined,
                  devPreambleUrl: request.devPreambleUrl,
                })
              );
              destination.end();
            });
          },
          onShellError(error) {
            clearTimeout(timeoutHandle);
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
