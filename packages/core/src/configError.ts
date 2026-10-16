/**
 * A problem with how the project is configured (a missing session store, a
 * missing session secret in production). The CLI prints just its message,
 * one line, and exits with status 1 instead of a stack trace — the stack of
 * a configuration mistake points into the framework, not at the fix.
 */
export class DevoraConfigError extends Error {
  override name = "DevoraConfigError";
}
