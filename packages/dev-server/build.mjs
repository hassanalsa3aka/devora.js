// Builds dist/: TypeScript with tsc, then copies the plain-JavaScript files (the module hooks and the parser rules, which tsc does not emit).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
execFileSync(process.execPath, [tsc, "-p", path.join(here, "tsconfig.build.json")], { cwd: here, stdio: "inherit" });
mkdirSync(path.join(here, "dist"), { recursive: true });
for (const file of ["core.mjs", "core.d.mts", "hooks.mjs", "hooks.d.mts"]) copyFileSync(path.join(here, "src", file), path.join(here, "dist", file));
