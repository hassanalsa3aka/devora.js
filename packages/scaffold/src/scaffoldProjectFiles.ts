import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, cp } from "node:fs/promises";
import type { AuthChoice } from "./resolveAuthChoice.js";
import type { ProjectScope } from "./resolveScopeChoice.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Where the "one shared backend, app-specific logic per app" pattern is
 * documented — printed by create-devora after scaffolding, and linked from
 * the generated README. */
export const MULTI_BACKEND_DOCS_URL = "https://devorajs-docs-docs.vercel.app/core-concepts#shared-backend";

const SCOPE_LABEL: Record<ProjectScope, string> = {
  fullstack: "full-stack (page apps + one shared backend)",
  frontend: "frontend only (page apps, no shared backend)",
  backend: "backend only (API apps + one shared backend)",
};

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
  /** Default "fullstack". "frontend" skips `packages/backend` entirely — see
   * resolveScopeChoice.ts. */
  scope?: ProjectScope;
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
  const scope = opts.scope ?? "fullstack";
  const hasBackend = scope !== "frontend";

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
          // Opt-in LAN exposure (phone/device testing) — never the default
          // `dev` script; see the generated README's "Testing on another
          // device" section for what it exposes.
          "dev:host": "devora dev --host",
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
        // @devorajs/cli is a real "dependencies" entry, NOT devDependencies
        // — it looks like a dev-only tool, but the *build* itself needs its
        // bin to exist, and platform build steps (confirmed on a real
        // Netlify deploy: "added 67 packages" vs. 119 in the full lockfile)
        // commonly install with devDependencies omitted. A devDependency
        // there is invisible locally (a normal `npm install` always
        // includes both) and only breaks on a platform's production-only
        // install — exactly the kind of gap this project's own "works
        // locally, fails on the platform" bugs have repeatedly turned out
        // to be (see ROADMAP.md #4).
        dependencies: {
          "@devorajs/core": coreVersion,
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
      // A frontend-only project has no shared backend — leaving the field
      // out (rather than pointing it at a directory that doesn't exist)
      // keeps `devora split backend` from acting on nothing.
      (hasBackend ? `    backend: "packages/backend",\n` : "") +
      `    auth: "shared",\n` +
      `    // Where login sessions are stored server-side. Unset, \`devora dev\` uses\n` +
      `    // an in-memory store (with a warning) and a production server refuses to\n` +
      `    // start. Set it to a module path whose default export is a SessionStore\n` +
      `    // backed by your database (defineSessionStore from @devorajs/core), or to\n` +
      `    // "memory" for a single long-lived \`devora start\` process (not serverless).\n` +
      `    // sessions: { store: "${hasBackend ? "packages/backend/sessionStore.ts" : "sessionStore.ts"}" },\n` +
      `  },\n` +
      `});\n`
  );

  await writeFile(
    path.join(projectRoot, "README.md"),
    `# ${projectName}\n\n` +
      `A [devora.js](https://github.com/hassanalsa3aka/devora.js) project.\n\n` +
      `## Apps\n\n` +
      `Scope: **${SCOPE_LABEL[scope]}**.\n\n` +
      apps.map((a) => `- **${a.name}** (\`apps/${a.name}\`) — auth: \`${a.auth}\`, domain: \`${a.domain}\`\n`).join("") +
      (hasBackend
        ? `\nShared backend logic lives in \`packages/backend\`, used by every app. Logic only one app\n` +
          `needs can live in that app instead — see "The shared backend pattern" in the docs:\n` +
          `${MULTI_BACKEND_DOCS_URL}\n`
        : `\nNo shared backend (\`packages/backend\`) was generated for this frontend-only project.\n`) +
      `\n## Getting started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n` +
      `Each app gets its own port, starting at 10000 in \`devora.config.ts\` order (set \`devPort\` on an\n` +
      `app to pick one). \`devora dev\` prints every app's URL and route table on boot.\n\n` +
      `See \`devora.config.ts\` to add/remove apps, or run \`npx devora add <name>\`.\n\n` +
      `## Testing on another device (phone, tablet)\n\n` +
      `By default the dev server only listens on this machine (\`localhost\`). To reach it from a phone\n` +
      `on the same Wi-Fi, opt in explicitly:\n\n` +
      `\`\`\`bash\nnpm run dev:host   # same as: npx devora dev --host\n\`\`\`\n\n` +
      `This binds all network interfaces and prints a \`Network:\` URL (your LAN IP) and the API base URL\n` +
      `for each app — use those on the other device. It also prints a warning, because while it's on,\n` +
      `**anyone on the same network can reach your dev server** (on shared/office/café Wi-Fi, that's\n` +
      `strangers too). Use it on networks you trust, and stop it when you're done. This is a dev-only\n` +
      `concern: production goes through \`devora build\` + an adapter, not the dev server.\n`
  );

  // Shared backend — same starter shape apps/*'s own package.json already
  // expects (@devorajs/backend, workspace-linked via "*"). Kept minimal on
  // purpose: no example server function pre-wired to any specific route,
  // since which apps exist and what they need is entirely up to the user's
  // choices above — see packages/backend/db/index.ts in the devora.js repo
  // itself for the fuller, dashboard-settings-wired example this
  // intentionally does NOT duplicate here.
  if (hasBackend) {
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
  }

  // Shared brand assets (logo/favicon) every scaffolded app's vite.config.ts
  // already points its publicDir at ("../../assets", see
  // scaffoldAppFiles.ts) — bundled with this package rather than fetched
  // or invented at scaffold time.
  await cp(path.join(__dirname, "..", "assets"), path.join(projectRoot, "assets"), { recursive: true });
}
