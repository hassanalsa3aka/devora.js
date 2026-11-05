# Before `--experimental-dev-server` may become the default

All of these, measured on local hardware (not only in a cloud container), with the results in the repository:

1. **Parity:** the full suite and every example (`examples/*`, the repo apps, the docs site) run under the
   experimental server with no test skipped; a parity test renders every route under both servers and compares
   status, headers and HTML (ignoring script URLs).
2. **Fast Refresh:** state kept across edits of a component, of a hook's body and of CSS, checked in a real browser
   (Playwright) for pages, islands and CSR routes; anything else falls back to a full reload, never a stale page.
3. **Security:** every rule in DESIGN.md has a test, and the red-team dev-server script
   (`work-notes/redteam/scripts/attack-dev.mjs`) passes against it, plus: no `/@fs/`-style read, WebSocket refused
   without the token or with a foreign Origin, DNS rebinding refused, `NODE_ENV=production` refused.
4. **Speed:** cold start, HMR latency (edit to updated DOM), memory and idle CPU no worse than Vite on the same app,
   5 runs each, on at least macOS and Linux.
5. **Dependencies:** the 50 most-downloaded React packages that work under Vite pre-bundle and import correctly.
6. **Time in use:** at least one minor release as an opt-in, with no open bug labelled "dev-server" older than two
   weeks, and the docs say how to switch back.
7. **Maintainer decision:** a written yes in the ROADMAP; it is not made default by a contributor.
