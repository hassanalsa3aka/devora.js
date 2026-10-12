# Wiring in a real auth provider

Guides, not built-in integrations — `architecture-v1.md` §6/§11's boundary holds in v2: this
framework provides the session itself (an opaque, server-side, revocable session ID carried in an
HttpOnly cookie or an `Authorization: Bearer` header, plus CSRF protection —
`packages/core/src/session.ts`/`sessionStore.ts`/`csrf.ts`), not an identity provider. "Checking who someone is"
stays bring-your-own; `ctx.setSession()` is what makes the result of that check survive across
requests. Every existing login route (`apps/dashboard/routes/login.tsx`,
`apps/admin/routes/login.tsx`) already says this explicitly — these guides just cover two popular
real choices for the "checking who someone is" half.

Neither guide below has been run against a real provider account/database inside this repo — code
is illustrative, matching the framework's real, current `ctx`/`serverFn`/`RequestContext` shapes
(`packages/core/src/serverFn.ts`), not verified end-to-end the way this project's own session/CSRF
carrier is (see `VERIFICATION.md`).

## Sessions: storage, browsers, and API/mobile clients

A session is a random 256-bit ID. The client holds only the ID; the record (whatever you passed to
`ctx.setSession(data)`, plus two expiry timestamps) lives in a `SessionStore` on the server, so
`ctx.revokeSession()` kills it everywhere at once.

**Pick a store** in `devora.config.ts` (`shared.sessions.store`). `"memory"` is fine for dev and a
single `devora start` process; for anything else — and always on Vercel/Netlify — point it at a
module backed by your own database. The store only needs three methods; it receives an HMAC of the
session ID as `key`, never the raw ID, so a leaked table contains no usable tokens:

```ts
// packages/backend/sessionStore.ts   →   sessions: { store: "packages/backend/sessionStore.ts" }
import { defineSessionStore } from "@devorajs/core";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { sessions } from "./db/schema.js"; // key text PK, data json, active_expires_at / expires_at bigint

export default defineSessionStore({
  async get(key) {
    const row = await db.query.sessions.findFirst({ where: eq(sessions.key, key) });
    return row ? { data: row.data, activeExpiresAt: row.activeExpiresAt, expiresAt: row.expiresAt } : undefined;
  },
  async set(key, r) {
    const values = { data: r.data, activeExpiresAt: r.activeExpiresAt, expiresAt: r.expiresAt };
    await db.insert(sessions).values({ key, ...values }).onConflictDoUpdate({ target: sessions.key, set: values });
  },
  async delete(key) {
    await db.delete(sessions).where(eq(sessions.key, key));
  },
});
```

(Illustrative — adapt to your schema/driver. Expired rows are deleted when someone presents them;
add a periodic `DELETE ... WHERE expires_at < now` for ones nobody ever presents again.)

**States.** A session is *active* for `activeSeconds` (default 1 day), then *idle* for
`idleSeconds` more (default 14 days). Using an idle session silently extends both windows — same
ID, so clients never need a refresh-token flow. Past that it's *dead*: log in again.

**Browsers** use the cookie: `await ctx.setSession({ userId })` in a login action sets it.
**API/mobile clients** use a Bearer token — same primitive, different transport:

```ts
// apps/<app>/api/session.ts — see apps/dashboard/api/session.ts for the full example
const token = await ctx.setSession({ userId: user.id }, { transport: "bearer" }); // no cookie set
return { status: 201, body: JSON.stringify({ token }) }; // client sends `Authorization: Bearer <token>`
```

`ctx.requireAuth()`/`ctx.session` accept either transport through the same lookup, with no extra
code in the route. A request that sends a Bearer header is never authenticated by a cookie.
`ctx.verifyCsrf()` is enforced for cookie (and unauthenticated) requests and skipped for
Bearer-authenticated ones — a cross-site page can make a browser send cookies, not an
`Authorization` header. On the client side, keep the token in secure storage (e.g.
`expo-secure-store`, i.e. Keychain/Keystore), not AsyncStorage.

**Logout / password change:** `await ctx.revokeSession()` revokes the current session;
`ctx.revokeSession(otherId)` revokes another one you recorded (e.g. from `setSession()`'s return
value) — "sign out my other devices."

**Migrating a hand-rolled Bearer scheme** (e.g. `signSession()`-signed `{ userId, role }`
tokens under a separate secret): issue tokens with `ctx.setSession(payload, { transport: "bearer" })`
instead of `signSession()`, replace `verifyAuthToken(header)`/`requireBearerAuth(req)` with
`ctx.requireAuth()` + `ctx.session`, and call `ctx.revokeSession()` in logout. Old tokens stop
working at that point (they were never revocable, which is the point); clients log in once more.
`signSession`/`verifySession` remain exported but deprecated.

## Cookies, CSRF and proxies in production

