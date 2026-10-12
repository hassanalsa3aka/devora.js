/**
 * CORS for API routes (`/api/**`) — `cors` in app.config.ts. Off unless
 * configured: without it no CORS headers are sent, so browsers keep their
 * same-origin default. Pages never get CORS headers.
 *
 *   defineApp({ cors: { origins: ["https://app.example.com", "https://*.example.com"] } })
 *
 * - An allowed `Origin` is echoed back (with `Vary: Origin`); any other
 *   origin gets no CORS headers, so the browser blocks it.
 * - A preflight (`OPTIONS` with `Access-Control-Request-Method`) is answered
 *   with 204 before any route runs.
 * - `credentials: true` lets cross-origin requests carry cookies; it can't
 *   be combined with `origins: "*"` (browsers reject that, and it would let
 *   any site make credentialed requests).
 */
export interface CorsConfig {
  /** Allowed origins ("https://app.example.com", or "https://*.example.com" for subdomains), or "*" for any. */
  origins: string[] | "*";
  /** Send `Access-Control-Allow-Credentials: true` (cookies on cross-origin requests). Default false. */
  credentials?: boolean;
  /** Methods allowed in a preflight. Default GET, HEAD, POST, PUT, PATCH, DELETE. */
  methods?: string[];
  /** Request headers allowed in a preflight. Default: whatever the preflight asks for. */
  allowHeaders?: string[];
  /** Response headers the browser may read (`Access-Control-Expose-Headers`). */
  exposeHeaders?: string[];
  /** Preflight cache time in seconds (`Access-Control-Max-Age`). Default 600. */
  maxAge?: number;
}

const DEFAULT_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
const ORIGIN_RE = /^https?:\/\/(\*\.)?[a-z0-9.-]+(:\d+)?$/i;

/** Validates `cors` (build/dev start) so a typo is an error, not a silently blocked origin. */
export function validateCorsConfig(appName: string, cors: CorsConfig | undefined): void {
  if (cors === undefined) return;
  const fail = (message: string) => new Error(`[devora] "${appName}": cors.${message}`);
  if (cors.origins !== "*") {
    if (!Array.isArray(cors.origins) || cors.origins.length === 0) throw fail(`origins must be "*" or a non-empty list of origins`);
    for (const origin of cors.origins) {
      if (typeof origin !== "string" || !ORIGIN_RE.test(origin)) {
        throw fail(`origins: "${origin}" isn't an origin — use scheme://host[:port] with no path, e.g. "https://app.example.com"`);
      }
    }
  }
  if (cors.credentials === true && cors.origins === "*") {
    throw fail(`credentials: true can't be combined with origins: "*" — list the origins that may send cookies`);
  }
}

function originAllowed(cors: CorsConfig, origin: string): boolean {
  if (cors.origins === "*") return true;
  const lower = origin.toLowerCase();
  return cors.origins.some((allowed) => {
    const pattern = allowed.toLowerCase();
    if (!pattern.includes("*.")) return pattern === lower;
    // "https://*.example.com" matches "https://a.example.com" (and deeper), not "https://example.com".
    const [scheme, rest] = pattern.split("://*.");
    return lower.startsWith(`${scheme}://`) && lower.endsWith(`.${rest}`) && lower.length > `${scheme}://.${rest}`.length;
  });
}

/**
 * CORS headers for one API request, and whether it's a preflight the
 * caller should answer with 204 and no further work.
 */
export function corsResponse(
  cors: CorsConfig | undefined,
  method: string,
  headers: Record<string, string | string[] | undefined>
): { headers: Record<string, string>; preflight: boolean } {
  const originHeader = headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const isPreflight = method === "OPTIONS" && headers["access-control-request-method"] !== undefined;
  if (!cors || !origin) return { headers: {}, preflight: false };
  if (!originAllowed(cors, origin)) return { headers: { Vary: "Origin" }, preflight: false };

  const out: Record<string, string> = {
    "Access-Control-Allow-Origin": cors.origins === "*" ? "*" : origin,
    Vary: "Origin",
  };
  if (cors.credentials) out["Access-Control-Allow-Credentials"] = "true";
  if (cors.exposeHeaders?.length) out["Access-Control-Expose-Headers"] = cors.exposeHeaders.join(", ");
  if (isPreflight) {
    out["Access-Control-Allow-Methods"] = (cors.methods ?? DEFAULT_METHODS).join(", ");
    const requested = headers["access-control-request-headers"];
    const allowHeaders = cors.allowHeaders?.join(", ") ?? (Array.isArray(requested) ? requested.join(", ") : requested);
    if (allowHeaders) out["Access-Control-Allow-Headers"] = allowHeaders;
    out["Access-Control-Max-Age"] = String(cors.maxAge ?? 600);
  }
  return { headers: out, preflight: isPreflight };
}
