/** The own engine (Sekhem) needs Node 22.15 or later (module.registerHooks). Older Node gets a clear message, never a crash or a fall-back to Vite. */
export const OWN_ENGINE_MIN_NODE = [22, 15] as const;

export function ownEngineNodeProblem(version: string = process.versions.node, engineName = "Sekhem"): string | undefined {
  const [major = 0, minor = 0] = version.split(".").map((n) => Number.parseInt(n, 10));
  const [wantMajor, wantMinor] = OWN_ENGINE_MIN_NODE;
  if (major > wantMajor || (major === wantMajor && minor >= wantMinor)) return undefined;
  return `[devora] ${engineName} needs Node ${wantMajor}.${wantMinor} or later (this is Node ${version}); use a newer Node, or run with --engine=vite`;
}