Session and CSRF cookies are configured in `devora.config.ts` (`shared.sessions.cookie`, for every
app with sessions) and can be overridden per app in `app.config.ts` (`sessions.cookie`). These
settings apply in production (`devora start`, the Vercel/Netlify functions). **`devora dev` keeps
its cookies as they always were: never `Secure`, never `Domain`** (SameSite `lax`/`strict` do
apply in dev; `none` falls back to Lax there, with a warning).

| Setting | Default | What it does |
|---|---|---|
| `cookie.secure` | `true` | `true`: always `Secure`. `"auto"`: only on HTTPS requests (a TLS connection, or `X-Forwarded-Proto: https` when the app has `trustProxy: true`). `false`: never. |
| `cookie.sameSite` | `"lax"` | `"lax"`, `"strict"` or `"none"` (`"none"` requires `secure: true`). Applies to the session and CSRF cookies. |
| `cookie.domain` | unset (host-only) | `Domain` on the session cookie, e.g. `"example.com"` to share one login across subdomains. |
| `activeSeconds` / `idleSeconds` | 86400 / 1209600 | Session lifetimes (see *States* above). |
| `csrf` (app.config.ts) | `true` | `false`: never set the `devora_csrf` cookie. |
| `trustProxy` (app.config.ts) | `false`; `true` in Vercel/Netlify functions | Believe `X-Forwarded-Proto` from the proxy in front of the app. |
| `security.noindex` (app.config.ts) | `false` | Send `X-Robots-Tag: noindex` on every response. |

```ts
// devora.config.ts
shared: {
  auth: "shared",
  sessions: {
    store: "packages/backend/sessionStore.ts",
    cookie: { domain: "example.com" }, // one login across app.example.com, admin.example.com, ...
  },
}

// apps/admin/app.config.ts — an auth: "isolated" admin panel
export default defineApp({
  security: { noindex: true },
  sessions: { activeSeconds: 900, idleSeconds: 3600, cookie: { sameSite: "strict" } },
});
```

**Logins over plain HTTP.** Browsers drop `Secure` cookies on plain-HTTP origins (localhost
excepted), so with the default `secure: true` a login served over plain HTTP never sticks. The
server now logs a warning the first time it sends a `Secure` cookie on what looks like a plain-HTTP
request. Fix it by serving the app over HTTPS (Caddy, or nginx + certbot — see `DEPLOYING.md`), or
set `secure: "auto"` (plus `trustProxy: true` when an HTTPS proxy sits in front of `devora start`),
or `secure: false` for a deployment that is deliberately plain HTTP.

**`trustProxy`.** Behind nginx/Caddy/a load balancer, `devora start` only sees the proxy's
plain-HTTP connection; `X-Forwarded-Proto` says what the browser used. Turn on `trustProxy` only
when the app can be reached *only* through that proxy (bind it to `127.0.0.1` with `HOST`),
otherwise any client can send the header itself. The Vercel/Netlify functions default it to `true`
because only the platform's edge can reach them; set `trustProxy: false` to opt out.

**Shared login across subdomains.** Without `cookie.domain`, the session cookie is host-only: a
login on `app.example.com` is not sent to `admin.example.com`, even when both apps are
`auth: "shared"`. Shared login then only works for apps served from the same host (path-based
routing). With `cookie.domain: "example.com"`, every `auth: "shared"` app writes one cookie for the
whole domain. Each of them must be served from that domain or a subdomain of it — checked at
`devora build`/`devora dev`. Their cookie attributes can't differ per app, and an isolated app's
cookie stays host-only unless its own `app.config.ts` sets a domain. The CSRF cookie is always
host-only. Turning `domain` on can make existing users log in once more.

**Per-app lifetimes** (`sessions.activeSeconds/idleSeconds` in `app.config.ts`) are for
`auth: "isolated"` apps only. A shared session is one session across every shared app, so its
lifetimes are set once in `shared.sessions`.

**`csrf: false`** is for Bearer-only APIs: their unauthenticated calls (the login itself) no
longer get a `devora_csrf` cookie. Bearer-*authenticated* requests never got one. With CSRF off,
`ctx.verifyCsrf()` still passes for Bearer-authenticated requests and rejects every other request
with 403 — it never passes silently.

## Lucia

Lucia (v3+) is a set of small, framework-agnostic primitives for session/user management — it
already separates "does this session exist" from "how is it stored," so it composes naturally with
this framework's own sessions rather than replacing it. (Devora's own session model — opaque IDs,
active/idle states, server-side revocation — is itself modeled on Lucia's.) Two reasonable ways to combine them:

**Option A — Lucia owns session storage, this framework's sessions are unused.** Lucia
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
  // Reuse this framework's own session (not Lucia's own cookie) —
  // ctx.setSession() already handles storage, revocation, both transports,
  // and this app's auth mode (shared/isolated).
  await ctx.setSession({ userId: user.id });
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
