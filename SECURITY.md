# Security policy

Security is one of Devora.js's defaults (CSP and other headers on the responses the app serves,
CSRF checks, server-side revocable sessions, no `eval` in framework code), so a hole in any of them
is a bug we want to hear about first, privately. Two limits on that sentence: files a CDN serves
straight from disk on Vercel and Netlify never reach the app, so they get only some of the headers;
and CSRF is checked for you on cookie-authenticated writes from 0.4.0 (in 0.3.5 a route
has to call `ctx.verifyCsrf()`). See the [security model](docs/guides/SECURITY-MODEL.md).

## Supported versions

Devora.js is pre-1.0. Fixes go into the latest release only.

| Package | Supported |
|---|---|
| `@devorajs/core`, `@devorajs/cli` | latest 0.3.x |
| `@devorajs/adapter-node`, `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify` | latest 0.2.x |
| `create-devora` | latest |

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

**Preferred:** use GitHub's private vulnerability reporting. Open the
[Security tab of the repository](https://github.com/hassanalsa3aka/devora.js/security) and choose
**Report a vulnerability**. The report is visible only to the maintainer, and GitHub keeps the
conversation and a draft advisory with it.

**Alternative:** if you can't use GitHub, send a direct message to the maintainer on
[Discord](https://discord.gg/wYFYmFxdS8) saying you have a security report, and share the details
only in that private conversation, never in a public channel.

Include the affected package and version, what an attacker can do, and the smallest project or
request that shows it. Devora.js is maintained by one person, so expect a first reply within a
few days rather than hours. Once a fix is released, the CHANGELOG says what was fixed and credits
you if you'd like.

## Scope

In scope: `@devorajs/*` packages and `create-devora` — the request handler, sessions and CSRF,
security headers, the CLI (including `split`/`sync`, which run git), and the generated
Vercel/Netlify functions.

Out of scope: your own app code, the auth provider or database you bring, and the hosting
platform itself. Devora.js has had an internal security pass (see `README.md`), not a third-party
audit.
