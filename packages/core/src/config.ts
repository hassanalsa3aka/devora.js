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
  /** Default render mode for routes in this app that don't set their own. */
  defaultRenderMode?: RenderMode;
  /** Security headers, overridable per app per doc §7. */
  security?: {
    csp?: string;
    hsts?: boolean;
    frameOptions?: "DENY" | "SAMEORIGIN";
  };
  /**
   * Serve /sitemap.xml for this app (§8). Opt-in, default false — a safer
   * default than opt-out: a newly scaffolded internal/admin app stays
   * unlisted with no extra config, and only a public-facing app (e.g.
   * marketing) needs to turn this on. See ROADMAP.md #7.
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
}

export function defineApp(config: AppRuntimeConfig): AppRuntimeConfig {
  return config;
}
