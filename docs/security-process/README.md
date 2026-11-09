# Security process: proposals, not applied

Everything in this folder is prepared for the maintainer to apply by hand. Nothing here runs: the two workflows carry a
`.proposed` suffix so GitHub ignores them until they are moved into `.github/workflows/`.

- `codeql.yml.proposed`, `scorecard.yml.proposed`: workflow proposals (pinned to major versions; pin to commit SHAs like the
  existing workflows when you apply them).
- `SECURITY-supported-versions.md`: the table to paste into `SECURITY.md` at release.
- `advisory-H24.md`, `advisory-H27.md`: advisory text for the two fixed findings that are worth a published advisory.
- `CHECKLIST.md`: npm 2FA and provenance, private vulnerability reporting, branch protection.
