# Wiring in a real auth provider

Guides, not built-in integrations — `architecture-v1.md` §6/§11's boundary holds in v2: this
framework provides the session *carrier* (a signed cookie, CSRF protection —
`packages/core/src/session.ts`/`csrf.ts`), not an identity provider. "Checking who someone is"
stays bring-your-own; `ctx.setSession()` is what makes the result of that check survive across
requests. Every existing login route (`apps/dashboard/routes/login.tsx`,
`apps/admin/routes/login.tsx`) already says this explicitly — these guides just cover two popular
real choices for the "checking who someone is" half.

Neither guide below has been run against a real provider account/database inside this repo — code
is illustrative, matching the framework's real, current `ctx`/`serverFn`/`RequestContext` shapes
(`packages/core/src/serverFn.ts`), not verified end-to-end the way this project's own session/CSRF
carrier is (see `VERIFICATION.md`).

## Lucia

Lucia (v3+) is a set of small, framework-agnostic primitives for session/user management — it
already separates "does this session exist" from "how is it stored," so it composes naturally with
this framework's own cookie carrier rather than replacing it. Two reasonable ways to combine them:

**Option A — Lucia owns session storage, this framework's cookie carrier is unused.** Lucia
manages its own session table/cookie directly; a route's `loader`/`action` calls Lucia's APIs to
validate a session from the incoming request's cookie header, and never calls
`ctx.setSession()`/`ctx.session` at all. Simplest to reason about, but you lose this framework's
CSRF token wiring (`csrf.ts`'s token is threaded through `ctx`/`csrfToken`, not through Lucia) —
you'd need your own CSRF check on top, or accept that Lucia's own session cookie (typically
`SameSite=Lax`, not paired with a CSRF token here) is your only cross-site protection.

**Option B — Lucia validates credentials, this framework carries the result (recommended, keeps
the existing CSRF wiring intact):**

```ts
// packages/backend/functions/login.ts
import { serverFn } from "@devorajs/core";
import { lucia } from "../auth/lucia.js"; // your Lucia instance, configured with your adapter

export const login = serverFn(async (input: { username: string; password: string }, ctx) => {
  const user = await verifyCredentials(input); // your own password check, e.g. against Lucia's adapter's user table
  // Reuse this framework's own signed-cookie session (not Lucia's own
  // cookie) — ctx.setSession() is the carrier already wired through
  // session.ts's HMAC signing and this app's auth mode (shared/isolated).
  ctx.setSession({ userId: user.id });
});
```

`ctx.requireAuth()`/`ctx.session` downstream work exactly as they already do for the demo login
routes — Lucia's role here is narrowed to "verify credentials against your adapter," not "carry
the session," avoiding two separate cookie/session systems running in parallel.

## Auth.js (formerly NextAuth.js)

Auth.js's core (`@auth/core`) is framework-agnostic, but its higher-level framework integrations
(`next-auth`, `@auth/sveltekit`, etc.) assume that framework's request/response conventions —
there's no `@auth/devora` adapter. The realistic integration point is `@auth/core`'s own
`Auth()` function directly from a Devora API route (architecture-v2.md §3.2), since that's the
primitive built for exactly "a plain request handler, not tied to page rendering":

```ts
// apps/dashboard/api/auth/[...authjs].ts
import { Auth } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import { apiRoute } from "@devorajs/core";

const authConfig = { providers: [GitHub({ clientId: "...", clientSecret: "..." })] };

export const handler = apiRoute(async (req, ctx) => {
  // @auth/core works against a real Fetch API Request/Response — construct
  // one from this framework's ApiRequest (apiRoute.ts), same translation
  // the Netlify adapter's own wrapper already does for a different reason
  // (adapters/adapter-netlify/src/index.ts's generated ssr.mjs).
  const request = new Request(`https://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body: req.body.length > 0 ? req.body : undefined,
  });
  const response = await Auth(request, authConfig);
  // On success, still call ctx.setSession() so the REST of this app's
  // routes see the login through the same ctx.session this framework
  // already understands, rather than only through Auth.js's own cookie.
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: Buffer.from(await response.arrayBuffer()),
  };
});
```

This is real integration work, not a drop-in — you own the translation layer between `@auth/core`'s
Fetch-API request/response and this framework's `ApiRequest`/`ApiResponse`, and deciding whether
Auth.js's own session cookie or this framework's `ctx.setSession()` is the source of truth for the
rest of your app (mirroring the same Option A/B choice Lucia's guide above lays out).

## What both guides share

- Neither changes this framework's CSRF story: `ctx.verifyCsrf()` still only makes sense for a
  request that was actually issued this app's own CSRF cookie (a same-origin form or API call, per
  architecture-v2.md §3.2.2) — an OAuth provider's callback request wasn't, and shouldn't be forced
  through it.
- Both stay entirely inside the "bring your own auth provider" boundary
  (architecture-v1.md §6/§11) — nothing here is wired into `packages/core` or shipped as a
  dependency of it.
