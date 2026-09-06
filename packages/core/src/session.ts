/**
 * The session *carrier* (ROADMAP.md #2): signs/verifies an opaque session
 * payload in a cookie, and resolves which cookie name + secret to use based
 * on an app's auth mode (shared vs. isolated, per architecture doc §3).
 *
 * Deliberately NOT an auth provider — nothing here checks credentials.
 * `ctx.setSession(data)` is called by app code (e.g. after checking a
 * password against the dev's own DB/provider); this module only makes that
 * session survive across requests, tamper-evidently. See §6/§11: no built-in
 * auth provider in v1, bring your own.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthMode } from "./config.js";
import type { RequestContext } from "./serverFn.js";
import { CSRF_COOKIE_NAME, CSRF_FORM_FIELD, generateCsrfToken, verifyCsrfToken } from "./csrf.js";

export interface SessionCookieOptions {
  name: string;
  secret: string;
}

const DEV_INSECURE_SECRET = "dev-insecure-session-secret-do-not-use-in-production";
let warnedForKey: string | undefined;

function resolveSecret(envKey: string): string {
  const configured = process.env[envKey] ?? process.env.DEVORA_SESSION_SECRET;
  if (configured) return configured;

  const label =
    envKey === "DEVORA_SESSION_SECRET" ? envKey : `${envKey} (or DEVORA_SESSION_SECRET)`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[devora] no session secret configured. Set ${label} before running in production — ` +
        `see ROADMAP.md #2.`
    );
  }
  if (warnedForKey !== envKey) {
    console.warn(
      `[devora] no ${label} set — using an insecure dev-only default. ` +
        `Set this before deploying (see ROADMAP.md #2).`
    );
    warnedForKey = envKey;
  }
  return DEV_INSECURE_SECRET;
}

/**
 * Shared apps use one project-wide cookie/secret; an isolated app (e.g. an
 * admin panel with its own identity provider, per §3) gets its own cookie
 * name and can be given its own secret via DEVORA_SESSION_SECRET_<APP>.
 */
export function resolveSessionCookieOptions(authMode: AuthMode, appName: string): SessionCookieOptions {
  if (authMode === "isolated") {
    const envKey = `DEVORA_SESSION_SECRET_${appName.toUpperCase()}`;
    return { name: `devora_session_${appName}`, secret: resolveSecret(envKey) };
  }
  return { name: "devora_session", secret: resolveSecret("DEVORA_SESSION_SECRET") };
}

export function signSession(data: unknown, opts: SessionCookieOptions): string {
  const payload = Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
  const sig = createHmac("sha256", opts.secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(cookieValue: string | undefined, opts: SessionCookieOptions): unknown | undefined {
  if (!cookieValue) return undefined;
  const dot = cookieValue.indexOf(".");
  if (dot === -1) return undefined;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const expected = createHmac("sha256", opts.secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * Shared cookie attributes for every cookie this module sets (session and
 * CSRF alike). `Secure` is conditional on NODE_ENV, not unconditional: it's
 * a real gap that it was missing even in production before, but browsers
 * silently *drop* a `Secure` cookie sent over plain HTTP — sending it
 * unconditionally would break the entire dev workflow (`http://localhost`).
 * This mirrors the exact conditional-on-NODE_ENV pattern `resolveSecret()`
 * above already uses for the insecure-dev-secret fallback.
 */
function buildCookieAttributes(): string {
  const base = "Path=/; HttpOnly; SameSite=Lax";
  return process.env.NODE_ENV === "production" ? `${base}; Secure` : base;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export interface RequestContextResult {
  ctx: RequestContext;
  /**
   * The CSRF token for *this* request — either the one already carried in
   * the incoming cookie, or a freshly generated one if this is a first
   * visit. A route embeds this into its rendered form (see csrf.ts's
   * `CsrfField`); `ctx.verifyCsrf` on a later POST checks the submitted
   * value against the cookie the browser actually sent, not this one.
   */
  csrfToken: string;
  /** Set-Cookie values to attach to the response — one per cookie that
   * changed this request (session set/clear, and/or a newly established
   * CSRF cookie), or undefined if nothing changed. */
  getSetCookie: () => string[] | undefined;
}

export function createRequestContext(
  cookieHeader: string | undefined,
  cookieOptions: SessionCookieOptions
): RequestContextResult {
  const cookies = parseCookieHeader(cookieHeader);
  let currentSession = verifySession(cookies[cookieOptions.name], cookieOptions);
  const pendingSetCookies: string[] = [];

  // Established once per browser, independent of login state, so a route
  // has something real to embed into a form and compare against even
  // before any session exists (e.g. the login form itself).
  const incomingCsrfCookie = cookies[CSRF_COOKIE_NAME];
  const csrfToken = incomingCsrfCookie ?? generateCsrfToken();
  if (!incomingCsrfCookie) {
    pendingSetCookies.push(`${CSRF_COOKIE_NAME}=${csrfToken}; ${buildCookieAttributes()}`);
  }

  const ctx: RequestContext = {
    get session() {
      return currentSession;
    },
    requireAuth: () => {
      if (currentSession === undefined) {
        throw new Error("[devora] requireAuth(): no active session");
      }
    },
    setSession: (data: unknown) => {
      currentSession = data;
      pendingSetCookies.push(`${cookieOptions.name}=${signSession(data, cookieOptions)}; ${buildCookieAttributes()}`);
    },
    clearSession: () => {
      currentSession = undefined;
      pendingSetCookies.push(`${cookieOptions.name}=; ${buildCookieAttributes()}; Max-Age=0`);
    },
    verifyCsrf: (formData: FormData) => {
      // Verified against the cookie actually sent on *this* request, not
      // the possibly-freshly-generated `csrfToken` above — a POST arriving
      // with no CSRF cookie at all has nothing legitimate to verify against
      // and must fail, not silently pass against a token nobody submitted.
      if (!verifyCsrfToken(incomingCsrfCookie, formData.get(CSRF_FORM_FIELD))) {
        throw new Error("[devora] verifyCsrf(): missing or invalid CSRF token");
      }
    },
  };

  return { ctx, csrfToken, getSetCookie: () => (pendingSetCookies.length > 0 ? pendingSetCookies : undefined) };
}
