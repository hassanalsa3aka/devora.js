/**
 * esbuild transforms for files the browser asks for, cached by path, size and modification time. Only files that
 * resolveServedFile() returned are transformed; nothing from the request other than that path reaches esbuild.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const LOADERS: Record<string, "tsx" | "ts" | "jsx" | "js"> = { ".tsx": "tsx", ".ts": "ts", ".jsx": "jsx", ".js": "js", ".mjs": "js" };

export function isTransformable(file: string): boolean {
  return path.extname(file) in LOADERS;
}

interface Entry {
  key: string;
  code: string;
}

export function createTransformCache() {
  const cache = new Map<string, Entry>();
  return {
    async load(file: string): Promise<string> {
      const info = await stat(file);
      const key = `${info.size}:${info.mtimeMs}`;
      const hit = cache.get(file);
      if (hit?.key === key) return hit.code;
      const source = await readFile(file, "utf8");
      const result = await transform(source, {
        loader: LOADERS[path.extname(file)] ?? "js",
        format: "esm",
        jsx: "automatic",
        target: "es2022",
        sourcemap: "inline",
        sourcefile: file,
      });
      cache.set(file, { key, code: result.code });
      return result.code;
    },
    invalidate(file: string): void {
      cache.delete(file);
    },
    get size(): number {
      return cache.size;
    },
  };
}
