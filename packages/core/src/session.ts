/**
 * Unified session auth (devora-pre-v3-hotfixes.md, "Architecture addendum —
 * unified session auth"; supersedes #5 and #7). One session primitive, two
 * transports, one lookup function:
 *
 * - The session ID is 256 bits of randomness — opaque, NOT a signed/JWT-style
 *   token. The record lives server-side in a `SessionStore` (sessionStore.ts),
 *   so `ctx.revokeSession()` deleting it kills the session on every
 *   transport at once. (Before this, the cookie *was* the session — a signed
 *   payload nothing could revoke short of rotating the secret, and API/mobile
 *   clients had to hand-roll a parallel Bearer scheme on top of it.)
 * - `resolveSession()` below is the only lookup. It reads
 *   `Authorization: Bearer <id>` (mobile/API clients) or, only when no Bearer
 *   header is present, the HttpOnly session cookie (browsers) — Sanctum's
 *   dual-guard order. A request that sends a Bearer header is never
 *   authenticated by a cookie, even if the Bearer token turns out to be
 *   invalid: that keeps "was this request authenticated by ambient browser
 *   credentials?" (the only case CSRF is about) unambiguous.
 * - States (Lucia's model): "active" → normal; "idle" → past the active
 *   window but still valid, and using it silently extends both windows
 *   (same ID — no refresh-token round trip for the client); "dead" →
 *   expired or revoked, must log in again.
 * - CSRF (`ctx.verifyCsrf()`) is enforced for cookie-authenticated and
 *   unauthenticated requests, and skipped for Bearer-authenticated ones: a
 *   cross-site page can make a browser attach cookies automatically, but it
 *   can't make it attach an `Authorization` header.
 *
 * Still NOT an auth provider — nothing here checks credentials. App code
 * checks who the caller is (§6/§11: bring your own) and then calls
 * `ctx.setSession(data)`; this module makes that result survive across
 * requests, and makes it revocable.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthMode } from "./config.js";
import type { RequestContext, SessionTransport } from "./serverFn.js";
import { CSRF_COOKIE_NAME, CSRF_FORM_FIELD, generateCsrfToken, verifyCsrfToken } from "./csrf.js";
import { HttpError } from "./httpError.js";
import { getSessionState, type SessionRecord, type SessionState, type SessionStore } from "./sessionStore.js";

export interface SessionCookieOptions {
  /** Cookie name, and also the auth scope the session ID is bound to — see
   * `sessionStoreKey()`. "devora_session" for shared apps,
   * "devora_session_<app>" for an isolated one. */
  name: string;
  /** Keys the HMAC that turns a session ID into its store key. */
  secret: string;
  store: SessionStore;
  /** How long a fresh (or just-renewed) session stays "active". Default 1 day. */
  activePeriodMs?: number;
  /** How long after the active window it stays usable ("idle") before it's
   * "dead". Default 14 days. */
  idlePeriodMs?: number;
}

export const DEFAULT_SESSION_ACTIVE_PERIOD_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_SESSION_IDLE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

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
/** The cookie name (= auth scope) and secret an app's sessions use — the
 * part of `SessionCookieOptions` that depends only on its auth mode. */
export function resolveSessionScope(authMode: AuthMode, appName: string): Pick<SessionCookieOptions, "name" | "secret"> {
  if (authMode === "isolated") {
    const envKey = `DEVORA_SESSION_SECRET_${appName.toUpperCase()}`;
    return { name: `devora_session_${appName}`, secret: resolveSecret(envKey) };
  }
  return { name: "devora_session", secret: resolveSecret("DEVORA_SESSION_SECRET") };
}

export function resolveSessionCookieOptions(
  authMode: AuthMode,
  appName: string,
  store: SessionStore,
  periods: { activePeriodMs?: number; idlePeriodMs?: number } = {}
): SessionCookieOptions {
  return { ...resolveSessionScope(authMode, appName), store, ...periods };
}

/**
 * The store key for a session ID: HMAC(secret, "<cookie name>:<id>").
 *
 * Two jobs. (1) A leaked copy of the store (a DB dump, a backup) contains
 * no usable tokens — the key can't be reversed into the ID a client sends.
 * (2) It carries forward the Phase 4 fix `signSession` below documents: an
 * isolated app (apps/admin) that falls back to the shared secret must still
 * not accept a shared-app session. Binding the cookie name — which is also
 * the auth scope — into the key means an ID issued under "devora_session"
 * simply doesn't exist under "devora_session_admin", whether it arrives as
 * a cookie or as a Bearer token (which has no name of its own to check).
 */
