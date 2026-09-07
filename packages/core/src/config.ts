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
}

export interface SharedConfig {
  /** Path to the shared core package. */
  core: string;
  /** Path to the shared backend package (packages/backend). */
  backend: string;
  /** Project-level default auth mode. Individual apps may override it —
   * including overriding a "none" project default up to "shared"/"isolated"
   * for one app that does need login, or vice versa. */
  auth: AuthMode;
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
}

export function defineApp(config: AppRuntimeConfig): AppRuntimeConfig {
  return config;
}
