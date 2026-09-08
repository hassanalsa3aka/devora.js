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
| `devora dev [--app=<name>]` | Run all apps in dev mode, or just one. |
| `devora build [--app=<name>] [--adapter=vercel\|netlify]` | Build all apps or one; add `--adapter` to also produce that platform's deploy output. |
| `devora start [--app=<name>]` | Serve a production build (adapter-node) — run `devora build` first. |
| `devora deploy --adapter=vercel\|netlify [--app=<name>] [--prod]` | Build and deploy to a linked Vercel project or Netlify site. |
| `devora new <name>` / `devora add <name>` | Scaffold a new app into the current project. |
| `devora remove <name>` | Delete an app and its `devora.config.ts` entry. |
| `devora list` | List every app registered in `devora.config.ts`. |
| `devora generate:proxy --target=nginx\|caddy` | Generate a reverse-proxy config from your apps' domains, for self-hosting. |

## Full documentation

For the full command reference, deployment guides (Vercel, Netlify, Docker, a bare VPS), and the
underlying architecture, see the main repo:
**[github.com/hassanalsa3aka/devora.js](https://github.com/hassanalsa3aka/devora.js)**.
