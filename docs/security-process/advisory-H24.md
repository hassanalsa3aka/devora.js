# Advisory text (draft): malformed percent-escape in a cookie made every page answer 500

**Package:** `@devorajs/core`  **Fixed in:** 0.4.0  **Affected:** versions before 0.4.0 that use sessions (`auth` is `shared` or `isolated`)
**Severity (proposal):** Moderate (availability, per browser, no data exposure)

A cookie whose value contained a malformed percent-escape (for example `%E0%A4%A`) made the cookie parser throw while the session
was read. Every page and API route of an app that uses sessions then answered 500 to that browser until the cookie was removed. A
page that can set a cookie for the app's host (a sibling subdomain, or a user with a script on the same host) could use this to lock
a visitor out of the app. No request was served with another user's session and no data was exposed.

**Fix:** the parser keeps the raw value when decoding fails (`parseCookieHeader` in `packages/core/src/session.ts`); a regression
test is in `packages/core/src/__tests__/redteamFindings.test.ts`.
**Workaround before upgrading:** none in the app; clearing the browser's cookies for the site recovers that browser.
**Credit:** internal red-team pass, 2026-11-05. There has been no third-party audit.
