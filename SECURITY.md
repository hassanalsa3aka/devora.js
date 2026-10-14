# Security policy

Security is one of Devora.js's defaults (CSP and other headers on every response, CSRF checks,
server-side revocable sessions, no `eval` in framework code), so a hole in any of them is a bug
we want to hear about first, privately.

## Supported versions

Devora.js is pre-1.0. Fixes go into the latest release only.

| Package | Supported |
|---|---|
| `@devorajs/core`, `@devorajs/cli` | latest 0.3.x |
| `@devorajs/adapter-node`, `@devorajs/adapter-vercel`, `@devorajs/adapter-netlify` | latest 0.2.x |
| `create-devora` | latest |

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Send a direct message to the maintainer on [Discord](https://discord.gg/wYFYmFxdS8) saying you
have a security report, and share the details only in that private conversation, never in a
public channel.

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
