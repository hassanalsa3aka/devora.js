import { defineProject } from "@devorajs/core/config";

export default defineProject({
  apps: [
    { name: "blog", dir: "apps/blog", domain: "blog.example.com", auth: "none" },
  ],
  shared: {
    core: "packages/core",
    auth: "shared",
    // Where login sessions are stored server-side. Unset, `devora dev` uses
    // an in-memory store (with a warning) and a production server refuses to
    // start. Set it to a module path whose default export is a SessionStore
    // backed by your database (defineSessionStore from @devorajs/core), or to
    // "memory" for a single long-lived `devora start` process (not serverless).
    // sessions: { store: "sessionStore.ts" },
    // Cookie settings (production only; defaults shown), see
    // https://github.com/hassanalsa3aka/devora.js/blob/main/packages/backend/AUTH.md
    // domain: "example.com" shares one login across subdomains.
    // sessions: { cookie: { secure: true, sameSite: "lax" } },
  },
});
