# Wiring in a real auth provider

Guides, not built-in integrations — `docs/design/architecture-v1.md` §6/§11's boundary holds in v2: this
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
carrier is (see `docs/history/VERIFICATION.md`).

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
// apps/<app>/endpoints/session.ts (the app's apiDir; `api/` in older apps)
// — see apps/dashboard/api/session.ts in this repo for the full example
const token = await ctx.setSession({ userId: user.id }, { transport: "bearer" }); // no cookie set
return { status: 201, body: JSON.stringify({ token }) }; // client sends `Authorization: Bearer <token>`
```

`ctx.requireAuth()`/`ctx.session` accept either transport through the same lookup, with no extra
code in the route. In development, a route that reads `ctx.session` but never calls
`ctx.requireAuth()` prints one warning per path: fine for a page that also serves signed-out
visitors (check `ctx.session` for `undefined`), a bug for one that is meant to be signed-in only. A request that sends a Bearer header is never authenticated by a cookie.
`ctx.verifyCsrf()` is enforced for cookie (and unauthenticated) requests and skipped for
Bearer-authenticated ones — a cross-site page can make a browser send cookies, not an
`Authorization` header.

**CSRF is checked by default for cookie-authenticated writes.** A `POST`, `PUT`, `PATCH` or
`DELETE` (and any other method but `GET`, `HEAD` and `OPTIONS`) that arrives with a live session in
the session cookie is checked before the page's `action` or the API route's `handler` runs: the
token must be in the `_csrf` form field (`<CsrfField token={csrfToken} />`) or the `x-devora-csrf`
header (`CSRF_HEADER_NAME`), or the request gets a 403.

**The token of a signed-in browser is bound to its session.** It is an HMAC of the session ID,
keyed with the session secret (`deriveSessionCsrfToken()`), and the page's `csrfToken` is that
value, so the CSRF cookie plays no part in the check for a request with a session cookie: a cookie
planted from a sibling subdomain proves nothing. Requests with no session (a login form) still use
the double-submit CSRF cookie. Because the token follows the session, a page that signs the user in
with `fetch()` and keeps writing without a reload still holds the signed-out token: reload or
navigate after the login (a form login that redirects does this by itself). Bearer-authenticated requests, requests with no session cookie (including the
login itself) and `GET`/`HEAD`/`OPTIONS` are not checked by default; call `ctx.verifyCsrf()`
yourself where you want them checked (for example a login form). A route opts out with
`export const csrf = false;` and is then on its own. An app with `csrf: false` (no CSRF cookie) has
no token to check, so a cookie-authenticated write there gets a 403 unless the route opts out. On the client side, keep the token in secure storage (e.g.
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
request. Fix it by serving the app over HTTPS (Caddy, or nginx + certbot — see `docs/guides/DEPLOYING.md`), or
set `secure: "auto"` (plus `trustProxy: true` when an HTTPS proxy sits in front of `devora start`),
or `secure: false` for a deployment that is deliberately plain HTTP.

**Caching.** A response that reads the session cookie (the request sent it) or sets or clears it is
sent with `Cache-Control: private, no-store`, replacing any `Cache-Control` the handler set, so a
CDN or proxy never stores one user's page or `Set-Cookie` and hands it to someone else. This applies
to pages, streaming pages, redirects, error pages and API routes, on `devora start`, `devora dev`
and the Vercel/Netlify functions. A request that authenticates with a Bearer token, or sends no
session cookie, is left as the handler made it.

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

## Rate limiting logins

A route that creates sessions (a login form, a sign-up or token endpoint) can limit how often one
client posts to it. A client is an IPv4 address, or the /64 prefix of an IPv6 address:

```ts
// apps/dashboard/routes/login.tsx, or an API route such as api/session.ts
export const rateLimit = { max: 10, windowSeconds: 60 }; // 10 POSTs per client per minute
```

The eleventh request in the window with any method but `GET`, `HEAD` and `OPTIONS` gets a 429 (an API
route also gets `Retry-After`) before the action or handler runs, and before the session store is
touched. `GET`, `HEAD` and `OPTIONS` are never counted. Nothing is limited unless a route exports `rateLimit`.

What it does not do, so plan for it:

- **It counts per process.** Each `devora start` process, and each serverless instance on Vercel or
  Netlify, keeps its own count in memory, and a restart or a cold start resets it. It slows down
  one client hammering one instance; it does not stop a distributed attack.
- **It keys on `ctx.ip`.** Behind a proxy, set `trustProxy` in app.config.ts (and make the app
  reachable only through that proxy), or every client shares the proxy's address and one count.
- **IPv6 clients are counted by /64.** An IPv6 subscriber is normally given a whole /64 (2^64
  addresses), so counting each address separately would give it an endless supply of fresh counts.
  The key is the first four groups of the address (`2001:db8:abcd:12::/64`); an IPv4-mapped
  address (`::ffff:203.0.113.7`) counts as its IPv4 address, a zone id (`%eth0`) is ignored, and
  IPv4 clients are counted per address as before (`rateLimitKey()`). The cost: everyone on one /64
  (a household, an office, a mobile carrier that gives out shared prefixes) shares one count. The
  per-route table keeps at most 10,000 clients and drops the oldest when it is full, so a
  distributed flood can still push entries out; that is another reason to limit at the proxy too.
- **It does not lock accounts.** Slowing guesses against one account from many IPs needs a
  per-account counter in your own auth code (for example failed attempts stored with the user).

Put the real limit in front of the app as well:

- **nginx**: `limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;` in `http { }`, then
  `location = /login { limit_req zone=login burst=5 nodelay; proxy_pass http://127.0.0.1:4173; }`
  (repeat for each login or token path).
- **Caddy**: rate limiting is not in the standard build; it needs a plugin such as
  `caddy-ratelimit`, built in with `xcaddy`.
- **Vercel, Netlify, Cloudflare**: use the platform's firewall or WAF rate-limiting rules on the
  login paths; they count across every instance.

## Hosts and links in emails

`ctx.url` (and anything else built from the request) takes its host from the `Host` header, or
from `X-Forwarded-Host` when the app has `trustProxy` on. A client can send any value there. Two
rules follow:

- **Build password-reset, sign-in and invitation links from a configured origin, never from the
  request.** Keep the origin in configuration (for example `APP_ORIGIN=https://app.example.com` in
  the environment) and write `new URL("/reset?token=" + token, process.env.APP_ORIGIN)`. A link built
  from `ctx.url` or the `Host` header can be made to point at an attacker's site, which then
  receives the reset token when the user clicks it.
- **List the hosts the app answers to** in app.config.ts. A request for any other host gets a 400
  before a route runs:

  ```ts
  export default defineApp({
    allowedHosts: ["app.example.com", ".example.com"], // a leading dot: the domain and its subdomains
  });
  ```

  Ports are ignored. `devora dev` also accepts localhost. Unset, nothing is checked (the default). On
  Vercel and Netlify the check runs in the function, so files the CDN serves directly are not
  checked; list the preview domains you use (for example `.vercel.app`) or previews get a 400.

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

Auth.js's paths are fixed, so this section maps them explicitly (a `[...path]` catch-all works too) — `/api/auth/<action>` and
`/api/auth/<action>/<provider>` (e.g. `/api/auth/signin`, `/api/auth/callback/github`) — with two
files that share one handler:

```ts
// apps/dashboard/endpoints/auth/[action].ts
// (and apps/dashboard/endpoints/auth/[action]/[provider].ts: `export { handler } from "../[action].js";`)
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

This sketch hasn't been run against a real OAuth provider. Two known gaps: `ApiResponse.headers` is
a plain object, so when Auth.js sends several `Set-Cookie` headers only one survives
`Object.fromEntries()`; and the host in the reconstructed URL comes from the `Host` header (behind a
proxy, use your public URL instead).

This is real integration work, not a drop-in — you own the translation layer between `@auth/core`'s
Fetch-API request/response and this framework's `ApiRequest`/`ApiResponse`, and deciding whether
Auth.js's own session cookie or this framework's `ctx.setSession()` is the source of truth for the
rest of your app (mirroring the same Option A/B choice Lucia's guide above lays out).

## What both guides share

- Neither changes this framework's CSRF story: `ctx.verifyCsrf()` still only makes sense for a
  request that was actually issued this app's own CSRF cookie (a same-origin form or API call, per
  docs/design/architecture-v2.md §3.2.2) — an OAuth provider's callback request wasn't, and shouldn't be forced
  through it.
- Both stay entirely inside the "bring your own auth provider" boundary
  (architecture-v1.md §6/§11) — nothing here is wired into `packages/core` or shipped as a
  dependency of it.
