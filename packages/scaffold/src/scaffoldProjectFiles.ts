import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, cp } from "node:fs/promises";
import type { AuthChoice } from "./resolveAuthChoice.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScaffoldProjectApp {
  name: string;
  domain: string;
  auth: AuthChoice;
}

export interface ScaffoldProjectOptions {
  projectName: string;
  apps: ScaffoldProjectApp[];
  /** Real pinned version for "@devorajs/core"/"@devorajs/cli" — these are
   * ordinary published npm packages for a project scaffolded by
   * create-devora, not local workspace members the way they are inside the
   * devora.js monorepo itself. */
  coreVersion: string;
  cliVersion: string;
}

/**
 * Generates the ROOT of a brand-new devora.js project — everything that has
 * to exist *before* any app can be scaffolded into it: `devora.config.ts`,
 * the workspace manifest, `packages/backend`, shared brand assets. Only
 * ever called by `create-devora`, which starts from a completely empty
 * directory — `devora new`/`add` never need this, since they only ever run
 * *inside* a project that already has all of this (see scaffoldAppFiles.ts's
 * doc comment for why registering an app is kept as two different code
 * paths rather than forced through one).
 */
export async function scaffoldProjectFiles(projectRoot: string, opts: ScaffoldProjectOptions): Promise<void> {
  const { projectName, apps, coreVersion, cliVersion } = opts;

  await mkdir(projectRoot, { recursive: true });

  await writeFile(
    path.join(projectRoot, "package.json"),
    JSON.stringify(
      {
        name: projectName,
        private: true,
        version: "0.1.0",
        scripts: {
          dev: "devora dev",
          build: "devora build",
          start: "devora start",
        },
        // "workspaces" (npm/Yarn) alongside pnpm-workspace.yaml — same
        // dual-declaration devora.js's own root package.json uses, for the
        // identical reason (see README.md's "Cross-package-manager notes").
        // No "adapters/*" entry — unlike the devora.js monorepo itself,
        // there's no project-local adapter source here at all; @devorajs/
        // adapter-vercel/@devorajs/adapter-netlify are ordinary npm deps of
        // @devorajs/cli, not something a scaffolded project owns or edits.
        workspaces: ["packages/*", "apps/*"],
        dependencies: {
          "@devorajs/core": coreVersion,
        },
        devDependencies: {
          "@devorajs/cli": cliVersion,
        },
        engines: {
          node: ">=20",
        },
      },
      null,
      2
    ) + "\n"
  );

  await writeFile(
    path.join(projectRoot, "pnpm-workspace.yaml"),
    `packages:\n  - "packages/*"\n  - "apps/*"\n`
  );

  await writeFile(
    path.join(projectRoot, ".npmrc"),
    `link-workspace-packages=true\n`
  );

  // Copied from this package's own templates/ dir, not reached for
  // out-of-package via the monorepo's real root tsconfig.base.json — this
  // code ends up bundled and shipped as part of create-devora's own npm
  // package, where the monorepo root won't exist at all at runtime.
  await cp(
    path.join(__dirname, "..", "templates", "tsconfig.base.json"),
    path.join(projectRoot, "tsconfig.base.json")
  );

  await writeFile(
    path.join(projectRoot, ".gitignore"),
    `node_modules/\ndist/\n.vercel/\n.netlify/\nnetlify/\n*.tsbuildinfo\n\n` +
      `.env\n.env.*\n!.env.example\n\n.DS_Store\n`
  );

  await writeFile(
    path.join(projectRoot, ".env.example"),
    `# Copy this file to .env and fill in real values before deploying anywhere\n` +
      `# that matters. .env itself is gitignored — never commit real secrets.\n#\n` +
      `# Sessions are opt-in per app (devora.config.ts's \`auth\` field). An app\n` +
      `# with \`auth: "none"\` needs none of the variables below at all.\n\n` +
      `# Required in production for any "shared"-auth app; optional in dev — an\n` +
      `# insecure dev-only fallback is used instead, with a warning.\n` +
      `# Generate one with: openssl rand -base64 32\n` +
      `DEVORA_SESSION_SECRET=\n\n` +
      `# Per-app override for any app with auth: "isolated" — name the variable\n` +
      `# DEVORA_SESSION_SECRET_<APPNAME> in uppercase.\n` +
      apps
        .filter((a) => a.auth === "isolated")
        .map((a) => `DEVORA_SESSION_SECRET_${a.name.toUpperCase()}=\n`)
        .join("") +
      `\nNODE_ENV=production\n`
  );

  const appEntries = apps
    .map((app) => {
      const authField = app.auth !== "shared" ? `, auth: "${app.auth}"` : `, auth: "shared"`;
      return `    { name: "${app.name}", dir: "apps/${app.name}", domain: "${app.domain}"${authField} },`;
    })
    .join("\n");

  await writeFile(
    path.join(projectRoot, "devora.config.ts"),
    `import { defineProject } from "@devorajs/core/config";\n\n` +
      `export default defineProject({\n` +
      `  apps: [\n${appEntries}\n  ],\n` +
      `  shared: {\n` +
      `    core: "packages/core",\n` +
      `    backend: "packages/backend",\n` +
      `    auth: "shared",\n` +
      `  },\n` +
      `});\n`
  );

  await writeFile(
    path.join(projectRoot, "README.md"),
    `# ${projectName}\n\n` +
      `A [devora.js](https://github.com/hassanalsa3aka/devora.js) project.\n\n` +
      `## Apps\n\n` +
      apps.map((a) => `- **${a.name}** (\`apps/${a.name}\`) — auth: \`${a.auth}\`, domain: \`${a.domain}\`\n`).join("") +
      `\n## Getting started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n` +
      `See \`devora.config.ts\` to add/remove apps, or run \`npx devora add <name>\`.\n`
  );

  // Shared backend — same starter shape apps/*'s own package.json already
  // expects (@devorajs/backend, workspace-linked via "*"). Kept minimal on
  // purpose: no example server function pre-wired to any specific route,
  // since which apps exist and what they need is entirely up to the user's
  // choices above — see packages/backend/db/index.ts in the devora.js repo
  // itself for the fuller, dashboard-settings-wired example this
  // intentionally does NOT duplicate here.
  await mkdir(path.join(projectRoot, "packages", "backend", "db"), { recursive: true });
  await writeFile(
    path.join(projectRoot, "packages", "backend", "package.json"),
    JSON.stringify(
      {
        // Matches scaffoldAppFiles.ts's hardcoded `"@devorajs/backend": "*"`
        // dependency exactly — that function is shared, unchanged, with
        // `devora new`/`add` (which must keep producing byte-identical
        // output, see this package's own regression test), so this name
        // has to match what it already expects rather than the other way
        // around. A real bug caught by an actual `pnpm install`, not just
        // reading the code: naming this "@project/backend" here while
        // scaffoldAppFiles.ts's apps depend on "@devorajs/backend" left every
        // scaffolded app's install 404ing against the real npm registry.
        name: "@devorajs/backend",
        version: "0.1.0",
        private: true,
        type: "module",
        exports: { "./db": "./db/index.ts" },
        dependencies: { "@devorajs/core": coreVersion },
      },
      null,
      2
    ) + "\n"
  );
  await writeFile(
    path.join(projectRoot, "packages", "backend", "tsconfig.json"),
    `{\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": { "outDir": "dist", "rootDir": "." },\n  "include": ["**/*.ts", "**/*.tsx"],\n  "exclude": ["dist", "node_modules"]\n}\n`
  );
  await writeFile(
    path.join(projectRoot, "packages", "backend", "db", "index.ts"),
    `/**\n * No built-in ORM (bring your own — Prisma, Drizzle, etc.). This stub\n` +
      ` * exists so the rest of the skeleton has something to import against.\n */\n` +
      `export const db = {\n` +
      `  async example(): Promise<unknown> {\n` +
      `    throw new Error("[backend/db] no DB client configured yet — wire up Prisma/Drizzle/etc. here.");\n` +
      `  },\n` +
      `};\n`
  );

  // Shared brand assets (logo/favicon) every scaffolded app's vite.config.ts
  // already points its publicDir at ("../../assets", see
  // scaffoldAppFiles.ts) — bundled with this package rather than fetched
  // or invented at scaffold time.
  await cp(path.join(__dirname, "..", "assets"), path.join(projectRoot, "assets"), { recursive: true });
}
