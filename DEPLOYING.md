# Deploying

Devora.js is a **multi-app** project — a repo can declare several apps (`devora.config.ts`), and
each one deploys as its own independent unit. This is inherent to how Vercel/Netlify project
structure works, not a devora-specific convention: a multi-app project means multiple platform
projects, each rooted at its own `apps/<name>` directory.

Four targets are supported: Vercel, Netlify, Docker, and self-hosting on a plain VPS
(`adapter-node` + nginx/Caddy).

## Vercel

**N Devora apps in one repo = N Vercel projects.** Each app in `devora.config.ts` is its own Vercel
project, importing the same repo with a different Root Directory. Each one deploys as a single
function (pages and API routes together) plus static files.

> **⚠️ Don't keep API routes in a top-level `api/` folder of the Vercel project.**
> `api/` at the root of a Vercel project is Vercel's own reserved functions folder. With Root
> Directory set to `apps/<name>`, Vercel turns every file in `apps/<name>/api/` into **its own**
> serverless function on top of the one Devora builds (25 route files hit the Hobby plan's
> 12-function limit), or type-checks them with its own tsconfig (hundreds of `TS2835`/`TS2834`
> errors after Devora's build already passed). **Put API routes in a different folder and set
> `apiDir` in `app.config.ts`** — URLs don't change, `endpoints/health.ts` still serves
> `/api/health`:
>
> ```ts
> // apps/<name>/app.config.ts
> export default defineApp({ apiDir: "endpoints" });
> ```
>
> Apps scaffolded by `create-devora` or `devora add` already use `apiDir: "endpoints"`. Older apps
> keep the `api/` default; `devora build --adapter=vercel` prints a preflight warning when the
> Vercel project root has an `api/` folder. Don't rely on `.vercelignore` for this — it's not
> confirmed to be honored for git-integration builds.

### Setup (Root Directory = the app — recommended)

1. **Add New → Project**, import the repo, set **Root Directory** to `apps/<name>`. Repeat for each
   app.
2. Leave **Build Command** and **Output Directory** unset in the dashboard. The committed
   `apps/<name>/vercel.json` sets `"framework": null` (so Vercel doesn't run a plain `vite build`)
   and a build command that goes up to the repo root and runs the locally installed CLI:

   ```json
   { "framework": null, "buildCommand": "cd ../.. && ./node_modules/.bin/devora build --app=<name> --adapter=vercel" }
   ```

   (Inside the devora.js repo itself the command is `node packages/cli/dist/index.js` instead.)
   This works in a workspace because the `devora` bin is installed at the repo root, and the
   output lands in `apps/<name>/.vercel/output`, which is where Vercel looks when the Root
   Directory is `apps/<name>`. Keep **"Include files outside the Root Directory in the Build
   Step"** on (the default): the build reads `devora.config.ts` and `packages/*`.
3. **Environment variables** (Project Settings → Environment Variables → Production), only for
   apps whose `auth` is `"shared"` or `"isolated"`:
   - `auth: "shared"` → `DEVORA_SESSION_SECRET` (`openssl rand -base64 32`)
   - `auth: "isolated"` → `DEVORA_SESSION_SECRET_<APPNAME>` (uppercase app name), or
     `DEVORA_SESSION_SECRET` as a fallback. An app name containing `-` produces a name most
     platforms won't accept, so use the fallback for those.
   - `shared.sessions.store` in `devora.config.ts` must point at a DB-backed store. `"memory"`
     doesn't work on serverless (every instance has its own empty store).
   - Changing an env var doesn't apply to an existing deployment. Redeploy after saving it.
   - Cookies: inside the function `trustProxy` defaults to `true` (only Vercel's edge can reach
     it), so `shared.sessions.cookie.secure: "auto"` works there. Sharing one login across
     subdomains needs `shared.sessions.cookie.domain` (see `packages/backend/AUTH.md`).
4. Deploy.

### Alternative: Root Directory = the repo root

Use this if you can't move an existing `api/` folder yet. Vercel then looks for
`<repo>/.vercel/output`, so write the output there with `--out`:

- **Root Directory**: *(empty — the repo root)*
- **Framework Preset**: Other
- **Build Command**: `./node_modules/.bin/devora build --app=<name> --adapter=vercel --out=.vercel/output`
- **Output Directory**: *(leave unset — Vercel picks up `.vercel/output` automatically)*

Set the build command per project in the dashboard; one repo-root `vercel.json` can't hold N
different build commands. The repo root itself must not have an `api/` folder (the preflight check
warns if it does). `--out` needs `--app` (one output per Vercel project).

### Node.js runtime

The function runtime is no longer hardcoded (it used to be `nodejs20.x`, which Vercel now
rejects). `devora build --adapter=vercel` prints the runtime it picked and why:

1. `vercel: { runtime: "nodejs22.x" }` in `app.config.ts`, if set.
2. Otherwise the Node major running the build, if Vercel supports it and it fits `engines.node`.
   On Vercel's build image this is the version the project selected, so build and runtime match.
3. Otherwise the newest Vercel-supported major allowed by `engines.node` (the app's
   `package.json`, then the repo root's).
4. With no `engines.node`, Vercel's default (`nodejs24.x`).

Supported today: `nodejs24.x`, `nodejs22.x`. An `engines.node` that allows neither (e.g. `20.x`)
fails the build with a clear message.

### Codegen before the build (`prebuild`)

A clean checkout doesn't have git-ignored generated files (a Prisma client, compiled CSS, copied
fonts). Run those steps as part of the build:

```ts
// apps/<name>/app.config.ts
export default defineApp({
  prebuild: ["prisma generate --schema ../../packages/backend/prisma/schema.prisma", "npm run build:css"],
});
```

Commands run in the app's directory, in order, before the build, with the app's and the repo
root's `node_modules/.bin` on `PATH` (like an npm script). A non-zero exit stops the build. They
run for every `devora build` / `devora deploy` (any adapter), not for `devora dev`.

### Preflight checks

Before building, `devora build --adapter=vercel` checks:

- the runtime resolves to one Vercel supports (error otherwise);
- the Vercel project root (the folder containing `.vercel/output`) has no `api/` folder (warning);
- `--out`, if given, is a `.vercel/output` directory (warning otherwise);
- session secrets and `shared.sessions.store` for the app's auth mode. A missing secret is an
  **error** when building on Vercel (`VERCEL=1`), where the project's env vars are present, and a
  warning for a local build (`vercel deploy --prebuilt` reads secrets at runtime). A missing store is
  always an error; `"memory"` is a warning.

### CommonJS dependencies

The function is bundled as ESM. Bundled CommonJS packages that `require()` Node built-ins (`pg`
requires `events`) used to crash on the first request with `Dynamic require of "events" is not
supported`. The bundle now defines `require` for them (same for Netlify). Packages with native
addons (`argon2`, `better-sqlite3`) or engine binaries haven't been verified inside the function.

## Netlify

1. **Add new project → Import an existing project**, pick this repo, set **Base directory** to
   `apps/<name>`. Repeat per app.
2. `apps/<name>/netlify.toml` is already committed and sets the build command, publish directory,
   the SSR redirect, and the functions directory. **Netlify's dashboard Build settings take
   precedence over `netlify.toml` when both are set** — if the site was created by pointing
   Netlify at a `vite.config.ts` it auto-detected (or a **Package directory** got set at any
   point), that stored setting silently overrides the committed file on every future build.
   Confirmed directly: a stray `Package directory` value produced a build log reading
   `No config file was defined: using default values` instead of `Config file: .../netlify.toml`,
   and the deployed function 404'd on every route as a result. Fix once, per site: **Site
   configuration → Build & deploy → Build settings → Configure**, and clear **Package directory**
   entirely (leave it blank) — also clear Build command/Publish directory, or set them to match
   `netlify.toml` exactly, if either was set:
   - Build command: `cd ../.. && node packages/cli/dist/index.js build --app=<name> --adapter=netlify`
   - Publish directory: `dist/client`
   - Package directory: (leave blank)

   After fixing this, the build log should read `build.command from netlify.toml` — if it still
   reads `Build command from Netlify app`, the override is still active.
3. **Environment variables** — same rules as Vercel above (Site configuration → Environment
   variables).
4. Deploy — use **Trigger deploy → Clear cache and deploy site** the first time after changing
   dashboard build settings.
5. If the site builds and deploys but the live URL returns a generic 500 rather than your page,
   check **Cloud compute → Functions → ssr** for the actual error (the browser never shows it).
   Netlify's function packager only bundles what it can statically trace from the function's own
   imports, plus whatever `netlify.toml`'s `included_files` explicitly lists. Two real,
   previously-undiscovered gaps here were found against actual live deploys, one at a time as each
   error surfaced: `SyntaxError: Cannot use import statement outside a module` (the adapter's own
   `package.json`, `{"type":"module"}`, wasn't reaching the deployed bundle) and
   `Error: Cannot find package 'react'` (the vendored `react`/`react-dom` in the function's own
   `node_modules` hit the identical blind spot). Both are already fixed in every committed
   `netlify.toml` (`included_files` lists `routes/**`, the app's API folder (`api/**`, or
   `endpoints/**` for newer apps — it must match `apiDir`), `dist/**`, `package.json`, and
   `node_modules/**`) — documented here in case a future platform change reintroduces the same
   class of gap: anything the function reads from disk at runtime instead of statically importing
   has to be named in that list explicitly, or it silently never reaches the deployed function.

## Docker

One `adapter-node` process per container.

```bash
# One app per image — APP_NAME is required, no default.
docker build --build-arg APP_NAME=marketing -t devora-marketing .
docker run -p 4173:4173 devora-marketing

# auth: "shared"/"isolated" apps need their secret passed in (see .env.example):
docker run -p 4173:4173 -e DEVORA_SESSION_SECRET=... devora-dashboard

# All three together, same host ports a bare-VPS nginx/Caddy config would target:
cp .env.example .env   # fill in the session-secret vars
docker compose up --build
```

Inside the container the app listens on `PORT` (4173 unless you set it — `docker run -e PORT=3000`
works). `devora start` reads `PORT` and `HOST` itself; `--port`/`--host` override them.

The image does a full monorepo `pnpm install` in both build and runtime stages (no hand-pruned
dependency list) on one base image throughout — no alpine swap, to avoid native-addon
compatibility issues if you later add a DB driver with native bindings.

## Self-hosting on a VPS (adapter-node + nginx/Caddy)

```bash
devora build --app=marketing && devora build --app=dashboard && devora build --app=admin
devora start                              # all three, sequential ports
devora generate:proxy --target=nginx      # or --target=caddy
# install the generated nginx.conf/Caddyfile the normal way for your distro/
# package manager, then reload nginx/caddy.
```

`devora generate:proxy` reads every app's domain straight out of `devora.config.ts`.

**Behind the proxy:**

- Bind each app to loopback so it's only reachable through the proxy: `HOST=127.0.0.1 devora
  start` (or `--host=127.0.0.1`). `PORT`/`--port` set the first app's port.
- Session cookies are `Secure` by default in production. That's right once the proxy serves HTTPS
  (certbot/Caddy below). **Until then, logins over plain HTTP won't stick** — browsers drop
  `Secure` cookies on HTTP, and the server logs a warning when it happens. For a mixed or plain-HTTP
  setup, set `shared.sessions.cookie.secure` in `devora.config.ts` to `"auto"` and
  `trustProxy: true` in each app's `app.config.ts` (the generated configs send
  `X-Forwarded-Proto`), or to `false` for a deployment that is deliberately plain HTTP. Details and
  every default: `packages/backend/AUTH.md`, "Cookies, CSRF and proxies in production".

nginx's generated config is plain HTTP only (`listen 80`) — there's no way to issue a real TLS
certificate without a real, DNS-resolving domain. The next step on a real VPS is
`certbot --nginx -d <domain>`, which rewrites the block in place to add HTTPS. Caddy needs no
such step — automatic HTTPS via ACME is its default behavior for any domain it can prove
ownership of.

For keeping `devora start` running/restarting: `deploy/devora.service` is a systemd unit
template (`Restart=on-failure`, secrets from an `EnvironmentFile=`), with a `pm2` one-liner
alternative in its own comments.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on every push/PR: installs under all three package managers
(pnpm/npm/yarn), then — on the pnpm leg — runs the real test suite and a real `devora build` for
every app under all three targets (plain, `--adapter=vercel`, `--adapter=netlify`). This is the
same build sequence that would catch a broken deploy before it reaches a live environment, not
after.

## `devora deploy` — CLI-orchestrated deploys

Both flows above deploy via each platform's own git integration (a push triggers a build). There's
also a CLI-native path: `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]`, which
rebuilds an app and shells out to the real platform CLI (`vercel deploy --prebuilt` /
`netlify deploy`) via `npx`, once you've run `vercel link`/`netlify link` in that app's directory.
An app that isn't linked is skipped with a clear instruction rather than failing the whole run.

Confirmed with a real, authenticated deploy on both platforms at the time — not just
link-detection and error-message correctness. That was before Vercel discontinued `nodejs20.x`,
which the adapter then hardcoded; the runtime fix above hasn't been re-deployed live yet. Two real bugs were found and fixed getting a genuinely clean run,
both the same class as ROADMAP.md #4's `react`/`react-dom` and `NODE_ENV` bugs — something that
only surfaces on an actual platform, never in local simulation:
- `devora deploy` didn't set `NODE_ENV=production` itself (only `devora build` did) — the same
  `jsxDEV is not a function` crash from #4, in the one code path that had missed the fix.
- The Netlify function ran without crashing but returned "Not found" for every route — Netlify's
  own function packager only zips up what it can trace from static imports; `routes/` and
  `dist/server/` are read at runtime via `fs.readdirSync`/dynamic `import()`, invisible to that
  tracer. Fixed via `netlify.toml`'s `[functions.ssr] included_files` — Netlify's documented
  escape hatch for exactly this.

Domain auto-binding (`vercel domains add` using the domain already in `devora.config.ts`) isn't
built at all yet — a separate, smaller follow-up.

If you try it and something's wrong, that's the most likely place — please open an issue.
