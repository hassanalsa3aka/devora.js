# Advisory text (draft): `ctx.url` took its host from the request target instead of the Host header

**Package:** `@devorajs/core`  **Fixed in:** 0.4.0  **Affected:** versions before 0.4.0
**Severity (proposal):** Low to Moderate (depends on how an app uses `ctx.url`)

For a request whose target was in absolute form (`GET http://other.example/path`) or began with `//`, `ctx.url` was built from the
host in the request target, while the `allowedHosts` check looked at the `Host` header. An app that used `ctx.url.host` or `ctx.url.origin`
to build links, redirects or cache keys could be given a host the check had not seen. Apps that do not read `ctx.url` or that use
fixed absolute URLs were not affected.

**Fix:** the host comes from the `Host` header that `allowedHosts` checks, and the target contributes only its path and query
(`targetPathAndQuery` in `packages/core/src/trustProxy.ts`); regression tests are in `redteamFindings.test.ts`.
**Workaround before upgrading:** set `allowedHosts` and build absolute URLs from configuration, not from `ctx.url`.
**Credit:** internal red-team pass, 2026-11-05. There has been no third-party audit.
