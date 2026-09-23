/**
 * The `api/**` error contract (devora-pre-v3-hotfixes.md #2/#6): every
 * response an API route produces — success, thrown error, or no route
 * matching at all — is JSON, never HTML. Before this, an uncaught throw in
 * an API handler fell through to Vite's `next(err)` (the dev HTML error
 * overlay) and an unmatched `/api/**` path fell through to Connect's
 * `Cannot GET /api/...` page, so a mobile/API client parsing `{ message }`
 * got an HTML document instead. Page routes are deliberately untouched —
 * they keep their existing HTML error behavior.
 *
 * `HttpError` is how framework code (and app code) says "this is a
 * deliberate, client-visible failure with this status" — `requireAuth()`
 * throws a 401, `verifyCsrf()` a 403. Anything else thrown is treated as an
 * internal error: its real message is shown in dev (where it's what the
 * developer needs), replaced by a generic one in production (where it may
 * carry internals a client shouldn't see) and logged server-side either way
 * — the same "logged, not leaked" behavior prod page routes already have.
 */
import type { ApiResponse } from "./apiRoute.js";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Duck-typed on purpose, not `instanceof HttpError`: in dev the CLI's own
 * bundled copy of this package and the copy Vite loads route files against
 * are two different module instances, so `instanceof` would silently fail
 * across them. Also means an app's existing error class with a numeric
 * `status`/`statusCode` (the common http-errors/Fastify/h3 convention — e.g.
 * a hand-rolled `ApiError(401, "...")`) keeps its status and message
 * instead of being flattened into a 500.
 */
export function getHttpErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate = (err as { status?: unknown; statusCode?: unknown }).status ?? (err as { statusCode?: unknown }).statusCode;
  if (typeof candidate !== "number" || !Number.isInteger(candidate)) return undefined;
  return candidate >= 400 && candidate <= 599 ? candidate : undefined;
}

export function jsonMessageResponse(status: number, message: string, headers?: Record<string, string>): ApiResponse {
  return {
    status,
    headers: { ...(headers ?? {}), "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message }),
  };
}

/** The JSON 404 for any `/api/**` request that matches no route file. */
export function apiNotFoundResponse(): ApiResponse {
  return jsonMessageResponse(404, "Not found");
}

/**
 * Converts anything thrown by (or around) an API handler into the
 * `{ message }` JSON envelope. A deliberate 4xx/5xx `HttpError`-shaped error
 * keeps its status and message; anything else becomes a 500.
 */
export function apiErrorResponse(err: unknown): ApiResponse {
  const status = getHttpErrorStatus(err);
  if (status !== undefined) {
    // A deliberately-thrown HttpError chose its status and message on
    // purpose (including a 5xx like a 503 "maintenance") — pass both through.
    if (status >= 500) console.error("[devora] API route error:", err);
    return jsonMessageResponse(status, errorMessage(err) || "Request failed");
  }

  console.error("[devora] API route error:", err);
  const message =
    process.env.NODE_ENV === "production" ? "Internal Server Error" : errorMessage(err) || "Internal Server Error";
  return jsonMessageResponse(500, message);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}
