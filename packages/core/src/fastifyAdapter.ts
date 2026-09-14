/**
 * `fromFastifyPlugin` (architecture-v2.md §3.3) — Fastify's own plugin
 * shape, `(instance, options, done) => void`, is close enough to this
 * framework's module shape (module.ts) that adapting it is a small,
 * genuinely useful bridge: a real Fastify plugin registers routes on
 * `instance` the same way `defineModule`'s `routes` field declares them.
 *
 * Deliberately a real but PARTIAL subset, not full Fastify compatibility
 * (architecture-v2.md §6 rules that out explicitly) — supported: HTTP-verb
 * route registration (`get`/`post`/`put`/`patch`/`delete`) and nested
 * `instance.register(subPlugin)`. NOT supported, and thrown loudly rather
 * than silently ignored if a plugin tries: `addHook`, `decorate`, schema
 * validation, content-type parsers, or anything else Fastify's real
 * `FastifyInstance` exposes — a plugin that only registers routes (the
 * common case for a small, focused plugin) works; one that leans on
 * Fastify's broader ecosystem features does not, and says so immediately
 * instead of quietly dropping behavior a caller would reasonably expect.
 */
import { apiRoute, type ApiRequest, type ApiRouteHandler } from "./apiRoute.js";
import { defineModule, type DevoraModule } from "./module.js";
import type { RequestContext } from "./serverFn.js";

export interface FastifyLikeRequest {
  method: string;
  url: string;
  params: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

export interface FastifyLikeReply {
  code(statusCode: number): FastifyLikeReply;
  header(name: string, value: string): FastifyLikeReply;
  send(payload?: string | Buffer): void;
}

export type FastifyLikeRouteHandler = (
  request: FastifyLikeRequest,
  reply: FastifyLikeReply
) => unknown | Promise<unknown>;

export interface FastifyLikeInstance {
  get(path: string, handler: FastifyLikeRouteHandler): void;
  post(path: string, handler: FastifyLikeRouteHandler): void;
  put(path: string, handler: FastifyLikeRouteHandler): void;
  patch(path: string, handler: FastifyLikeRouteHandler): void;
  delete(path: string, handler: FastifyLikeRouteHandler): void;
  register(plugin: FastifyPlugin): void;
}

export type FastifyPlugin = (instance: FastifyLikeInstance, options: Record<string, never>, done: () => void) => void;

const UNSUPPORTED_METHODS = ["addHook", "decorate", "decorateRequest", "decorateReply", "addSchema"];

function toApiHandler(fastifyHandler: FastifyLikeRouteHandler): ApiRouteHandler {
  return apiRoute(async (req: ApiRequest, _ctx: RequestContext) => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let body: string | Buffer | undefined;

    const reply: FastifyLikeReply = {
      code(sc) {
        statusCode = sc;
        return reply;
      },
      header(name, value) {
        headers[name] = value;
        return reply;
      },
      send(payload) {
        body = payload;
      },
    };

    const request: FastifyLikeRequest = {
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      body: req.body,
    };

    const returned = await fastifyHandler(request, reply);
    // Fastify allows a handler to just `return` its payload instead of
    // calling reply.send() — support that shape too, since it's the more
    // common one in real plugins.
    if (body === undefined && returned !== undefined) {
      body = typeof returned === "string" || Buffer.isBuffer(returned) ? returned : JSON.stringify(returned);
    }
    return { status: statusCode, headers, body };
  });
}

/**
 * Adapts a real Fastify plugin into a `DevoraModule` — see this file's doc
 * comment for exactly which subset of the Fastify plugin API is supported.
 * Runs `plugin` synchronously to collect its route registrations *before*
 * constructing the module (module.ts's `defineModule` only reads its
 * `routes` once, at construction time — there's no dynamic "add a route
 * later" escape hatch, deliberately, so this adapter builds the full
 * route table first instead of asking module.ts for one).
 */
export function fromFastifyPlugin(name: string, plugin: FastifyPlugin): DevoraModule {
  const routes: Record<string, ApiRouteHandler> = {};
  const children: DevoraModule[] = [];
  // Real bug fixed here: every nested `instance.register(subPlugin)` used to
  // name the new module the same fixed `${name}-sub`, so two *different*
  // sibling sub-plugins registered under the same parent collided under the
  // identical name — module.ts's route flattening namespaces by `child.name`,
  // so same-named siblings either silently shared a namespace or (if they
  // happened to declare a route at the same relative path) tripped module.ts's
  // duplicate-route check with a misleading "registered by more than one
  // module" error naming neither plugin distinctly. An incrementing counter,
  // scoped per parent, gives each sub-plugin a real, distinct name.
  let subPluginCount = 0;

  const instance: FastifyLikeInstance = {
    get: (path, handler) => (routes[path] = toApiHandler(handler)),
    post: (path, handler) => (routes[path] = toApiHandler(handler)),
    put: (path, handler) => (routes[path] = toApiHandler(handler)),
    patch: (path, handler) => (routes[path] = toApiHandler(handler)),
    delete: (path, handler) => (routes[path] = toApiHandler(handler)),
    register: (subPlugin) => children.push(fromFastifyPlugin(`${name}-sub-${subPluginCount++}`, subPlugin)),
  };

  for (const unsupported of UNSUPPORTED_METHODS) {
    Object.defineProperty(instance, unsupported, {
      get() {
        throw new Error(
          `[devora] fromFastifyPlugin("${name}"): this plugin calls instance.${unsupported}(), which ` +
            `isn't supported by this adapter (route registration and nested register() only — see ` +
            `fastifyAdapter.ts's doc comment).`
        );
      },
    });
  }

  let doneCalled = false;
  plugin(instance, {}, () => {
    doneCalled = true;
  });
  if (!doneCalled) {
    throw new Error(
      `[devora] fromFastifyPlugin("${name}"): the plugin function must call done() synchronously — ` +
        `an async Fastify plugin (returning a Promise instead of calling done()) isn't supported yet.`
    );
  }

  const mod = defineModule({ name, routes });
  for (const child of children) mod.register(child);
  return mod;
}
