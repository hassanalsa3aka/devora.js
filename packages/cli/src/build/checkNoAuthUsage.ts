import fs from "node:fs";

/**
 * Build-time half of the "none" auth mode's "fail loudly, as early as
 * possible" requirement — session.ts's `createNoAuthContext()` already
 * throws a clear error if a "none" app's route ever actually *calls*
 * `ctx.requireAuth()`/`setSession()`/`clearSession()`/`verifyCsrf()` at
 * request time, but a route only reachable via a rare code path (an
 * unusual form submission, an admin-only branch) could sit broken for a
 * long time before anyone hits it live. This scans route source directly
 * (same plain-regex-over-raw-source approach `discoverIslandFiles.ts`
 * already uses, deliberately not a full AST parse — see that file) so a
 * build fails immediately instead of waiting for the request that would
 * have thrown.
 *
 * Deliberately narrow: matches the literal `ctx.<method>(` call shape this
 * codebase's routes consistently use (verified: every existing route names
 * its context parameter `ctx`, never destructures it). A route that
 * renames its context parameter or destructures these methods out of it
 * defeats this scan — that's an accepted false-negative, same tradeoff
 * `ISLAND_CALL_RE` already accepts for island() calls; the runtime throw in
 * `createNoAuthContext()` is what catches that case instead.
 */
const SESSION_METHOD_CALL_RE = /\bctx\.(requireAuth|setSession|clearSession|verifyCsrf)\s*\(/g;

export interface NoAuthUsageViolation {
  file: string;
  method: string;
}

export function checkNoAuthUsage(sourceFiles: string[]): NoAuthUsageViolation[] {
  const violations: NoAuthUsageViolation[] = [];
  for (const file of sourceFiles) {
    const code = fs.readFileSync(file, "utf-8");
    for (const match of code.matchAll(SESSION_METHOD_CALL_RE)) {
      // match[1] is always populated — SESSION_METHOD_CALL_RE's one capture
      // group is required, not optional; noUncheckedIndexedAccess just can't
      // express that statically.
      violations.push({ file, method: match[1]! });
    }
  }
  return violations;
}

/** Throws a single error listing every violation found, or does nothing if none. */
export function assertNoAuthUsage(appName: string, sourceFiles: string[]): void {
  const violations = checkNoAuthUsage(sourceFiles);
  if (violations.length === 0) return;

  const lines = violations.map((v) => `  - ${v.file}: ctx.${v.method}()`);
  throw new Error(
    `[devora] app "${appName}" has auth: "none" in devora.config.ts, but the following ` +
      `route(s) call session methods that will throw at request time:\n${lines.join("\n")}\n` +
      `Set auth: "shared" or "isolated" for "${appName}" if it needs login, or remove these calls.`
  );
}
