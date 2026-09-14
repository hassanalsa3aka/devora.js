/**
 * Explicit domain modules (architecture-v2.md §3.1) — organizes shared
 * backend logic (`packages/backend`, mostly) into scoped units without a DI
 * container or reflection: composing modules is a plain function call
 * (`register()`), never metadata scanning. Modeled on Fastify's
 * plugin/encapsulation system, studied during v2 planning.
 *
 * **Scoping, made concrete without a container (a deliberate simplification
 * of the literal draft wording, flagged during v2 review):** a module's own
 * `functions`/`routes` are private to it. `register(child)` merges the
 * child's own routes into the parent's flattened route table, namespaced
 * under the child's `name` unless a child route already starts with `/` (an
 * explicit opt-out of prefixing, for a route that must live at a fixed
 * path — e.g. a webhook URL a third party already has on file). Nothing
 * flows the other way: a child module never gets implicit access to its
 * parent or siblings — true Fastify-style "child inherits parent's
 * decorations at registration time" would need passing a live context
 * object down into the child's own setup callback, which starts to look
 * like the very DI-shaped mechanism this plan (CLAUDE.md, architecture-v2.md
 * §2) locks out. If one module's function genuinely needs another's logic,
 * it imports it directly and explicitly — a plain module import, not
 * framework-mediated — same as any other TypeScript code.
 */
import type { ServerFn } from "./serverFn.js";
import type { ApiRouteHandler } from "./apiRoute.js";

export interface ModuleDefinition {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functions?: Record<string, ServerFn<any, any>>;
  /** Keyed by path relative to this module (e.g. "/webhooks/stripe", or
   * "/" for the module's own root) — see the doc comment above for
   * prefixing rules once registered into a parent. */
  routes?: Record<string, ApiRouteHandler>;
}

export interface DevoraModule {
  readonly name: string;
  /** This module's own functions only — a registered child's functions are
   * NOT merged in here (no cross-module surface unless explicitly imported;
   * see the module-level doc comment). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly functions: Readonly<Record<string, ServerFn<any, any>>>;
  /** Mounts `child`'s routes into this module's own flattened route table,
   * namespaced under `child.name` (see the module-level doc comment for the
   * `/`-prefixed opt-out). Does not expose `child.functions` — a module that
   * needs another module's function imports it directly. */
  register(child: DevoraModule): void;
  /** This module's own routes plus every registered child's (transitively),
   * fully namespaced/flattened — what a route dispatcher (apiDispatch.ts)
   * actually needs to resolve `path -> handler`. */
  getRoutes(): Readonly<Record<string, ApiRouteHandler>>;
}

/**
 * An explicit "//"-prefixed key opts out of namespacing entirely (see the
 * module-level doc comment) — used for a route that must live at a fixed
 * path regardless of which module happens to register it, e.g. a webhook
 * URL a third party already has on file. Real bug fixed here: this used to
 * *consume* the marker (`routeKey.slice(1)`) the first time a parent
 * flattened it in, so it only survived exactly one level of `register()` —
 * a module nested two or more levels deep (a real, intended use case per
 * `fromFastifyPlugin`'s own nested `instance.register()` support) silently
 * got re-prefixed by every level past the first. Fixed by propagating the
 * marker UNCHANGED through every intermediate join — see `RAW_ROUTES`
 * below for where it's finally stripped, exactly once, regardless of
 * nesting depth.
 */
function joinRoutePath(prefix: string, routeKey: string): string {
  if (routeKey.startsWith("/") === false) {
    throw new Error(`[devora] module route key "${routeKey}" must start with "/"`);
  }
  if (routeKey.startsWith("//")) return routeKey;
  if (routeKey === "/") return `/${prefix}`;
  return `/${prefix}${routeKey}`;
}

/**
 * Internal-only (a `Symbol` key, not part of the public `DevoraModule`
 * interface — explicit, not reflection: every module created by
 * `defineModule` carries this one extra, deliberately-hidden property so a
 * parent's `getRoutes()` can ask a child for its *unnormalized* routes,
 * with any "//"-prefixed marker still intact, during recursion. Only the
 * outermost `getRoutes()` call (whichever module a real caller actually
 * invokes it on) normalizes "//" down to "/", exactly once — see the
 * `joinRoutePath` doc comment for why intermediate levels can't do this
 * themselves.
 */
const RAW_ROUTES = Symbol("devora.module.rawRoutes");

interface ModuleInternal {
  [RAW_ROUTES](): Record<string, ApiRouteHandler>;
}

export function defineModule(def: ModuleDefinition, setup?: (m: DevoraModule) => void): DevoraModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const functions: Record<string, ServerFn<any, any>> = { ...(def.functions ?? {}) };
  const ownRoutes: Record<string, ApiRouteHandler> = { ...(def.routes ?? {}) };
  const children: DevoraModule[] = [];

  const mod: DevoraModule & ModuleInternal = {
    name: def.name,
    functions,
    register(child: DevoraModule): void {
      children.push(child);
    },
    [RAW_ROUTES](): Record<string, ApiRouteHandler> {
      const flattened: Record<string, ApiRouteHandler> = { ...ownRoutes };
      for (const child of children) {
        const childRaw = (child as unknown as ModuleInternal)[RAW_ROUTES]();
        for (const [childPath, handler] of Object.entries(childRaw)) {
          const fullPath = joinRoutePath(child.name, childPath);
          if (flattened[fullPath]) {
            throw new Error(
              `[devora] route "${fullPath}" is registered by more than one module under "${mod.name}"`
            );
          }
          flattened[fullPath] = handler;
        }
      }
      return flattened;
    },
    getRoutes(): Readonly<Record<string, ApiRouteHandler>> {
      const raw = mod[RAW_ROUTES]();
      const normalized: Record<string, ApiRouteHandler> = {};
      for (const [key, handler] of Object.entries(raw)) {
        normalized[key.startsWith("//") ? key.slice(1) : key] = handler;
      }
      return normalized;
    },
  };

  setup?.(mod);
  return mod;
}
