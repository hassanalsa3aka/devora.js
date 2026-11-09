# Maintainer checklist (do by hand; nothing here was applied)

## npm
- [ ] Two-factor authentication on the npm account (authorization and publishing: "require 2FA").
- [ ] Publish with provenance: from a GitHub Actions workflow with `id-token: write` and `npm publish --provenance` (needs a public repository); until then note that releases were published from a laptop.
- [ ] Granular access token limited to `@devorajs/*` and `create-devora`, short expiry, publish-only; no classic automation token.
- [ ] Publish order: core, scaffold-dependent packages, adapters, cli, create-devora, `@devorajs/sekhem` (the CLI depends on it).
- [ ] `npm pack --dry-run` for each (the repository has `node scripts/checkPackContents.mjs`).

## GitHub
- [ ] Settings > Code security: private vulnerability reporting on; Dependabot alerts and security updates on; secret scanning and push protection on.
- [ ] Branch protection on `main`: pull request, required checks (CI, CodeQL when added), no force push.
- [ ] Apply `codeql.yml.proposed` and `scorecard.yml.proposed` (rename into `.github/workflows/`, pin actions to commit SHAs).
- [ ] Paste `SECURITY-supported-versions.md` into `SECURITY.md` at release; publish the H24 and H27 advisories only if you want public advisories for fixed 0.4.0 findings.
- [ ] Repository topics and description (see the SEO text file in the lab folder).

## Accepted open findings to keep visible
H18 (test runner, dev only), H32 (Netlify body size is capped by the platform), H35 (the open-in-editor guard refuses browsers, not local tools, by design).
