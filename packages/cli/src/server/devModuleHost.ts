/**
 * What the page, API and session code needs from a dev server: load a module the framework's router matched, map an
 * error back to source, and (for a page's stylesheet links) read the import graph. Vite's dev server has all of it;
 * the experimental dev server (`--experimental-dev-server`) provides the same members, so one set of request handlers
 * serves both and the default path through Vite does not change.
 */
export interface DevModuleHost {
  ssrLoadModule(id: string): Promise<Record<string, any>>;
  ssrFixStacktrace(error: Error): void;
}

export interface DevPageHost extends DevModuleHost {
  moduleGraph: { getModulesByFile(file: string): Set<unknown> | undefined };
  config: { publicDir: string; root: string };
}

/** The URLs a page's HTML refers to. Vite serves files by path; the experimental server uses its own confined routes. */
export interface DevAssetUrls {
  islandClient: string;
  csrClient: string;
  preamble: string;
  /** The browser URL of a route file (csr pages load their route module in the browser). */
  moduleUrl(file: string): string;
}
