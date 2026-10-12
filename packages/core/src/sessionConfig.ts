/**
 * Turns `shared.sessions` (devora.config.ts) into the `SessionCookieOptions`
 * a request needs, in both dev (packages/cli's middlewares, which load a
 * store module through Vite) and production (prodRequestHandler.ts, which
 * loads the pre-built `dist/server/session-store.js`). The two differ only
 * in *how* they import the store module; everything about what's allowed —
 * including production refusing to guess — lives here once.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AppSessionsConfig, AuthMode, CookieSameSite, SessionCookieConfig, SessionsConfig } from "./config.js";
import { resolveSessionScope, type ResolvedCookieAttributes, type SessionCookieOptions } from "./session.js";
import { getProcessMemorySessionStore, isSessionStore, type SessionStore } from "./sessionStore.js";

/** Written into `dist/server/` by buildAppServer.ts so a production server
 * (any adapter) knows what the build was configured with, without
 * re-reading devora.config.ts at runtime. */
export const SESSION_MANIFEST_FILE = "session-manifest.json";
/** Build key (buildKey.ts) of the bundled store module, when there is one. */
export const SESSION_STORE_BUILD_KEY = "session-store";

export interface SessionManifest {
  /** null = nothing configured. */
  store: "memory" | "module" | null;
  activePeriodMs?: number;
  idlePeriodMs?: number;
  /** This app's effective cookie settings (devora.config.ts merged with its
   * app.config.ts) — see SessionCookieConfig. Absent in a build from before
   * these settings existed, which then gets exactly the cookies it got then. */
  cookie?: SessionCookieConfig;
  /** false = app.config.ts `csrf: false`. */
  csrfCookie?: boolean;
}

export function toSessionManifest(sessions: SessionsConfig | undefined): SessionManifest {
  const store = sessions?.store === undefined ? null : sessions.store === "memory" ? "memory" : "module";
  return {
    store,
    activePeriodMs: sessions?.activeSeconds !== undefined ? sessions.activeSeconds * 1000 : undefined,
    idlePeriodMs: sessions?.idleSeconds !== undefined ? sessions.idleSeconds * 1000 : undefined,
  };
}

/** What resolveSessionManifest needs to know about one app. */
export interface SessionManifestInput {
  appName: string;
  /** The app's production domain from devora.config.ts — `cookie.domain` must cover it. */
  appDomain: string;
  authMode: AuthMode;
  /** devora.config.ts `shared.sessions`. */
  sessions: SessionsConfig | undefined;
  /** app.config.ts `sessions`. */
  appSessions?: AppSessionsConfig;
  /** app.config.ts `csrf`. */
  csrf?: boolean;
}

/**
 * One app's effective session settings — `shared.sessions` merged with its
 * app.config.ts overrides — validated, so a misconfiguration fails `devora
 * build`/`devora dev` with a reason instead of producing cookies a browser
 * silently rejects. Returns undefined for an `auth: "none"` app (which has
 * no sessions to configure — setting any is an error, not silently ignored).
 * The result is written into the build (session-manifest.json) and is the
 * only place production reads these settings from.
 */
