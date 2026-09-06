/**
 * island — partial hydration (§5, ROADMAP.md #3). `island(() => import(X))`
 * is transformed by packages/cli's Vite plugin (islandsPlugin.ts) into
 * `island(() => import(X), "/@fs/<resolved-path>")` — the second argument is
 * how the client knows what URL to re-import for hydration. Written by hand
 * (no plugin applied) it still works for SSR, it just won't hydrate: the
 * <Island> component renders real content either way, `clientUrl` only
 * gates whether a hydration script tag gets emitted.
 *
 * Only the literal call shape `island(() => import("specifier"))` is
 * recognized by the plugin — no dynamic/computed specifiers, no wrapping.
 */
export interface IslandDescriptor<Props = unknown> {
  readonly __island: true;
  readonly importer: () => Promise<{ default: (props: Props) => unknown }>;
  readonly clientUrl?: string;
}

export function island<Props = unknown>(
  importer: () => Promise<{ default: (props: Props) => unknown }>,
  clientUrl?: string
): IslandDescriptor<Props> {
  return { __island: true, importer, clientUrl };
}
