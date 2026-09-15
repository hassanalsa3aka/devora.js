import { createInterface } from "node:readline/promises";

/**
 * Shared confirmation prompt for split/sync's real, state-changing Git
 * operations — same TTY-aware pattern `resolveAuthChoice` already uses for
 * `devora new`/`add`, but the safe default is the opposite: `new`'s prompt
 * defaults to a normal, low-risk choice ("shared") when there's no TTY to
 * ask; this defaults to *not proceeding* — a scripted/CI invocation with no
 * `--yes` should never silently push to a remote or rewrite a submodule
 * reference just because nothing was there to say no.
 */
export async function confirmAction(message: string, opts: { yes?: boolean }): Promise<boolean> {
  if (opts.yes) return true;
  if (!process.stdin.isTTY) {
    console.error(`[devora] ${message} — refusing without --yes in a non-interactive shell.`);
    return false;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${message} [y/N]: `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
