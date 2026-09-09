# Deploying

Devora.js is a **multi-app** project — a repo can declare several apps (`devora.config.ts`), and
each one deploys as its own independent unit. This is inherent to how Vercel/Netlify project
structure works, not a devora-specific convention: a multi-app project means multiple platform
projects, each rooted at its own `apps/<name>` directory.

Four targets are supported: Vercel, Netlify, Docker, and self-hosting on a plain VPS
(`adapter-node` + nginx/Caddy).

## Vercel

1. In the Vercel dashboard: **Add New → Project**, import this repo, set **Root Directory** to
   `apps/<name>`. Repeat as a separate project per app.
2. Nothing else to configure — `apps/<name>/vercel.json` is already committed and handles it:
   `"framework": null` disables Vercel's zero-config Vite detection (which would otherwise run a
   plain `vite build` and fail), and `"buildCommand"` runs `devora build --adapter=vercel` for
   that app.
3. **Environment variables** (Project Settings → Environment Variables → Production) — only
   needed if the app's `auth` mode in `devora.config.ts` is `"shared"` or `"isolated"`:
   - `auth: "shared"` → `DEVORA_SESSION_SECRET` (`openssl rand -base64 32`)
   - `auth: "isolated"` → `DEVORA_SESSION_SECRET_<APPNAME>` (uppercase app name)
   - An app with `auth: "none"` needs none of this.
   - Changing an env var doesn't apply to an already-built deployment — redeploy after saving it.
4. Deploy.

## Netlify

1. **Add new project → Import an existing project**, pick this repo, set **Base directory** to
   `apps/<name>`. Repeat per app.
2. `apps/<name>/netlify.toml` is already committed and sets the build command, publish directory,
   the SSR redirect, and the functions directory. **Netlify's dashboard Build settings take
   precedence over `netlify.toml` when both are set** — if the site was created by pointing
   Netlify at a `vite.config.ts` it auto-detected, it likely already has its own saved Build
   command/Publish directory, which silently overrides the committed file. Fix once, per site:
   **Site configuration → Build & deploy → Build settings**, and either clear those two fields
   entirely, or set them to match `netlify.toml`:
   - Build command: `cd ../.. && node packages/cli/dist/index.js build --app=<name> --adapter=netlify`
   - Publish directory: `dist/client`
3. **Environment variables** — same rules as Vercel above (Site configuration → Environment
   variables).
4. Deploy — use **Trigger deploy → Clear cache and deploy site** the first time after changing
   dashboard build settings.

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

## `devora deploy` — CLI-orchestrated deploys (built, not yet proven with a real account)

Both flows above deploy via each platform's own git integration (a push triggers a build). There's
also a CLI-native path: `devora deploy --adapter=vercel|netlify [--app=<name>] [--prod]`, which
rebuilds an app and shells out to the real platform CLI (`vercel deploy --prebuilt` /
`netlify deploy --dir=dist/client`) via `npx`, once you've run `vercel link`/`netlify link` in
that app's directory. An app that isn't linked is skipped with a clear instruction rather than
failing the whole run.

This command is real and has been confirmed to correctly detect linked/unlinked apps and to
genuinely invoke the real platform CLIs (which then fail predictably on missing credentials in
this environment) — but it has never completed an actual authenticated deploy, since that needs
a real Vercel/Netlify account and token this environment doesn't have. Domain auto-binding
(`vercel domains add` using the domain already in `devora.config.ts`) isn't built at all yet.

If you try it and something's wrong, that's the most likely place — please open an issue.
