<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# @devorajs/cli

The `devora` command for [devora.js](https://github.com/hassanalsa3aka/devora.js) projects — dev
server, production builds, deploy adapters, and app scaffolding.

## You probably don't need to install this yourself

Projects created via `create-devora` already include this as a dependency, and its `devora` bin
is available the moment you `npm install`. Install it directly only if you're doing something
unusual (e.g. scripting against a project without going through `create-devora` first).

## Commands

| Command | What it does |
|---|---|
| `devora dev [--app=<name>] [--host] [--routes] [--quiet]` | Run all apps in dev mode, or just one. Ports start at 10000 in `devora.config.ts` order (or each app's `devPort`), moving to the next free port if taken; on boot prints every app's URLs, then the routes per app — all pages, and each app's API routes when it has 10 or fewer (a count above that; `--routes` or `DEVORA_ROUTES=all` lists them all). `--host` (off by default) listens on all interfaces and prints LAN URLs for testing from a phone — with a warning, since anyone on that network can then reach it. |
| `devora build [--app=<name>] [--adapter=vercel\|netlify] [--out=<dir>] [--quiet]` | Build all apps or one; add `--adapter` to also produce that platform's deploy output. Runs the app's `prebuild` commands first. With `--adapter`, preflight checks run before building: session secret and store (both), runtime and a top-level `api/` folder (Vercel), `apiDir` in `included_files` (Netlify). `--out` (with `--adapter=vercel --app=<name>`) writes the Build Output directory elsewhere, e.g. `--out=.vercel/output` for a Vercel project rooted at the repo. Always builds with `NODE_ENV=production`. |
| `devora start [--app=<name>] [--port=<n>] [--host=<host>] [--quiet]` | Serve a production build (adapter-node) — run `devora build` first. Port: `--port`, else `PORT`, else 4173 (each further app gets the next port); host: `--host`, else `HOST`, else every interface. |
| `devora deploy --adapter=vercel\|netlify [--app=<name>] [--prod]` | Build and deploy to a linked Vercel project or Netlify site. |
| `devora new <name>` / `devora add <name> [--auth=shared\|isolated\|none] [--kind=pages\|api] [--domain=<d>]` | Scaffold a new app into the current project (its API routes go in `endpoints/`). `--kind=pages\|api` picks a pages app or a backend-only API app; without it, a project whose apps are all backend-only gets an API app. |
| `devora remove <name>` | Delete an app and its `devora.config.ts` entry. |
| `devora list` | List every app registered in `devora.config.ts`. |
| `devora generate:proxy --target=nginx\|caddy` | Generate a reverse-proxy config from your apps' domains, for self-hosting. |
| `devora split <app-name\|backend> --repo=<url>` | Convert an app (or the shared backend) into a real git submodule pointing at an empty remote you created first — preserves its full commit history. |
| `devora sync [names...] --from-main\|--to-main` | Pull or push a split-off app/backend against its own remote; `--all` targets every split-off piece. |
| `devora status` | One view across every split-off app/backend: up to date, unpushed, unpulled, or diverged. |

All of `dev`, `build`, `start` and `deploy` load the project root's `.env` files first (Vite's
precedence; variables already set in the environment win).

## Terminal output

`dev`, `build` and `start` open with a small `d›` mark, the CLI version and (for `dev`) how long
startup took. `--quiet` drops the header, route tables and progress lines (Vite logs at `warn`);
warnings, errors and each app's URL still print.

- Color: on for a terminal, off when piped. `NO_COLOR=1` turns it off; `FORCE_COLOR` (`0` off,
  `1`/`2`/`3` for 16/256/truecolor) overrides both. Depth follows `COLORTERM`/`TERM`.
- The block mark only shows on an interactive terminal at least 43 columns wide. Piped output,
  CI (`CI` set) and narrow terminals get one plain line. Nothing animates.

## Full documentation

For the full command reference, deployment guides (Vercel, Netlify, Docker, a bare VPS), and the
underlying architecture, see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