export function sessionStoreKey(sessionId: string, opts: Pick<SessionCookieOptions, "name" | "secret">): string {
  return createHmac("sha256", opts.secret).update(`${opts.name}:${sessionId}`).digest("base64url");
}

/** 32 random bytes, base64url — exactly 43 characters. */
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * @deprecated No longer used by the framework's own session handling — a
 * session is now an opaque ID backed by a `SessionStore` (see the module
 * doc comment), not a signed payload. Kept exported only so code built on
 * it (e.g. a hand-rolled Bearer token scheme) keeps compiling while it
 * migrates to `ctx.setSession(data, { transport: "bearer" })`; a token
 * signed with this can never be revoked. Will be removed in a future
 * release.
 *
 * Real, previously-undiscovered bug fixed here (Phase 4 security audit): the
 * HMAC used to sign only `payload`, never `opts.name`. An "isolated" app
 * (e.g. apps/admin) that falls back to the shared secret — an explicitly
 * supported, documented configuration, see `resolveSecret` above, not a
 * misuse — produced signatures indistinguishable from the shared app's own
 * cookie. A valid `devora_session` cookie from the shared app could be
 * replayed verbatim as `devora_session_admin` and would verify successfully,
 * completely defeating "isolated" auth's one job. Cookie *name* scoping is a
 * browser-only convention (`Cookie:` headers are not domain/path-checked by
 * a server), so nothing before this fix actually enforced isolation at the
 * protocol level once secrets happened to collide. Binding the cookie name
 * into the signed input makes the two cookies cryptographically distinct
 * regardless of whether they share a secret — the real fix, not just relying
 * on operators to always set a distinct per-app secret (which stays
 * supported and recommended, but is no longer load-bearing for isolation).
 */
export function signSession(data: unknown, opts: SessionCookieOptions): string {
  const payload = Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
  const sig = createHmac("sha256", opts.secret).update(`${opts.name}:${payload}`).digest("base64url");
  return `${payload}.${sig}`;
}

