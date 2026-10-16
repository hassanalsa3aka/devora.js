import type { HeadConfig } from "./html.js";
import type { CorsConfig } from "./cors.js";

/**
 * Config surface for devora.config.ts (project-level) and
 * apps/<name>/app.config.ts (app-level). Kept deliberately small and
 * explicit — see architecture doc §2.2 "Explicit over implicit".
 */

/**
 * "none" is a real, explicit third state — not the same as omitting `auth`
 * (which means "inherit `shared.auth`"). An app with sessions enabled
 * ("shared"/"isolated") pays the real cost of a signed cookie carrier: a
 * `DEVORA_SESSION_SECRET`/`DEVORA_SESSION_SECRET_<APP>` is required in
 * production (throws if missing — see session.ts), with an insecure
 * dev-only fallback otherwise. An app with no login at all (a marketing
 * site, say) shouldn't have to configure a secret it will never use —
 * "none" opts it out of the entire cookie/session/CSRF carrier, not just
 * the requirement to set a secret. See session.ts's `createNoAuthContext()`.
 */
export type AuthMode = "shared" | "isolated" | "none";

export interface AppConfig {
  /** Unique app name, matches its directory name under apps/ by convention. */
  name: string;
  /** Path to the app directory, relative to the project root. */
  dir: string;
  /** Domain this app is served from in production. Used by generate:proxy. */
  domain: string;
  /**
   * Per-app auth override. Defaults to the project-level `shared.auth`.
   * "isolated" gives this app its own session context (e.g. a different
   * identity provider for an admin panel). "none" disables sessions for
   * this app entirely — `ctx.setSession()`/`clearSession()`/`requireAuth()`/
   * `verifyCsrf()` all throw a clear error instead of silently no-op'ing if
   * called, and no session-related env var is ever required or read.
   */
  auth?: AuthMode;
  /**
   * Preferred `devora dev` port for this app. Default: 10000 + this app's
   * index in `apps` (declaration order). If the port is taken, dev moves to
   * the next free one and says so. Doesn't affect `devora start`.
   */
  devPort?: number;
}

/** SameSite for the session and CSRF cookies. */
export type CookieSameSite = "lax" | "strict" | "none";

/**
 * Attributes of the cookies sessions use (session.ts). Every field applies
 * in production only (`devora start`, the Vercel/Netlify functions —
 * anything with NODE_ENV=production); `devora dev` keeps its cookies exactly
 * as before: never `Secure`, never `Domain`. Defaults reproduce the cookies
 * every earlier release set.
 */
export interface SessionCookieConfig {
  /**
   * `Secure` attribute (on the session and CSRF cookies):
   * - `true` (default): always. Browsers refuse a `Secure` cookie over plain
   *   HTTP (except on localhost), so a login served over plain HTTP won't
   *   stick — the server logs a warning when that happens.
   * - `"auto"`: only on HTTPS requests — a TLS connection, or
   *   `X-Forwarded-Proto: https` when the app has `trustProxy: true`
   *   (app.config.ts). For a deployment reachable over both.
   * - `false`: never. Only for a deliberately plain-HTTP deployment.
   */
  secure?: "auto" | boolean;
  /** `SameSite` attribute (session and CSRF cookies). Default `"lax"`.
   * `"none"` requires `secure: true` (browsers reject it otherwise). */
  sameSite?: CookieSameSite;
  /**
   * `Domain` attribute of the *session* cookie (the CSRF cookie always stays
   * host-only). Unset (default): host-only — a login on app.example.com is
   * not sent to admin.example.com. Set e.g. `"example.com"` to share one
   * login across subdomains: every app using it must be served from that
   * domain or a subdomain of it (checked at build/dev start).
   *
   * In `shared.sessions` it applies to the `auth: "shared"` apps only — an
   * isolated app's cookie stays host-only unless its own app.config.ts sets
   * one.
   */
  domain?: string;
}

