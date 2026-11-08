# Red team, release/0.4.0-final (2026-11-05)

Internal attack pass on this repository's own code, on localhost in a cloud container (Linux, 4 cores, Node 22.23.4,
Vite 6.4.5, React 18.3.1). Not a third-party audit. The targets were `devora start` serving the repo's four apps
(marketing: `auth: "none"`, SSG; dashboard: sessions, CSRF, API routes, streaming; admin: isolated auth; api-only),
`devora dev` on the dashboard app, the core parsers called directly, the scaffolders and the dependency tree.

Scripts (all under `work-notes/redteam/scripts/`, each says how to run it at the top):

| Script | What it does | Final result |
|---|---|---|
| `attack-prod.mjs` | 121 raw-socket checks against `devora start` (traversal, injection, smuggling, Host/Origin, CSRF, session, bodies and forms, slow and large requests, XSS and headers, methods) | 121 passed, 0 failed |
| `attack-dev.mjs` | 26 checks against `devora dev` (DNS rebinding, file reads outside the root, HMR WebSocket, CORS) | 26 passed (one informational, see "Not findings") |
| `fuzz.mts` | Bounded random fuzzing of 9 parsers with an invariant each | 20 s per target, about 95 million inputs, no invariant failure (after fixing what it found, see H27) |
| `redos.mts` | 12 worst-case inputs for every regular expression on request data | slowest 117 ms for a 10 MB input; nothing over 500 ms |
| `gate.sh` | The full gate (7 typechecks, CLI bundle, suite, check:docs, package builds, pack check) | all PASS, 68 files / 644 tests |

## Findings

Every fixed finding has a regression test that fails without the fix (checked by stashing the fix and running the
test), and the full gate passed after all of them.

| ID | Severity | Finding | Status | Fix and test |
|---|---|---|---|---|
| H24 | Medium (availability) | One malformed percent-escape in any cookie (`x=%E0%A4%A`) made `parseCookieHeader` throw, so every page of a session app answered 500 for that browser. A cookie set by another app on the same domain, or by a script on a sibling subdomain, was enough | Fixed | `packages/core/src/session.ts` keeps the raw value; `redteamFindings.test.ts` (H24) |
| H25 | Low | With a cookie name sent twice, the last value won, so a cookie set from a sibling subdomain could replace the app's own | Fixed | first value wins, own-property check; `redteamFindings.test.ts` (H25) |
| H26 | Medium | The default CSRF check and `rateLimit` covered only POST/PUT/PATCH/DELETE. An API route without a `methods` list runs its handler for any method Node accepts, so a cookie-authenticated `PURGE`, `PROPPATCH`, `LINK`... reached the handler with no token (seen on `/api/users/[id]`). Browsers need a CORS preflight for such methods cross-site, which limits it to apps whose CORS allows them, but the default is meant to hold on its own | Fixed | `csrf.ts` (`CSRF_SAFE_METHODS`: only GET/HEAD/OPTIONS are skipped), `rateLimit.ts` (same set); `redteamFindings.test.ts` (H26) |
| H27 | Medium | `ctx.url` took its host from an absolute-form request target (`GET http://other.example/x HTTP/1.1`) or a `//host/x` target, not from the `Host` header that `allowedHosts` checks. With `allowedHosts` set, the request passed and `ctx.url` still named the other host, so a link built from it could point elsewhere | Fixed | `trustProxy.ts` (`targetPathAndQuery`: only the path and query come from the target; one leading slash); `redteamFindings.test.ts` (H27, plus the case `fuzz.mts` found in the first version of the fix) |
| H28 | Low (dev only) | `devora dev`: Vite's `/__open-in-editor` opens any path in the developer's editor on a plain GET, so any page the developer visits can fire it at localhost | Fixed | `packages/cli/src/server/apiMiddleware.ts` (`createOpenInEditorGuardPlugin`: 403 when `Sec-Fetch-Site` is cross-site or same-site, or `Origin` is another origin); `openInEditorGuard.integration.test.ts` |
| H29 | Medium (local, generated code) | `create-devora` and `devora new` wrote app names and domains unchecked into `devora.config.ts` source, into `apps/<name>` paths and into the `netlify.toml` build command that the platform's shell runs. A name with a quote, `;` or `../` produced broken or injected code, a shell command, or files outside the project | Fixed | `packages/scaffold/src/names.ts` (lowercase letters, digits, `-`, `_`, at most 50; domains are host names), checked by both scaffolders before anything is written; `names.test.ts` |
| H30 | Low to medium | The CSRF token was only compared with the CSRF cookie, not tied to the session | Fixed (0.4.0) | token is an HMAC of the session id; `csrfSessionBinding.test.ts` |
| H31 | Low | `rateLimit` keyed IPv6 clients on the full address | Fixed (0.4.0) | keyed on the /64 prefix; `rateLimit.test.ts` (H31) |
| H32 | Info | Netlify function reads the request body before the size limit is applied | Open (accepted) | the platform caps request bodies itself |

