/**
 * What the CLI does with an error that escapes a command. A configuration
 * mistake (core's DevoraConfigError: no session store, no session secret in
 * production) is printed as its one-line message and exits 1; anything else
 * is a bug or an unexpected failure and keeps its full stack.
 * Returns true when it handled the error.
 */
export function reportFatal(err: unknown): boolean {
  if (err instanceof Error && err.name === "DevoraConfigError") {
    console.error(err.message);
    process.exitCode = 1;
    return true;
  }
  return false;
}
