import { createInterface } from "node:readline/promises";

export type AuthChoice = "shared" | "isolated" | "none";

/**
 * Auth is per-app, not per-project — a marketing site and a dashboard in
 * the same project routinely differ (confirmed with the user; see
 * ROADMAP.md's auth-opt-in item) — so this asks once per scaffolded app
 * rather than once per project. `--auth` skips the prompt entirely (CI/
 * scripted use); with no flag and a real TTY, asks interactively; with no
 * flag and no TTY (piped/non-interactive), defaults to "shared" rather than
 * hanging forever waiting for input that will never come.
 *
 * Shared between `devora new`/`add` (packages/cli/src/commands/new.ts) and
 * `create-devora` — extracted here, not duplicated, so both installers ask
 * the identical question the identical way.
 */
export async function resolveAuthChoice(explicit: string | undefined, appName: string): Promise<AuthChoice> {
  if (explicit === "shared" || explicit === "isolated" || explicit === "none") return explicit;
  if (explicit) {
    console.error(`[devora] --auth must be "shared", "isolated", or "none" (got "${explicit}")`);
    process.exit(1);
  }
  if (!process.stdin.isTTY) return "shared";

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(
        `Does "${appName}" need auth/sessions? [shared/isolated/none] (default: shared): `
      )
    ).trim();
    if (answer === "isolated") return "isolated";
    if (answer === "none") return "none";
    return "shared";
  } finally {
    rl.close();
  }
}