/**
 * Server-side session storage for every app with auth "shared"/"isolated"
 * (session.ts, sessionStore.ts). Ignored by "none" apps.
 */
export interface SessionsConfig {
  /**
   * Where session records live:
   * - a path, relative to the project root, to a module whose default
   *   export is a `SessionStore` (`defineSessionStore({ get, set, delete })`)
   *   backed by your own DB/cache — what production should use;
   * - `"memory"` — an in-process map. Fine for dev and a single long-lived
   *   `devora start` process; wrong for serverless (Vercel/Netlify), where
   *   each instance would have its own empty map.
   *
   * Unset: dev falls back to memory with a warning; a production server
   * refuses to start (same posture as a missing session secret) rather
   * than silently picking memory.
   */
  store?: "memory" | (string & {});
  /** Seconds a new or just-renewed session stays "active". Default 86400 (1 day). */
  activeSeconds?: number;
  /** Seconds after that it stays usable ("idle", renewed on use) before it's
   * "dead". Default 1209600 (14 days). */
  idleSeconds?: number;
  /** Cookie attributes — see SessionCookieConfig. */
  cookie?: SessionCookieConfig;
}

/**
 * Per-app session overrides (app.config.ts `sessions`), merged over
 * `shared.sessions`. Lifetimes and `cookie.domain` are for `auth: "isolated"`
 * apps only: a shared app's session is one session across every shared app,
 * so those live in devora.config.ts.
 */
export interface AppSessionsConfig {
  activeSeconds?: number;
  idleSeconds?: number;
  cookie?: SessionCookieConfig;
}

export interface SharedConfig {
  /** Path to the shared core package. */
  core: string;
  /** Path to the shared backend package (packages/backend). Absent for a
   * project with no shared backend (create-devora's "frontend only" scope). */
  backend?: string;
  /** Project-level default auth mode. Individual apps may override it —
   * including overriding a "none" project default up to "shared"/"isolated"
   * for one app that does need login, or vice versa. */
  auth: AuthMode;
  sessions?: SessionsConfig;
}

export interface ProjectConfig {
  apps: AppConfig[];
  shared: SharedConfig;
}

export function defineProject(config: ProjectConfig): ProjectConfig {
  const names = new Set<string>();
  for (const app of config.apps) {
    if (names.has(app.name)) {
      throw new Error(`[framework.config] duplicate app name: "${app.name}"`);
    }
    names.add(app.name);
  }
  return config;
}

/** Resolves the effective auth mode for a given app (its override, or the project default). */
export function resolveAuthMode(project: ProjectConfig, appName: string): AuthMode {
  const app = project.apps.find((a) => a.name === appName);
  if (!app) throw new Error(`[framework.config] unknown app: "${appName}"`);
  return app.auth ?? project.shared.auth;
}

// --- App-level config (apps/<name>/app.config.ts) ---

export type RenderMode = "ssr" | "ssg" | "csr" | "streaming" | "isr";

export interface RevalidateConfig {
  seconds: number;
}

