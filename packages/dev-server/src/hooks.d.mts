export interface ServerHooks {
  hooks: {
    resolve(specifier: string, context: { parentURL?: string }, nextResolve: (specifier: string, context?: unknown) => { url: string }): { url: string; shortCircuit?: boolean };
    load(url: string, context: unknown, nextLoad: (url: string, context?: unknown) => unknown): unknown;
  };
  addApp(id: string, roots: { prefix: string; dir: string }[], compileCacheDir?: string, aliases?: unknown): void;
  entryUrl(id: string, file: string): string;
  invalidate(id: string, file: string): string[];
  loaded(id: string): string[];
  prewarm(id: string, files: string[], concurrency?: number): Promise<void>;
}
export function createServerHooks(options: { projectRoot: string; frozen?: string[]}): ServerHooks;
