import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

/**
 * Auth is per-app, not per-project — a marketing site and a dashboard in
 * the same project routinely differ (confirmed with the user; see
 * ROADMAP.md's auth-opt-in item) — so this asks once per scaffolded app
 * rather than once per project. `--auth` skips the prompt entirely (CI/
 * scripted use); with no flag and a real TTY, asks interactively; with no
 * flag and no TTY (piped/non-interactive), defaults to "shared" rather than
 * hanging forever waiting for input that will never come.
 */
async function resolveAuthChoice(explicit: string | undefined): Promise<"shared" | "isolated" | "none"> {
  if (explicit === "shared" || explicit === "isolated" || explicit === "none") return explicit;
  if (explicit) {
    console.error(`[devora] --auth must be "shared", "isolated", or "none" (got "${explicit}")`);
    process.exit(1);
  }
  if (!process.stdin.isTTY) return "shared";

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(
        `Does this app need auth/sessions? [shared/isolated/none] (default: shared): `
      )
    ).trim();
    if (answer === "isolated") return "isolated";
    if (answer === "none") return "none";
    return "shared";
  } finally {
    rl.close();
  }
}

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
export async function scaffoldApp(appName: string, opts: { domain?: string; auth?: string }): Promise<void> {
  const root = process.cwd();
  const appDir = path.join(root, "apps", appName);

  if (existsSync(appDir)) {
    console.error(`[devora] apps/${appName} already exists`);
    process.exit(1);
  }

  const authMode = await resolveAuthChoice(opts.auth);

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
    path.join(appDir, "vercel.json"),
    JSON.stringify(
      {
        $schema: "https://openapi.vercel.sh/vercel.json",
        // A real, previously undiscovered gap, found via an actual Vercel
        // deploy (git-integration import, not the `vercel deploy --prebuilt`
        // CLI flow) — without this, Vercel's zero-config detection runs
        // plain `vite build`, which fails outright ("Could not resolve entry
        // module index.html") since this isn't a conventional Vite SPA.
        // `writeVercelOutput` already produces `.vercel/output` (Build
        // Output API v3) at this app's own root when run with
        // --adapter=vercel; Vercel auto-detects and prefers that over any
        // "Output Directory" setting once it exists, so nothing else needs
        // overriding here — just which command actually runs.
        buildCommand: `cd ../.. && node packages/cli/dist/index.js build --app=${appName} --adapter=vercel`,
        // Vercel's dashboard cosmetically labels this app "Vite" (it sees
        // `vite` in package.json devDependencies) even though buildCommand
        // above already overrides what runs — `framework: null` tells
        // Vercel not to apply *any* framework-specific zero-config
        // assumptions at all, belt-and-suspenders against a future one
        // (routing/output-dir defaults, etc.) surfacing the same way the
        // build-command one did.
        framework: null,
      },
      null,
      2
    ) + "\n"
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

  // Don't scaffold a fake login flow into an app that said no to auth — an
  // unused login route would be dead code at best and a false invitation to
  // wire up real credential checking at worst.
  if (authMode !== "none") {
    await writeFile(
      path.join(appDir, "routes", "login.tsx"),
      `import type { RequestContext } from "@devora/core";\n` +
        `import { redirect, CsrfField, PageShell } from "@devora/core";\n\n` +
        `export const renderMode = "ssr";\n\n` +
        `export function meta() {\n` +
        `  return { title: "Log in", description: "${appName} login (demo)" };\n` +
        `}\n\n` +
        `// Demo only: the framework provides the session *carrier* (signing/cookie\n` +
        `// storage — see packages/core/src/session.ts). Checking who someone is\n` +
        `// stays bring-your-own (§6/§11): a real app verifies a password/token\n` +
        `// against its own DB/provider before calling ctx.setSession(); this route\n` +
        `// trusts any submitted username so the carrier can be exercised end to end.\n` +
        `export async function action(formData: FormData, ctx: RequestContext) {\n` +
        `  ctx.verifyCsrf(formData);\n` +
        `  const username = String(formData.get("username") ?? "");\n` +
        `  if (!username) throw new Error("username required");\n` +
        `  ctx.setSession({ username });\n` +
        `  return redirect("/");\n` +
        `}\n\n` +
        `export default function Login({ csrfToken }: { csrfToken?: string }) {\n` +
        `  return (\n` +
        `    <PageShell appName="${appName}">\n` +
        `      <h1>Log in</h1>\n` +
        `      <p><strong>Demo only</strong> — accepts any username with no password check.</p>\n` +
        `      <form method="post">\n` +
        `        <CsrfField token={csrfToken} />\n` +
        `        <input name="username" placeholder="username" />\n` +
        `        <button type="submit">Log in</button>\n` +
        `      </form>\n` +
        `    </PageShell>\n` +
        `  );\n` +
        `}\n`
    );

    await writeFile(
      path.join(appDir, "routes", "logout.tsx"),
      `import type { RequestContext } from "@devora/core";\n` +
        `import { redirect, CsrfField, PageShell } from "@devora/core";\n\n` +
        `export const renderMode = "ssr";\n\n` +
        `export function meta() {\n` +
        `  return { title: "Log out", description: "${appName} logout" };\n` +
        `}\n\n` +
        `export async function action(formData: FormData, ctx: RequestContext) {\n` +
        `  ctx.verifyCsrf(formData);\n` +
        `  ctx.clearSession();\n` +
        `  return redirect("/login");\n` +
        `}\n\n` +
        `export default function Logout({ csrfToken }: { csrfToken?: string }) {\n` +
        `  return (\n` +
        `    <PageShell appName="${appName}">\n` +
        `      <h1>Log out</h1>\n` +
        `      {/* POST-only, never a bare <a href="/logout"> — a GET-triggered logout\n` +
        `          is itself a CSRF-adjacent footgun. */}\n` +
        `      <form method="post">\n` +
        `        <CsrfField token={csrfToken} />\n` +
        `        <button type="submit">Log out</button>\n` +
        `      </form>\n` +
        `    </PageShell>\n` +
        `  );\n` +
        `}\n`
    );

    await writeFile(
      path.join(appDir, "routes", "account.tsx"),
      `import type { RequestContext } from "@devora/core";\n` +
        `import { PageShell } from "@devora/core";\n\n` +
        `export const renderMode = "ssr";\n\n` +
        `export function meta() {\n` +
        `  return { title: "Account", description: "${appName} account (protected demo)" };\n` +
        `}\n\n` +
        `// ctx.requireAuth() throws if there's no active session — see\n` +
        `// packages/core/src/session.ts and apps/dashboard/routes/settings.tsx for\n` +
        `// the same pattern against the shared backend.\n` +
        `export async function loader(ctx: RequestContext) {\n` +
        `  ctx.requireAuth();\n` +
        `  return { session: ctx.session };\n` +
        `}\n\n` +
        `export default function Account({ data }: { data?: { session: unknown } }) {\n` +
        `  return (\n` +
        `    <PageShell appName="${appName}">\n` +
        `      <h1>Account</h1>\n` +
        `      <p>Protected demo route — only reachable with an active session (see routes/login.tsx).</p>\n` +
        `      <pre>{JSON.stringify(data?.session, null, 2)}</pre>\n` +
        `    </PageShell>\n` +
        `  );\n` +
        `}\n`
    );
  }

  const configPath = path.join(root, "devora.config.ts");
  if (existsSync(configPath)) {
    const original = await readFile(configPath, "utf-8");
    const domain = opts.domain ?? `${appName}.example.com`;
    // Written explicitly regardless of value (even "shared", the project's
    // usual default) — the whole point of asking per-app is that it must be
    // unambiguous which apps have sessions enabled just by reading this
    // file, not implied by omission matching whatever the project default
    // happens to be today.
    const insertion = `    { name: "${appName}", dir: "apps/${appName}", domain: "${domain}", auth: "${authMode}" },\n  ],`;
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