export interface AppRuntimeConfig {
  /**
   * Tags for every page's `<head>` — stylesheets, fonts, manifest, icon,
   * meta, external scripts, `<html lang>` — and whether the framework's
   * theme stylesheet is included (see HeadConfig in html.ts). A route adds
   * its own through `meta()`'s `head`.
   */
  head?: HeadConfig;
  /**
   * Largest request body accepted, in bytes — page-action forms (uploads
   * included) and API routes alike. Larger bodies get a 413. Default
   * 10485760 (10 MB).
   */
  maxBodyBytes?: number;
  /** CORS for this app's API routes (`/api/**`) — off unless set. See cors.ts. */
  cors?: CorsConfig;
  /** Default render mode for routes in this app that don't set their own. */
  defaultRenderMode?: RenderMode;
  /** Security headers, overridable per app per doc §7. */
  security?: {
    csp?: string;
    hsts?: boolean;
    frameOptions?: "DENY" | "SAMEORIGIN";
    /**
     * Send `X-Robots-Tag: noindex` on every response, so search engines
     * don't index this app (an admin panel, an internal tool). Default
     * false. On Vercel/Netlify it's also set on statically served files.
     */
    noindex?: boolean;
  };
  /**
   * Session overrides for this app, merged over devora.config.ts
   * `shared.sessions` — see AppSessionsConfig.
   */
  sessions?: AppSessionsConfig;
  /**
   * `false` turns off CSRF cookies for this app: no `devora_csrf` cookie is
   * ever set (useful for an API whose clients use Bearer tokens and keep no
   * cookies). `ctx.verifyCsrf()` then passes only for Bearer-authenticated
   * requests and rejects everything else with 403 — it never silently
   * passes. Default true.
   */
  csrf?: boolean;
  /**
   * Trust `X-Forwarded-Proto`/`-Host`/`-For` from a reverse proxy in front
   * of this app (nginx/Caddy from `devora generate:proxy`, a load balancer):
   * `true` trusts one proxy, a number trusts that many in a chain (a CDN in
   * front of nginx = 2).
   * Only enable it when the app is reachable *only* through that proxy —
   * otherwise a client can send the header itself. Used for
   * `sessions.cookie.secure: "auto"`, `ctx.url` and `ctx.ip`. Default false for `devora start`;
   * true inside the generated Vercel/Netlify functions, which only the
   * platform's own edge can reach (set it to false to opt out).
   */
  trustProxy?: boolean | number;
  /**
   * Serve /sitemap.xml for this app (§8). Opt-in, default false — a safer
   * default than opt-out: a newly scaffolded internal/admin app stays
   * unlisted with no extra config, and only a public-facing app (e.g.
   * marketing) needs to turn this on. See docs/history/BUILD-LOG.md #7.
   */
  sitemap?: boolean;
  /**
   * Backend-only app mode (architecture-v2.md §3.4) — this app is pure API
   * (`api/` routes only), no pages, no client build at all. Explicit, not
   * inferred from "this app's routes/ directory happens to be empty" —
   * consistent with §2.2's "explicit over implicit": an app can genuinely
   * have zero page routes temporarily without being backend-only. Default
   * false. When true: `devora build`/`devora dev` skip the Vite client
   * build and the `entry-server.tsx` SSR build entry entirely (no
   * `PageShell`/theme wiring to skip, since there's no page to wrap) —
   * see buildAppServer.ts and dev.ts.
   */
  backendOnly?: boolean;
  /**
   * Folder (relative to this app) holding its API route files. Default
   * `"api"`; new apps are scaffolded with `"endpoints"`. Only the folder
   * changes — URLs stay under `/api` (`endpoints/health.ts` → `/api/health`).
   * Use anything but `"api"` if this app deploys to Vercel with its Root
   * Directory set to the app: Vercel treats a top-level `api/` folder as its
   * own functions (see docs/guides/DEPLOYING.md). See apiDir.ts.
   */
  apiDir?: string;
  /**
   * Shell command(s) `devora build` (and `devora deploy`) runs in this app's
   * directory before building it — for codegen and asset steps a clean
   * checkout doesn't have yet (`prisma generate`, a Tailwind/CSS build).
   * Run in order; a non-zero exit fails the build. Not run by `devora dev`.
   */
  prebuild?: string | string[];
  /** Options for `devora build --adapter=vercel`. */
  vercel?: {
    /**
     * Function runtime written to `.vc-config.json`, e.g. `"nodejs22.x"`.
     * Default: picked from the running Node major / `engines.node` among the
     * runtimes Vercel supports — see adapter-vercel's runtime.ts.
     */
    runtime?: string;
  };
}

export function defineApp(config: AppRuntimeConfig): AppRuntimeConfig {
  return config;
}
