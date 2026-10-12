<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# @devorajs/adapter-node

Serves a [devora.js](https://github.com/hassanalsa3aka/devora.js) app's production build
(`dist/server` from `devora build`) from a plain Node HTTP server, with the same routing,
sessions and security headers as `devora dev`. It's what `devora start` runs, so inside a
devora.js project you don't need to install it yourself. Use it directly when you want your own
entry point, for example a custom process manager or Docker `CMD`.

## Export

`createNodeServer(options): http.Server` starts listening on `options.port` (and `options.host`,
default every interface) and returns the server.

| Option | Meaning |
|---|---|
| `appRoot` | The app folder that contains `dist/server` |
| `appName`, `domain` | The app's name and domain from `devora.config.ts` |
| `authMode` | `"shared"`, `"isolated"` or `"none"` |
| `security`, `sitemapEnabled`, `defaultRenderMode`, `apiDir`, `trustProxy`, `head`, `maxBodyBytes`, `cors` | The matching `app.config.ts` settings (all optional except `security` and `sitemapEnabled`) |
| `port`, `host` | Where to listen |

## Example

```ts
// server.mjs — run after `devora build`, with NODE_ENV=production and your session secret set
import { createNodeServer } from "@devorajs/adapter-node";

createNodeServer({
  appRoot: new URL("./apps/web", import.meta.url).pathname,
  appName: "web",
  domain: "web.example.com",
  authMode: "shared",
  security: undefined,
  sitemapEnabled: false,
  trustProxy: true, // behind nginx/Caddy (see `devora generate:proxy`)
  port: Number(process.env.PORT ?? 4173),
});
```

Production sessions need `shared.sessions.store` in `devora.config.ts` and
`DEVORA_SESSION_SECRET`; see the
[Deploying](https://github.com/hassanalsa3aka/devora.js/blob/main/DEPLOYING.md) guide.