## What held (no finding)

- **Path traversal**, 22 encodings on two apps (`../`, `%2e%2e`, `%252e`, `%5c`, backslash, `//`, overlong UTF-8, NUL, `.env`, the server bundle next to the client folder) and an absolute-form target: every answer was a 404 or a page, nothing outside the client folder was served.
- **Header injection and smuggling**: CRLF in the target, bare LF, NUL, a space before the colon, obs-fold, CL+TE, two Content-Lengths, `chunked, identity`, `xchunked`, an overflowing chunk size, a negative length: Node's parser answers 400 to all of them; no second response was ever produced.
- **Host and Origin**: a forged `Host` or `X-Forwarded-Host` (without `trustProxy`) never appears in a page.
- **CSRF**: cookie writes without a token, with an empty or wrong token, as text/plain, as multipart, with a session but no CSRF cookie: all 403. API PUT/PATCH/DELETE on a route that declares `methods`: 405.
- **Session**: the cookie is HttpOnly, SameSite=Lax, Path=/, Secure (production default); login issues a new ID (no fixation); the dashboard session is not accepted by the isolated admin app; session responses are `private, no-store`.
- **Bodies and forms**: a 999,999,999 Content-Length gets 413 before reading; a 25 MB chunked body is cut off; 1500 URL-encoded fields and 30 file parts get 413, also with odd header case, no spaces, a quoted boundary with a space, and the boundary between other parameters. Fuzzing could not get more files or fields past the limits than allowed.
- **Prototype pollution**: `__proto__` and `constructor` in form names, JSON bodies and cookie names change nothing.
- **Slow and large**: headers over 16 KB and 3000 headers get 431; a slowloris client gets 408 and is closed at 15 s.
- **Output encoding**: an HTML or `</script>` payload in a route parameter or query is never reflected raw; there is no inline JSON in the document (island props are a React-escaped attribute); the page CSP (`default-src 'self'`) allows no inline script; nosniff and `X-Frame-Options: DENY` on pages and streaming pages; the SVG sandbox policy on `.svg`.
- **ReDoS**: no input over 117 ms (see the table above).
- **Dev server**: a foreign `Host` (DNS rebinding) gets 403; `/@fs/`, `?raw`, `?import&raw`, `?url`, `/@id/` and traversal reads of a file outside the project, `/etc/passwd` and `/proc/self/environ` get 403 or 404; the HMR WebSocket refuses a foreign Origin and a wrong token; no `Access-Control-Allow-Origin` for a foreign Origin.
- **Adapters**: Vercel and adapter-node hand a real Node request to the same handler; the Netlify shim builds an origin-form `req.url` from the platform's URL; all three get every fix above through `createProdRequestHandler` and `describeRequest`.
- **Supply chain**: `pnpm audit --prod --audit-level high`: no known vulnerabilities. All 161 lockfile packages carry a sha512 integrity hash; `pnpm install --frozen-lockfile --offline` succeeds. The only package with an install script is esbuild, which pnpm 10 does not run unless allowed. Every vite in the workspace is 6.4.5.

## Not findings, or known and tracked elsewhere

- The full `pnpm audit` lists 14 advisories (3 critical), all in the test runner: vitest 2.1.9, its tinypool and @vitest/mocker, and the vite 5.4.21 vitest pulls in. Dev-only, not installed by users. Already finding H18 (moving to vitest 3 breaks 55 integration tests).
- Vite's HMR socket accepts a client that sends no `Origin` header. Browsers always send one; only a local non-browser process can connect without it, and such a process can already read the project files.
- `/__open-in-editor` with no `Sec-Fetch-Site` and no `Origin` (curl, an editor plugin) still reaches Vite, by design of the H28 guard.
- The demo dashboard's `/settings` action and `/api/users/[id]` answer 500 after the CSRF check passes, because `packages/backend/db` is a stub with no database. Expected for the demo.
- `TRACE` gets a page (200), not an echo of the request.
