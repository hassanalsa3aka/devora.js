import type { AppConfig } from "@devora/core";

/**
 * Shared port-assignment scheme for `devora start` (running every app
 * together — the real, multi-process self-hosting shape architecture-v1.md
 * §13 assumes) and `devora generate:proxy`. A real, previously unnoticed bug
 * had these compute two *different* base ports completely independently —
 * `generate-proxy.ts` started at `4000`, `start.ts` at `4173` — so following
 * the documented workflow (`devora start` then `devora generate:proxy`)
 * produced a proxy config pointing at ports nothing was actually listening
 * on. One shared function, used by both, makes them structurally unable to
 * drift apart again — not just coincidentally matching today.
 *
 * `4173` (not `generate-proxy.ts`'s old `4000`) was kept as the shared
 * default specifically to match `start.ts`'s own already-tested,
 * already-documented default (chosen originally to avoid colliding with a
 * `devora dev` instance's `5173`) — the less disruptive direction to fix
 * this bug in.
 */
export const DEFAULT_BASE_PORT = 4173;

export function assignPorts(apps: AppConfig[], basePort: number = DEFAULT_BASE_PORT): Map<string, number> {
  const ports = new Map<string, number>();
  let port = basePort;
  for (const app of apps) {
    ports.set(app.name, port);
    port += 1;
  }
  return ports;
}
