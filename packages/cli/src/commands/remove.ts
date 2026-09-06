import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile, rm } from "node:fs/promises";

/**
 * Undoes `devora new`/`devora add` — previously had to be done by hand
 * (delete `apps/<name>`, remove its `devora.config.ts` entry), which is
 * exactly the kind of easy-to-get-wrong manual cleanup a CLI that scaffolds
 * apps should also know how to unscaffold. Destructive (deletes a
 * directory), same as `rm -rf` conceptually — no confirmation prompt, by
 * design, matching every other command here (`new`/`add` don't prompt
 * either); the app name has to be typed exactly, which is the guard.
 */
export async function removeApp(appName: string): Promise<void> {
  const root = process.cwd();
  const appDir = path.join(root, "apps", appName);
  const configPath = path.join(root, "devora.config.ts");

  let removedFromConfig = false;
  if (existsSync(configPath)) {
    const original = await readFile(configPath, "utf-8");
    // Matches the exact one-line array entry scaffoldApp() (new.ts) writes:
    // `    { name: "<appName>", dir: "apps/<appName>", domain: "...", ... },`
    // A comment directly above an entry (e.g. admin's "isolated" note) is
    // deliberately left alone — safely detecting "this comment belongs only
    // to the next entry" from plain text isn't reliable enough to automate.
    const entryRe = new RegExp(`[ \\t]*\\{ name: "${appName}"[^\\n]*\\},\\n`);
    const updated = original.replace(entryRe, "");
    if (updated !== original) {
      await writeFile(configPath, updated);
      removedFromConfig = true;
    }
  }

  const dirExisted = existsSync(appDir);
  if (dirExisted) {
    await rm(appDir, { recursive: true, force: true });
  }

  if (!removedFromConfig && !dirExisted) {
    console.error(`[devora] "${appName}" not found — no apps/${appName} directory and no matching entry in devora.config.ts`);
    process.exit(1);
  }

  console.log(
    removedFromConfig
      ? `[devora] removed "${appName}" from devora.config.ts`
      : `[devora] "${appName}" wasn't registered in devora.config.ts — nothing to unregister there`
  );
  console.log(
    dirExisted
      ? `[devora] deleted apps/${appName}`
      : `[devora] apps/${appName} didn't exist on disk — nothing to delete`
  );
}
