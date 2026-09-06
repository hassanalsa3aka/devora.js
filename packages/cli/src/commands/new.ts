import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";

/**
 * Scaffolds a new app and registers it in devora.config.ts — the shared
 * implementation behind both `devora new <name>` (original name) and
 * `devora add <name>` (friendlier alias, same action, added alongside it
 * rather than replacing it so existing docs/scripts using `new` keep
 * working).
 *
 * Regenerated from scratch here to match the framework's *current* shape —
 * this had gone stale: it was still generating the old, since-deduplicated
 * per-app `entry-server.tsx` (ROADMAP.md's `entry-server.tsx` de-dup item)
 * instead of the new shared `createRenderRoute`/`createRenderStatic` shim,
 * had no `csr-client.tsx` (renderMode: "csr" didn't exist when this was
 * last touched), no `publicDir` wiring for the shared logo/theme
 * (ROADMAP.md's shared-design item), and — a real, previously undiscovered
 * gap, not just staleness — **never wrote a package.json at all**, so a
 * scaffolded app had no dependencies declared and wasn't actually a valid
 * pnpm/npm/Yarn workspace member; nothing would have installed react/vite
 * for it. Confirmed by checking `apps/dashboard`'s actual files and
 * comparing, not assumed from memory of what the scaffolder should produce.
 */
export async function scaffoldApp(appName: string, opts: { domain?: string }): Promise<void> {
  const root = process.cwd();
  const appDir = path.join(root, "apps", appName);

  if (existsSync(appDir)) {
    console.error(`[devora] apps/${appName} already exists`);
    process.exit(1);
  }

  await mkdir(path.join(appDir, "routes"), { recursive: true });

  await writeFile(
    path.join(appDir, "package.json"),
    JSON.stringify(
      {
        name: `@project/app-${appName}`,
        version: "0.1.0",
        private: true,
        type: "module",
        dependencies: {
          "@devora/core": "*",
          "@devora/backend": "*",
          react: "^18.3.0",
          "react-dom": "^18.3.0",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.3.0",
          vite: "^5.4.0",
        },
      },
      null,
      2
    ) + "\n"
  );

  await writeFile(
    path.join(appDir, "tsconfig.json"),
    `{\n` +
      `  "extends": "../../tsconfig.base.json",\n` +
      `  "compilerOptions": { "outDir": "dist", "rootDir": "." },\n` +
      `  "include": ["**/*.ts", "**/*.tsx"],\n` +
      `  "exclude": ["dist", "node_modules"]\n` +
      `}\n`
  );

  await writeFile(
    path.join(appDir, "app.config.ts"),
    `import { defineApp } from "@devora/core/config";\n\n` +
      `export default defineApp({\n` +
      `  defaultRenderMode: "ssr",\n` +
      `  // Opt-in, off by default — see ROADMAP.md #7. Turn on for a\n` +
      `  // public-facing app; leave off for an internal one.\n` +
      `  sitemap: false,\n` +
      `});\n`
  );

  await writeFile(
    path.join(appDir, "vite.config.ts"),
    `import path from "node:path";\n` +
      `import { fileURLToPath } from "node:url";\n` +
      `import { defineConfig } from "vite";\n` +
      `import react from "@vitejs/plugin-react";\n\n` +
      `const __dirname = path.dirname(fileURLToPath(import.meta.url));\n\n` +
      `export default defineConfig({\n` +
      `  plugins: [react()],\n` +
      `  // Shared brand assets (logo, favicon) — see packages/core/src/theme.ts.\n` +
      `  publicDir: path.resolve(__dirname, "../../assets"),\n` +
      `});\n`
  );

  await writeFile(
    path.join(appDir, "entry-server.tsx"),
    `import { createElement } from "react";\n` +
      `import { renderToString } from "react-dom/server";\n` +
      `import { createRenderRoute, createRenderStatic } from "@devora/core";\n\n` +
      `// Framework SSR entry point for this app — loaded via vite.ssrLoadModule\n` +
      `// so react-dom/server resolves against this app's own node_modules. The\n` +
      `// actual render logic lives once in @devora/core's renderRoute.ts,\n` +
      `// shared by every app; this file only supplies the React bindings that\n` +
      `// genuinely can't be shared.\n` +
      `export const renderRoute = createRenderRoute({ createElement, renderToString });\n` +
      `export const renderStatic = createRenderStatic({ createElement, renderToString });\n`
  );

  await writeFile(
    path.join(appDir, "island-client.tsx"),
    `import { createElement } from "react";\n` +
      `import { hydrateRoot } from "react-dom/client";\n\n` +
      `// Only requested when a page actually used an island() — see\n` +
      `// packages/core/src/islandComponent.tsx.\n` +
      `for (const node of document.querySelectorAll<HTMLElement>("[data-island]")) {\n` +
      `  const url = node.getAttribute("data-island-url");\n` +
      `  if (!url) continue;\n` +
      `  const propsJson = node.getAttribute("data-island-props");\n` +
      `  const props = propsJson ? JSON.parse(propsJson) : {};\n` +
      `  import(/* @vite-ignore */ url).then((mod) => {\n` +
      `    hydrateRoot(node, createElement(mod.default, props));\n` +
      `  });\n` +
      `}\n`
  );

  await writeFile(
    path.join(appDir, "csr-client.tsx"),
    `import { createElement } from "react";\n` +
      `import { createRoot } from "react-dom/client";\n\n` +
      `// Only requested when a page's renderMode is "csr" — see\n` +
      `// packages/core/src/csrRoute.ts.\n` +
      `for (const node of document.querySelectorAll<HTMLElement>("[data-csr-entry]")) {\n` +
      `  const url = node.getAttribute("data-csr-entry");\n` +
      `  if (!url) continue;\n` +
      `  import(/* @vite-ignore */ url).then((mod) => {\n` +
      `    createRoot(node).render(createElement(mod.default));\n` +
      `  });\n` +
      `}\n`
  );

  await writeFile(
    path.join(appDir, "routes", "index.tsx"),
    `import { PageShell } from "@devora/core";\n\n` +
      `export const renderMode = "ssr";\n\n` +
      `export function meta() {\n` +
      `  return { title: "${appName}" };\n` +
      `}\n\n` +
      `export async function loader() {\n` +
      `  return {};\n` +
      `}\n\n` +
      `export default function Index() {\n` +
      `  return (\n` +
      `    <PageShell appName="${appName}">\n` +
      `      <h1>Welcome to ${appName}</h1>\n` +
      `      <p>Edit apps/${appName}/routes/index.tsx to get started.</p>\n` +
      `    </PageShell>\n` +
      `  );\n` +
      `}\n`
  );

  const configPath = path.join(root, "devora.config.ts");
  if (existsSync(configPath)) {
    const original = await readFile(configPath, "utf-8");
    const domain = opts.domain ?? `${appName}.example.com`;
    const insertion = `    { name: "${appName}", dir: "apps/${appName}", domain: "${domain}" },\n  ],`;
    const updated = original.replace(/\n\s*\],/, `\n${insertion}`);
    if (updated !== original) {
      await writeFile(configPath, updated);
      console.log(`[devora] registered "${appName}" in devora.config.ts (domain: ${domain})`);
    } else {
      console.log(
        `[devora] scaffolded apps/${appName} — could not auto-edit devora.config.ts, add it manually`
      );
    }
  }

  console.log(`[devora] created apps/${appName}`);
  console.log(`[devora] run "pnpm install" (or npm/yarn) to link its dependencies, then "devora dev --app=${appName}"`);
}

/** Original command name — kept working, unchanged, alongside `add`. */
export const newApp = scaffoldApp;
