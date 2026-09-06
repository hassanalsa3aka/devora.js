/**
 * Config surface for devora.config.ts (project-level) and
 * apps/<name>/app.config.ts (app-level). Kept deliberately small and
 * explicit — see architecture doc §2.2 "Explicit over implicit".
 */

export type AuthMode = "shared" | "isolated";

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
   * identity provider for an admin panel).
   */
  auth?: AuthMode;
}

export interface SharedConfig {
  /** Path to the shared core package. */
  core: string;
  /** Path to the shared backend package (packages/backend). */
  backend: string;
  /** Project-level default auth mode. Individual apps may override it. */
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
