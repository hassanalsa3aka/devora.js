import { createInterface } from "node:readline/promises";

/**
 * What a new project contains (devora-pre-v3-hotfixes.md #12):
 * - `"fullstack"` — page apps plus one shared backend (`packages/backend`).
 *   The default, and what create-devora always generated before this.
 * - `"frontend"` — page apps only; no `packages/backend`.
 * - `"backend"` — backend-only apps (`api/` routes, no pages) plus the
 *   shared backend.
 *
 * Deliberately NOT asked: how many backends. A project gets one shared
 * backend by default, and app-specific backend logic is a documented
 * per-app pattern (an app-local function or `api/` route), not a first-run
 * question — most projects never need it, so asking everyone would be
 * friction for the common case. create-devora prints a pointer to that
 * pattern after scaffolding instead.
 */
export type ProjectScope = "fullstack" | "frontend" | "backend";

const ALIASES: Record<string, ProjectScope> = {
  fullstack: "fullstack",
  "full-stack": "fullstack",
  full: "fullstack",
  frontend: "frontend",
  "frontend-only": "frontend",
  front: "frontend",
  backend: "backend",
  "backend-only": "backend",
  back: "backend",
  api: "backend",
};

export function parseScope(value: string): ProjectScope | undefined {
  return ALIASES[value.trim().toLowerCase()];
}

/**
 * `--scope` skips the prompt (scripted/CI use); with no flag and a real TTY,
 * asks, re-asking on an unrecognized answer; with no flag and no TTY,
 * defaults to "fullstack" rather than waiting for input that will never come
 * — the same fallback rules resolveAuthChoice uses.
 */
export async function resolveScopeChoice(explicit: string | undefined): Promise<ProjectScope> {
  if (explicit !== undefined) {
    const scope = parseScope(explicit);
    if (scope) return scope;
    console.error(`[create-devora] --scope must be "fullstack", "frontend", or "backend" (got "${explicit}")`);
    process.exit(1);
  }
  if (!process.stdin.isTTY) return "fullstack";

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (
        await rl.question(`What do you need? [full-stack/frontend/backend] (default: full-stack): `)
      ).trim();
      if (!answer) return "fullstack";
      const scope = parseScope(answer);
      if (scope) return scope;
      console.log(`  Please answer "full-stack", "frontend", or "backend".`);
    }
  } finally {
    rl.close();
  }
}
