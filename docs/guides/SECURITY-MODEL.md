# Security model

> **0.4.0.** Everything marked "0.4.0" below is new in that release; 0.3.5 and earlier do not behave this
> way. What 0.3.5 does is in its [CHANGELOG](../../CHANGELOG.md#035--2026-10-16) section. **There has been no third-party security
> audit of Devora.js.** It had an internal pass (see the README), which is not the same thing. To report a
> problem, see [SECURITY.md](../../SECURITY.md).

This page says what the framework does for you, what it leaves to you, and what it cannot do. Auth and
CSRF are still decided per route, as the rest of the framework is: the defaults below apply only where
this page says so, and nothing is limited, protected or hidden unless the code says it is.

## What the framework does by default

| What | Where it applies | How to change it |
|---|---|---|
| CSP, HSTS, `X-Frame-Options` on every response the app serves | pages, API routes, error pages, 404s, static files from `devora start` and the dev server | `security` in `app.config.ts` |
| `X-Content-Type-Options: nosniff` on every response (0.4.0) | the same, and files the Vercel and Netlify CDNs serve directly | cannot be turned off |
| A sandboxing CSP on `.svg` files (0.4.0) | `devora start`, the dev server, Vercel and Netlify static files | cannot be turned off |
| Static files must resolve (symlinks followed) inside the client folder (0.4.0) | files `devora start` and the Vercel/Netlify functions serve; not files a CDN serves, and not the Vite dev server | none |
| `redirect()` stays on your origin (0.4.0) | page actions and loaders | `redirect(url, { allowedOrigins })` |
| `Cache-Control: private, no-store` on a response that reads or sets the session cookie (0.4.0) | pages, redirects, error pages, API routes | none |
| CSRF checked before `action` or `handler` for a cookie-authenticated `POST`, `PUT`, `PATCH`, `DELETE` (0.4.0) | pages and API routes | `export const csrf = false` on a route |
| Server timeouts and a header size limit (0.4.0) | `devora start` | `server` in `app.config.ts` |
| Form field and file counts limited (0.4.0) | page forms | `maxFormFields`, `maxFormFiles` |
| Body size limit | page forms and API routes | `maxBodyBytes` |
| Sessions: opaque IDs, server-side store, revocable, `HttpOnly` cookie | apps with `auth` other than `none` | `devora.config.ts`, `app.config.ts` |
| A development warning for a route that reads `ctx.session` without `ctx.requireAuth()` (0.4.0) | `devora dev` only | none |

On Vercel and Netlify, a file the CDN serves straight from disk never reaches the app, so it gets
`nosniff`, the SVG policy and `X-Robots-Tag` (with `noindex`), but not the CSP, HSTS or
`X-Frame-Options` the app adds to its own responses. Those platforms' own header settings cover them.

## What you have to do

1. **Check each route that changes data.** Authentication is per route: call `ctx.requireAuth()`.
   From 0.4.0 a cookie-authenticated write is also CSRF-checked for you; an anonymous write
   (a login form) is not, so call `ctx.verifyCsrf()` there.
2. **Send the token from the browser.** A page form renders `<CsrfField token={csrfToken} />`. A `fetch`
   to an API route sends the `csrfToken` your page received in the `x-devora-csrf` header. A webhook or
   anything else that is not your own page and sends the session cookie needs `export const csrf = false`
   on its route (a webhook usually sends no session cookie and is not checked).
3. **List your hosts.** Set `allowedHosts` in `app.config.ts` (0.4.0) so a forged `Host` is a 400.
   Build password-reset and sign-in links from a configured origin, never from the `Host` header or
   `ctx.url`.
4. **Never serve user-uploaded SVG or HTML from the app's origin.** The SVG policy is a backstop for
   files you ship. Serve uploads from a separate domain, or with `Content-Disposition: attachment`.
5. **Limit logins at the front door.** A route can export `rateLimit` (0.4.0), but it counts in
   memory per process. Put the real limit in nginx, your platform's firewall or a WAF
   ([AUTH.md](../../packages/backend/AUTH.md#rate-limiting-logins)).
6. **Set `trustProxy` correctly.** Only when the app can be reached only through your proxy.
7. **Use a real session store and secret in production** (`DEVORA_SESSION_SECRET`). The memory store is
   for one process.
8. **Validate redirect targets you build from input.** `redirect(next)` refuses a foreign origin, but
   path-only targets are still yours to choose.
9. **Keep dependencies current.** The CLI requires vite 6.4.4 or later (0.4.0).
10. **Do not share the app's domain with sites you do not control.** Cookies can be set across
    subdomains of one domain; host apps for other people, user content and previews on a separate domain.

## Behavior changes to check when you upgrade to 0.4.0

- `redirect()` with a full URL to another origin now throws a 400. Pass `allowedOrigins`.
- A cookie-authenticated write (any method but `GET`, `HEAD` and `OPTIONS`) without the CSRF token is a 403. Browser
  `fetch` calls need `x-devora-csrf`; routes that must accept cross-site writes need `csrf = false`.
- Responses that read or set the session cookie lose a `Cache-Control: public` the handler set.
- Uploads: the whole request must finish in 60 seconds by default (`server.requestTimeoutMs`), and a
  form may carry 1000 fields and 20 files.
- vite 5 is no longer accepted.

## What this does not do

- It has not been audited by anyone outside the project.
- It is not a WAF. The rate limit is per process and opt-in; there is no account lockout.
- The Vite dev server is for development. This work did not change how it serves files (symlinks
  included), and it does not apply the production header set to everything.
- Nothing here has been checked on a live Vercel or Netlify deployment: the generated header rules are
  tested as generated output only.
- Sessions are stored where you put them. A compromised store is a compromised login.
