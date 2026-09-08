import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { AuthChoice } from "./resolveAuthChoice.js";

export interface ScaffoldAppOptions {
  authMode: AuthChoice;
  /**
   * Version string for the generated package.json's "@devorajs/core"
   * dependency. `"*"` when scaffolding *inside* this monorepo (`devora
   * new`/`add`, where `packages/core` is a sibling workspace member pnpm/
   * npm/yarn link locally) — a real pinned semver range (e.g. `"^0.1.0"`)
   * when scaffolding a genuinely standalone project (`create-devora`),
   * where `@devorajs/core` is an ordinary published npm package, not a
   * workspace sibling, and `"*"` would be needlessly loose for it.
   * `"@devorajs/backend"` is NOT parameterized the same way — it's always the
   * scaffolded project's own local workspace package (`packages/backend`),
   * in both cases, so it always gets `"*"`.
   */
  coreVersion: string;
}

/**
 * Writes every file for ONE app (`entry-server.tsx`, `vite.config.ts`,
 * `vercel.json`/`netlify.toml`, `routes/`, etc.) into `appDir` — the exact
 * template `devora new`/`add` has always generated, extracted here so
 * `create-devora` (scaffolding a brand-new project from an empty directory,
 * before any `devora.config.ts` exists to register an app *into*) can reuse
 * it verbatim instead of duplicating it. Registering the app in a project's
 * `devora.config.ts` is deliberately NOT this function's job — `devora new`/
 * `add` inserts into an *existing* file (packages/cli/src/commands/new.ts);
 * `create-devora` generates a brand new one from scratch (scaffoldProject
 * Files.ts) — different enough operations that forcing them through one
 * shared code path would be the wrong abstraction, not a reuse win.
 *
 * Caller is responsible for creating `appDir`'s parent and checking it
 * doesn't already exist — this function only ever writes into a directory
 * it assumes is safe to write into.
 */
export async function scaffoldAppFiles(appDir: string, appName: string, opts: ScaffoldAppOptions): Promise<void> {
  const { authMode, coreVersion } = opts;

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
          "@devorajs/core": coreVersion,
          "@devorajs/backend": "*",
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
    `import { defineApp } from "@devorajs/core/config";\n\n` +
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
      `import { createRenderRoute, createRenderStatic } from "@devorajs/core";\n\n` +
      `// Framework SSR entry point for this app — loaded via vite.ssrLoadModule\n` +
      `// so react-dom/server resolves against this app's own node_modules. The\n` +
      `// actual render logic lives once in @devorajs/core's renderRoute.ts,\n` +
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

  // Netlify's equivalent of vercel.json above, and for the identical
  // reason: without a committed config, Netlify's dashboard falls back to
  // zero-config `vite build` detection and fails the same way. Static and
  // pre-committed on purpose — NOT regenerated by `devora build --adapter=
  // netlify` (see adapter-netlify/src/index.ts's comment on this), since a
  // config that only appears as build output is too late for the very
  // build it's meant to configure.
  await writeFile(
    path.join(appDir, "netlify.toml"),
    `[build]\n` +
      `  command = "cd ../.. && node packages/cli/dist/index.js build --app=${appName} --adapter=netlify"\n` +
      `  publish = "dist/client"\n` +
      `  functions = "netlify/functions"\n\n` +
      `[[redirects]]\n` +
      `  from = "/*"\n` +
      `  to = "/.netlify/functions/ssr"\n` +
      `  status = 200\n`
  );

  await writeFile(
    path.join(appDir, "routes", "index.tsx"),
    `import { PageShell } from "@devorajs/core";\n\n` +
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
      `import type { RequestContext } from "@devorajs/core";\n` +
        `import { redirect, CsrfField, PageShell } from "@devorajs/core";\n\n` +
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
      `import type { RequestContext } from "@devorajs/core";\n` +
        `import { redirect, CsrfField, PageShell } from "@devorajs/core";\n\n` +
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
      `import type { RequestContext } from "@devorajs/core";\n` +
        `import { PageShell } from "@devorajs/core";\n\n` +
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
}
