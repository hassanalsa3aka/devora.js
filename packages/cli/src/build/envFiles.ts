import { readFileSync } from "node:fs";

/**
 * The `.env` file syntax, read without Vite (so the own engine needs no Vite at all): `KEY=value`, an optional `export `,
 * `#` comments (a whole line, or after an unquoted value), single, double and backtick quotes (double quotes may span lines
 * and turn `\n` into a newline), and `$VAR` / `${VAR}` references to earlier values or the environment (`\$` is a dollar).
 * Nothing here runs code. A test compares it with Vite's loadEnv on a set of tricky files.
 */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.replace(/\r\n?/g, "\n");
  const pattern = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
  for (const match of lines.matchAll(pattern)) {
    const key = match[1]!;
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    out[key] = value;
  }
  return out;
}

/** Replaces `$NAME` and `${NAME}` (not `\$`) with the value from `known` (earlier file values, then the environment). */
export function expandEnv(values: Record<string, string>, environment: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  const resolve = (key: string, seen: Set<string>): string => {
    if (key in result) return result[key]!;
    if (key in values && !seen.has(key)) {
      seen.add(key);
      return (result[key] = expand(values[key]!, seen));
    }
    return environment[key] ?? "";
  };
  const expand = (value: string, seen: Set<string>): string =>
    value.replace(/(.?)\$(?:\{([\w.-]+)\}|([\w]+))/g, (whole, before: string, braced: string | undefined, bare: string | undefined) => {
      if (before === "\\") return whole.slice(1);
      return before + resolve((braced ?? bare)!, new Set(seen));
    }).replace(/\\\$/g, "$");
  for (const key of Object.keys(values)) result[key] = resolve(key, new Set());
  return result;
}

/** What `loadEnv(mode, root, "")` returned from the files alone: `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`, later files winning. */
export function readEnvFiles(root: string, mode: string, files: string[], environment: Record<string, string | undefined>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of files) {
    try {
      Object.assign(merged, parseEnv(readFileSync(`${root}/${file}`, "utf8")));
    } catch {
      /* a file that cannot be read is skipped, like a missing one */
    }
  }
  void mode;
  return expandEnv(merged, environment);
}
