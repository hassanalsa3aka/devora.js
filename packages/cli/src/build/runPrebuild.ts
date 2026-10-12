import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Runs app.config.ts `prebuild` — codegen/asset steps a clean checkout
 * (a CI runner, a Vercel/Netlify build) doesn't have yet: `prisma generate`,
 * a Tailwind build, copying fonts. Commands run in the app's directory, one
 * at a time, through the platform shell, inheriting this process's env —
 * including the NODE_ENV=production `devora build` sets. Like an npm script,
 * the app's and the project root's `node_modules/.bin` are on PATH, so
 * `prisma generate` finds the locally installed bin (no `npx`, which can
 * silently fetch an unrelated package of the same name). The first non-zero
 * exit stops the build.
 */
export function runPrebuild(
  appName: string,
  appRoot: string,
  prebuild: string | string[] | undefined,
  projectRoot: string = appRoot
): void {
  const commands = prebuild === undefined ? [] : Array.isArray(prebuild) ? prebuild : [prebuild];
  for (const command of commands) {
    if (typeof command !== "string" || command.trim() === "") {
      throw new Error(`[devora] "${appName}": prebuild entries must be non-empty strings`);
    }
    console.log(`[devora] "${appName}" prebuild: ${command}`);
    const binDirs = [...new Set([path.join(appRoot, "node_modules", ".bin"), path.join(projectRoot, "node_modules", ".bin")])];
    const env = { ...process.env, PATH: [...binDirs, process.env.PATH ?? ""].join(path.delimiter) };
    const result = spawnSync(command, { cwd: appRoot, shell: true, stdio: "inherit", env });
    if (result.error) {
      throw new Error(`[devora] "${appName}": prebuild "${command}" couldn't start: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const how = result.signal ? `was killed by ${result.signal}` : `exited with code ${result.status}`;
      throw new Error(`[devora] "${appName}": prebuild "${command}" ${how} — build stopped.`);
    }
  }
}
