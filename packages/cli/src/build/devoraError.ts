/** An error this framework threw on purpose (its message starts with "[devora]") — meant for the
 * user as-is, so the CLI prints the message without a stack trace. */
export function isDevoraError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("[devora]");
}
