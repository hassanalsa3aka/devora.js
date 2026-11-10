import { readdir, rm } from "node:fs/promises";
import path from "node:path";

/**
 * Removes every file and folder whose name starts with a dot from the client output, except the `.well-known` folder at the
 * top (and what is inside it that does not start with a dot). The build copies the public folder as it is, so a `.env` or a
 * `.git` folder there would otherwise be published by the server and by every adapter that serves `dist/client` as static files.
 * Returns the paths it removed, relative to `dir`.
 */
export async function removeDotfiles(dir: string): Promise<string[]> {
  const removed: string[] = [];
  const walk = async (current: string, top: boolean): Promise<void> => {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.name.startsWith(".") && !(top && entry.name === ".well-known")) {
        await rm(full, { recursive: true, force: true });
        removed.push(path.relative(dir, full));
      } else if (entry.isDirectory()) {
        await walk(full, false);
      }
    }
  };
  await walk(dir, true);
  return removed;
}