export function resolveSessionManifest(input: SessionManifestInput): SessionManifest | undefined {
  const { appName, authMode, sessions, appSessions } = input;
  const fail = (message: string) => new Error(`[devora] "${appName}": ${message}`);

  if (authMode === "none") {
    if (appSessions !== undefined || input.csrf !== undefined) {
      throw fail(
        `app.config.ts sets ${appSessions !== undefined ? "`sessions`" : "`csrf`"}, but this app has auth: "none" ` +
          `(no sessions at all). Remove it, or give the app auth: "shared"/"isolated" in devora.config.ts.`
      );
    }
    return undefined;
  }

  for (const [where, config] of [
    ["shared.sessions", sessions],
    ["app.config.ts sessions", appSessions],
  ] as const) {
    for (const key of ["activeSeconds", "idleSeconds"] as const) {
      const value = config?.[key];
      if (value !== undefined && !(typeof value === "number" && Number.isFinite(value) && value > 0)) {
        throw fail(`${where}.${key} must be a positive number of seconds (got ${JSON.stringify(value)}).`);
      }
    }
  }

  if (authMode === "shared") {
    if (appSessions?.activeSeconds !== undefined || appSessions?.idleSeconds !== undefined) {
      throw fail(
        `per-app session lifetimes are only for auth: "isolated" apps — a shared session is one session across ` +
          `every shared app. Set shared.sessions.activeSeconds/idleSeconds in devora.config.ts instead.`
      );
    }
    if (appSessions?.cookie?.domain !== undefined) {
      throw fail(
        `sessions.cookie.domain in app.config.ts is only for auth: "isolated" apps — shared apps use ` +
          `shared.sessions.cookie.domain in devora.config.ts.`
      );
    }
  }

  const projectCookie = sessions?.cookie ?? {};
  const appCookie = appSessions?.cookie ?? {};
  // A shared app's cookie domain is the project's; an isolated app's cookie
  // stays host-only unless it sets its own — sending an isolated session
  // cookie to every subdomain would widen its exposure for no benefit.
  const domainSource = authMode === "shared" ? projectCookie.domain : appCookie.domain;
  const domain = domainSource === undefined ? undefined : normalizeCookieDomain(domainSource, fail);

  if (authMode === "shared" && domain !== undefined) {
    // Every shared app writes the same domain-wide cookie, so they can't
    // disagree about its attributes — the last app to set it would win.
    for (const key of ["secure", "sameSite"] as const) {
      if (appCookie[key] !== undefined && appCookie[key] !== projectCookie[key]) {
        throw fail(
          `sessions.cookie.${key} in app.config.ts differs from shared.sessions.cookie, but shared apps share one ` +
            `cookie across ${domain} — set it once in devora.config.ts.`
        );
      }
    }
  }

  const secure = appCookie.secure ?? projectCookie.secure;
  if (secure !== undefined && secure !== true && secure !== false && secure !== "auto") {
    throw fail(`sessions.cookie.secure must be true, false or "auto" (got ${JSON.stringify(secure)}).`);
  }
  const rawSameSite = appCookie.sameSite ?? projectCookie.sameSite;
  let sameSite: CookieSameSite | undefined;
  if (rawSameSite !== undefined) {
    const lowered = String(rawSameSite).toLowerCase();
    if (lowered !== "lax" && lowered !== "strict" && lowered !== "none") {
      throw fail(`sessions.cookie.sameSite must be "lax", "strict" or "none" (got ${JSON.stringify(rawSameSite)}).`);
    }
    sameSite = lowered;
  }
  if (sameSite === "none" && secure !== undefined && secure !== true) {
    throw fail(`sessions.cookie.sameSite "none" requires secure: true — browsers reject SameSite=None without Secure.`);
  }

  if (domain !== undefined) {
    const appDomain = input.appDomain.trim().toLowerCase().replace(/:\d+$/, "");
    if (appDomain !== domain && !appDomain.endsWith(`.${domain}`)) {
      throw fail(
        `sessions.cookie.domain "${domain}" doesn't cover this app's domain "${input.appDomain}" — browsers would ` +
          `reject the cookie. Use a domain the app is served from (or a parent of it).`
      );
    }
  }

  const active = authMode === "isolated" ? appSessions?.activeSeconds ?? sessions?.activeSeconds : sessions?.activeSeconds;
  const idle = authMode === "isolated" ? appSessions?.idleSeconds ?? sessions?.idleSeconds : sessions?.idleSeconds;
  const cookie: SessionCookieConfig = {};
  if (secure !== undefined) cookie.secure = secure;
  if (sameSite !== undefined) cookie.sameSite = sameSite;
  if (domain !== undefined) cookie.domain = domain;

  return {
    store: sessions?.store === undefined ? null : sessions.store === "memory" ? "memory" : "module",
    ...(active !== undefined ? { activePeriodMs: active * 1000 } : {}),
    ...(idle !== undefined ? { idlePeriodMs: idle * 1000 } : {}),
    ...(Object.keys(cookie).length > 0 ? { cookie } : {}),
    ...(input.csrf === false ? { csrfCookie: false } : {}),
  };
}

/** "Example.COM" / ".example.com" → "example.com"; anything that isn't a plain multi-label hostname is an error. */
function normalizeCookieDomain(raw: string, fail: (message: string) => Error): string {
  const domain = String(raw).trim().toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    throw fail(
      `sessions.cookie.domain "${raw}" must be a plain domain like "example.com" (no scheme, port or path, ` +
        `and not a single label like "localhost").`
    );
  }
  return domain;
}

const SAME_SITE_ATTRIBUTE: Record<CookieSameSite, ResolvedCookieAttributes["sameSite"]> = {
  lax: "Lax",
  strict: "Strict",
  none: "None",
};

let warnedDevSameSiteNone = false;

/**
 * The cookie attributes for one request. In production they follow the
 * manifest (Secure defaults to on, `"auto"` follows `isHttps`). Outside
 * production they stay what `devora dev` always set — no Secure, no Domain
 * — except that a configured SameSite applies (so Strict can be tried in
 * dev); "none" can't work without Secure, so dev falls back to Lax and says so.
 */