/** @deprecated See `signSession`. */
export function verifySession(cookieValue: string | undefined, opts: SessionCookieOptions): unknown | undefined {
  if (!cookieValue) return undefined;
  const dot = cookieValue.indexOf(".");
  if (dot === -1) return undefined;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const expected = createHmac("sha256", opts.secret).update(`${opts.name}:${payload}`).digest("base64url");
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
function buildCookieAttributes(maxAgeSeconds?: number): string {
  let attrs = "Path=/; HttpOnly; SameSite=Lax";
  if (maxAgeSeconds !== undefined) attrs += `; Max-Age=${maxAgeSeconds}`;
  return process.env.NODE_ENV === "production" ? `${attrs}; Secure` : attrs;
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

/** What `resolveSession()` needs off a request — both possible transports. */
export interface SessionRequestInfo {
  cookieHeader?: string;
  authorizationHeader?: string | string[];
}

export interface ResolvedSession {
  /** Which transport the request presented a session ID on (whether or not
   * it turned out to be valid) — undefined if it presented none. */
  presentedTransport: SessionTransport | undefined;
  /** "dead" covers expired, revoked, unknown, and malformed IDs alike. */
  state: SessionState | "none";
  /** Set only when `state` is "active" or "idle" (idle has already been renewed). */
  sessionId?: string;
  record?: SessionRecord;
  /** True when an idle session was just renewed — a cookie-carried session
   * needs its cookie re-issued so the browser's Max-Age matches. */
  renewed: boolean;
}

/**
 * Reads the Bearer token from an `Authorization` header, if it's a Bearer
 * header at all. A non-Bearer scheme (e.g. Basic, set by something in front
 * of the app) returns `undefined` rather than blocking the cookie path.
 */
export function readBearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return undefined;
  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(value);
  return match ? match[1] : undefined;
}

function periodsOf(opts: SessionCookieOptions): { active: number; idle: number } {
  return {
    active: opts.activePeriodMs ?? DEFAULT_SESSION_ACTIVE_PERIOD_MS,
    idle: opts.idlePeriodMs ?? DEFAULT_SESSION_IDLE_PERIOD_MS,
  };
}

/**
 * THE session lookup — the one function both transports resolve through
 * (see the module doc comment). Bearer header first; the cookie only when
 * no Bearer header was sent at all. An idle session is renewed here, as a
 * side effect of being used; a dead one is deleted from the store.
 */
export async function resolveSession(
  request: SessionRequestInfo,
  opts: SessionCookieOptions,
  now: number = Date.now()
): Promise<ResolvedSession> {
  const bearer = readBearerToken(request.authorizationHeader);
  const presentedTransport: SessionTransport | undefined =
    bearer !== undefined ? "bearer" : parseCookieHeader(request.cookieHeader)[opts.name] ? "cookie" : undefined;
  const sessionId = bearer ?? parseCookieHeader(request.cookieHeader)[opts.name];

  if (!presentedTransport || !sessionId) return { presentedTransport, state: "none", renewed: false };
  // Malformed IDs (including a pre-upgrade signed-payload cookie) never
  // reach the store at all.
  if (!SESSION_ID_PATTERN.test(sessionId)) return { presentedTransport, state: "dead", renewed: false };

  const key = sessionStoreKey(sessionId, opts);
  const record = await opts.store.get(key);
  const state = getSessionState(record, now);

  if (state === "dead" || !record) {
    if (record) await opts.store.delete(key);
    return { presentedTransport, state: "dead", renewed: false };
  }

  if (state === "idle") {
    const { active, idle } = periodsOf(opts);
    const renewedRecord: SessionRecord = { data: record.data, activeExpiresAt: now + active, expiresAt: now + active + idle };
    await opts.store.set(key, renewedRecord);
    return { presentedTransport, state, sessionId, record: renewedRecord, renewed: true };
  }

  return { presentedTransport, state, sessionId, record, renewed: false };
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
   * changed this request (session set/renewed/cleared, and/or a newly
   * established CSRF cookie), or undefined if nothing changed. */
  getSetCookie: () => string[] | undefined;
  /**
   * Resolves once every store write this request started
   * (`setSession`/`revokeSession`) has finished, and rejects if any failed.
   * The framework awaits this before sending a response, so a handler that
   * forgets to `await ctx.setSession(...)` still can't respond with a
   * session ID that was never actually stored.
   */
  settle: () => Promise<void>;
}

export async function createRequestContext(
  request: SessionRequestInfo,
  opts: SessionCookieOptions,
  params: Record<string, string> = {}
): Promise<RequestContextResult> {
  const cookies = parseCookieHeader(request.cookieHeader);
  const resolved = await resolveSession(request, opts);
  const pendingSetCookies: string[] = [];
  const pendingWrites: Promise<unknown>[] = [];

  let currentSessionId = resolved.sessionId;
  let currentRecord = resolved.record;
  let transport: SessionTransport | undefined = currentRecord ? resolved.presentedTransport : undefined;

  const sessionCookie = (sessionId: string, record: SessionRecord) =>
    `${opts.name}=${sessionId}; ${buildCookieAttributes(Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1000)))}`;
  const clearedSessionCookie = () => `${opts.name}=; ${buildCookieAttributes(0)}`;

  if (resolved.presentedTransport === "cookie") {
    if (resolved.state === "dead") pendingSetCookies.push(clearedSessionCookie());
    else if (resolved.renewed && currentSessionId && currentRecord) {
      pendingSetCookies.push(sessionCookie(currentSessionId, currentRecord));
    }
  }

  // Established once per browser, independent of login state, so a route
  // has something real to embed into a form and compare against even
  // before any session exists (e.g. the login form itself). Not issued to a
  // request that sent a Bearer header — that's an API/mobile client, which
  // neither needs CSRF protection nor keeps cookies.
  const incomingCsrfCookie = cookies[CSRF_COOKIE_NAME];
  const csrfToken = incomingCsrfCookie ?? generateCsrfToken();
  if (!incomingCsrfCookie && resolved.presentedTransport !== "bearer") {
    pendingSetCookies.push(`${CSRF_COOKIE_NAME}=${csrfToken}; ${buildCookieAttributes()}`);
  }

  // Every store write goes through here: wrapped so a store whose methods
  // are synchronous (or throw synchronously) behaves like an async one, and
  // tracked for settle(). The rejection is observed by settle() (and by the
  // caller, if they awaited), so this copy mustn't raise an
  // unhandled-rejection warning on its own.
  const track = <T>(write: () => Promise<T> | T): Promise<T> => {
    const promise = (async () => write())();
    pendingWrites.push(promise);
    promise.catch(() => {});
    return promise;
  };

  const revokeSession = (sessionId?: string): Promise<void> => {
    if (sessionId !== undefined && sessionId !== currentSessionId) {
      // Revoking some *other* session of this scope (e.g. "sign out my
      // other devices", with IDs the app recorded from setSession()).
      if (!SESSION_ID_PATTERN.test(sessionId)) return Promise.resolve();
      const otherKey = sessionStoreKey(sessionId, opts);
      return track(() => opts.store.delete(otherKey));
    }
    if (currentSessionId === undefined) return Promise.resolve();
    const key = sessionStoreKey(currentSessionId, opts);
    if (transport === "cookie") pendingSetCookies.push(clearedSessionCookie());
    currentSessionId = undefined;
    currentRecord = undefined;
    transport = undefined;
    return track(() => opts.store.delete(key));
  };

  const ctx: RequestContext = {
    params,
    get session() {
      return currentRecord?.data;
    },
    get sessionTransport() {
      return transport;
    },
    requireAuth: () => {
      if (currentRecord === undefined) {
        throw new HttpError(401, "Authentication required");
      }
    },
    setSession: (data: unknown, options?: { transport?: SessionTransport }) => {
      // A new login always gets a new ID (rotating away from any session
      // this request already had) — prevents session fixation.
      const nextTransport = options?.transport ?? transport ?? "cookie";
      const previousId = currentSessionId;
      const sessionId = generateSessionId();
      const now = Date.now();
      const { active, idle } = periodsOf(opts);
      const record: SessionRecord = { data, activeExpiresAt: now + active, expiresAt: now + active + idle };

      currentSessionId = sessionId;
      currentRecord = record;
      transport = nextTransport;
      if (nextTransport === "cookie") pendingSetCookies.push(sessionCookie(sessionId, record));

      return track(async () => {
        if (previousId !== undefined) await opts.store.delete(sessionStoreKey(previousId, opts));
        await opts.store.set(sessionStoreKey(sessionId, opts), record);
        return sessionId;
      });
    },
    revokeSession,
    clearSession: () => revokeSession(),
    verifyCsrf: (submitted: FormData | string) => {
      // Bearer-authenticated requests are exempt — see the module doc
      // comment. Only a request that actually authenticated via Bearer
      // gets this pass; an unauthenticated one (including one whose Bearer
      // token was invalid) is checked like any other.
      if (transport === "bearer" && currentRecord !== undefined) return;
      // Verified against the cookie actually sent on *this* request, not
      // the possibly-freshly-generated `csrfToken` above — a POST arriving
      // with no CSRF cookie at all has nothing legitimate to verify against
      // and must fail, not silently pass against a token nobody submitted.
      const value = typeof submitted === "string" ? submitted : submitted.get(CSRF_FORM_FIELD);
      if (!verifyCsrfToken(incomingCsrfCookie, value)) {
        throw new HttpError(403, "Missing or invalid CSRF token");
      }
    },
  };

  return {
    ctx,
    csrfToken,
    getSetCookie: () => (pendingSetCookies.length > 0 ? pendingSetCookies : undefined),
    settle: async () => {
      // Loop: a write may be started while an earlier one is being awaited.
      for (let i = 0; i < pendingWrites.length; i++) await pendingWrites[i];
    },
  };
}

function sessionsDisabledError(method: string): Error {
  return new Error(
    `[devora] ctx.${method}() was called, but this app has sessions disabled ` +
      `(auth: "none" in devora.config.ts). Set auth: "shared" or "isolated" for ` +
      `this app if it needs login.`
  );
}

/**
 * The `ctx` an "none"-auth app gets instead of `createRequestContext`'s real
 * carrier — used by `renderRoute.ts` when `sessionCookieOptions` is absent
 * (see that file). Deliberately does not read or write any cookie at all
 * (no session cookie, no CSRF cookie either — CSRF protection in this
 * codebase is only ever paired with a login flow, so disabling sessions
 * disables the whole carrier, not just the parts that need a secret) —
 * this is what makes the app need zero session-related env vars: nothing
 * here ever calls `resolveSecret()`. The session methods below don't silently
 * no-op if called; they throw a clear, specific error explaining why,
 * since a silent no-op would be a confusing way to discover a login button
 * does nothing. See also `checkNoAuthUsage.ts` for the build-time version
 * of this same check, which catches the common case earlier.
 */
export function createNoAuthContext(params: Record<string, string> = {}): RequestContextResult {
  const ctx: RequestContext = {
    params,
    session: undefined,
    sessionTransport: undefined,
    requireAuth: () => {
      throw sessionsDisabledError("requireAuth");
    },
    setSession: () => {
      throw sessionsDisabledError("setSession");
    },
    revokeSession: () => {
      throw sessionsDisabledError("revokeSession");
    },
    clearSession: () => {
      throw sessionsDisabledError("clearSession");
    },
    verifyCsrf: () => {
      throw sessionsDisabledError("verifyCsrf");
    },
  };
  return { ctx, csrfToken: "", getSetCookie: () => undefined, settle: async () => {} };
}
