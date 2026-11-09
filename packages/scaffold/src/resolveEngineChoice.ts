import { createInterface } from "node:readline/promises";

/**
 * Devora's own dev and build engine, as shown to people. The same value is exported from `@devorajs/core/config` (that package
 * cannot be a dependency of this dependency-free one, so a test checks the two stay equal): rename it in both.
 */
export const ENGINE_NAME = "Sekhem";

/** `"vite"` is stable and the default; `"own"` is ENGINE_NAME, experimental. */
export type EngineChoice = "vite" | "own";

export function parseEngine(value: string): EngineChoice | undefined {
  const v = value.trim().toLowerCase();
  if (v === "vite" || v === "1") return "vite";
  if (v === "own" || v === "2" || v === ENGINE_NAME.toLowerCase()) return "own";
  return undefined;
}

/**
 * `--engine` skips the prompt; with a real TTY the question is asked (re-asked on an unrecognised answer); with no flag and no
 * TTY the answer is Vite, the stable engine. An empty answer is Vite too.
 */
export async function resolveEngineChoice(explicit: string | undefined): Promise<EngineChoice> {
  if (explicit !== undefined) {
    const engine = parseEngine(explicit);
    if (engine) return engine;
    console.error(`[create-devora] --engine must be "vite" or "own" (got "${explicit}")`);
    process.exit(1);
  }
  if (!process.stdin.isTTY) return "vite";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (
        await rl.question(`Dev and build engine:\n  1) Vite (stable, default)\n  2) ${ENGINE_NAME} (experimental)\nChoose 1 or 2 (default: 1): `)
      ).trim();
      if (!answer) return "vite";
      const engine = parseEngine(answer);
      if (engine) return engine;
      console.log(`  Please answer 1 or 2.`);
    }
  } finally {
    rl.close();
  }
}