function createCookieAttributesResolver(manifest: SessionManifest, appName: string): (isHttps: boolean) => ResolvedCookieAttributes {
  const sameSite = manifest.cookie?.sameSite ?? "lax";
  if (process.env.NODE_ENV !== "production") {
    if (sameSite === "none" && !warnedDevSameSiteNone) {
      console.warn(
        `[devora] "${appName}": sessions.cookie.sameSite "none" needs Secure, which dev never sets — dev cookies use SameSite=Lax.`
      );
      warnedDevSameSiteNone = true;
    }
    const devAttributes: ResolvedCookieAttributes = { secure: false, sameSite: sameSite === "none" ? "Lax" : SAME_SITE_ATTRIBUTE[sameSite] };
    return () => devAttributes;
  }
  const secure = manifest.cookie?.secure ?? true;
  const domain = manifest.cookie?.domain;
  return (isHttps) => ({
    secure: secure === "auto" ? isHttps : secure,
    sameSite: SAME_SITE_ATTRIBUTE[sameSite],
    ...(domain !== undefined ? { domain } : {}),
  });
}

/** Per-request facts the transport layer knows and session options depend on. */
export interface SessionOptionsRequestInfo {
  /** Whether this request reached the app over HTTPS — a TLS socket, or a
   * trusted `X-Forwarded-Proto: https` (trustProxy.ts). Only consulted for
   * `secure: "auto"`. */
  isHttps?: boolean;
}

export function readSessionManifest(serverOutDir: string): SessionManifest {
  const manifestPath = path.join(serverOutDir, SESSION_MANIFEST_FILE);
  // A build from before session stores existed has no manifest — same as
  // "nothing configured", so production fails loudly instead of guessing.
  if (!existsSync(manifestPath)) return { store: null };
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as SessionManifest;
}

let warnedUnconfigured = false;

/**
 * The fallback when no store is configured: memory in dev (with a one-time
 * warning), a thrown error in production. Called when a handler is
 * created, not per request, so a misconfigured production server fails at
 * boot rather than on its first logged-in request.
 */
export function assertSessionStoreConfigured(manifest: SessionManifest): void {
  if (manifest.store !== null) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[devora] no session store configured. Set shared.sessions.store in devora.config.ts — ` +
        `a path to a module whose default export is a SessionStore backed by your database ` +
        `(see packages/backend/AUTH.md), or "memory" to explicitly accept in-process sessions ` +
        `(single long-lived server only — not serverless).`
    );
  }
  if (!warnedUnconfigured) {
    console.warn(
      `[devora] no shared.sessions.store set in devora.config.ts — using an in-memory session ` +
        `store (sessions are lost on restart). Production will refuse to start until one is set.`
    );
    warnedUnconfigured = true;
  }
}

/**
 * Builds a per-request resolver for an app's session options. `loadModule`
 * is only called when the manifest says "module". It's called per request
 * rather than cached here: both real callers are already cached by their
 * module system (Vite's SSR module graph in dev, which also picks up edits
 * to the store module; Node's `import()` cache in production), and a failed
 * load shouldn't be pinned forever.
 */
export function createSessionOptionsResolver(
  authMode: AuthMode,
  appName: string,
  manifest: SessionManifest,
  loadModule: () => Promise<unknown>
): (request?: SessionOptionsRequestInfo) => Promise<SessionCookieOptions> {
  assertSessionStoreConfigured(manifest);
  const scope = resolveSessionScope(authMode, appName);
  const periods = { activePeriodMs: manifest.activePeriodMs, idlePeriodMs: manifest.idlePeriodMs };
  const cookieAttributes = createCookieAttributesResolver(manifest, appName);
  const csrfCookie = manifest.csrfCookie !== false;

  const loadStore = async (): Promise<SessionStore> => {
    if (manifest.store !== "module") return getProcessMemorySessionStore();
    let store = ((await loadModule()) as { default?: unknown }).default;
    // esbuild's CJS output for the Vercel/Netlify function bundle can nest
    // the real default export one level deeper under Node's ESM/CJS
    // interop — the same gap prodRequestHandler.ts's
    // unwrapCjsDefaultInterop() documents for route modules.
    const nested = (store as { default?: unknown } | undefined)?.default;
    if (!isSessionStore(store) && isSessionStore(nested)) store = nested;
    if (!isSessionStore(store)) {
      throw new Error(
        "[devora] the shared.sessions.store module must default-export a SessionStore " +
          "({ get, set, delete }) — see defineSessionStore()"
      );
    }
    return store;
  };

  return async (request) => ({
    ...scope,
    ...periods,
    store: await loadStore(),
    cookie: cookieAttributes(request?.isHttps === true),
    csrfCookie,
  });
}
