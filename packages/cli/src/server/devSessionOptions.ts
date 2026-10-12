import path from "node:path";
import type { ViteDevServer } from "vite";
import {
  createSessionOptionsResolver,
  toSessionManifest,
  type AuthMode,
  type SessionCookieOptions,
  type SessionManifest,
  type SessionsConfig,
} from "@devorajs/core";

/**
 * Dev's half of sessionConfig.ts: the store module (if `shared.sessions.store`
 * is a path) is loaded through this app's own Vite SSR module graph, the
 * same way route files are — so it shares module instances (e.g. a DB
 * client) with the routes that call `ctx.setSession()`, and edits to it are
 * picked up without restarting `devora dev`.
 *
 * Returns undefined for an auth: "none" app — nothing session-related is
 * ever resolved for it, secret included (see session.ts's
 * createNoAuthContext()).
 *
 * `manifest` is the app's resolved settings (resolveSessionManifest —
 * shared.sessions merged with its app.config.ts); without it, the
 * project-level settings alone.
 */
export function createDevSessionOptionsResolver(
  vite: ViteDevServer,
  projectRoot: string,
  sessions: SessionsConfig | undefined,
  authMode: AuthMode,
  appName: string,
  manifest: SessionManifest = toSessionManifest(sessions)
): (() => Promise<SessionCookieOptions>) | undefined {
  if (authMode === "none") return undefined;
  const storeModule = sessions?.store && sessions.store !== "memory" ? path.resolve(projectRoot, sessions.store) : undefined;
  const resolve = createSessionOptionsResolver(authMode, appName, manifest, () => vite.ssrLoadModule(storeModule!));
  // Dev is plain HTTP and never sets Secure, so the request's protocol
  // doesn't matter here (see sessionConfig.ts).
  return () => resolve();
}
