import type { RequestContext } from "./serverFn.js";

/**
 * A `ctx` for `ssg`/`isr` build-time rendering — there's no real request,
 * so no session/CSRF exists to check. An `ssg`/`isr` route is guarded
 * (see buildAppStatic.ts) against exporting `action` at all, so this
 * mostly exists to satisfy `loader`'s signature; if a loader does call one
 * of these, failing loudly beats silently no-op'ing.
 */
export function createBuildTimeContext(): RequestContext {
  return {
    session: undefined,
    requireAuth: () => {
      throw new Error("[devora] requireAuth() is not available at build time (ssg/isr routes render without a request)");
    },
    setSession: () => {
      throw new Error("[devora] setSession() is not available at build time (ssg/isr routes render without a request)");
    },
    clearSession: () => {
      throw new Error("[devora] clearSession() is not available at build time (ssg/isr routes render without a request)");
    },
    verifyCsrf: () => {
      throw new Error("[devora] verifyCsrf() is not available at build time (ssg/isr routes render without a request)");
    },
  };
}
