import { defineProject } from "@devorajs/core/config";

export default defineProject({
  apps: [
    // none: no login anywhere on this site — opts out of the whole
    // session/cookie/CSRF carrier, so it needs zero DEVORA_SESSION_SECRET*.
    { name: "marketing", dir: "apps/marketing", domain: "example.com", auth: "none" },
    { name: "dashboard", dir: "apps/dashboard", domain: "app.example.com" },
    // isolated: this app opts out of shared auth, gets its own session context
    { name: "admin", dir: "apps/admin", domain: "admin.example.com", auth: "isolated" },
    // backendOnly (app.config.ts) — pure API, no pages, no client build at
    // all (architecture-v2.md §3.4).
    { name: "api-only", dir: "apps/api-only", domain: "api.example.com", auth: "none" },
  ],
  shared: {
    core: "packages/core",
    backend: "packages/backend",
    // project-level default — apps share one auth/session context
    // unless a given app overrides it with auth: "isolated"
    auth: "shared",
    // Where server-side session records live (packages/core/src/session.ts).
    // "memory" is an explicit choice here because this demo repo has no real
    // database (packages/backend/db is a stub) — fine for `devora dev` and a
    // single `devora start` process, NOT for serverless: point this at a
    // module default-exporting a DB-backed SessionStore before deploying to
    // Vercel/Netlify (see packages/backend/AUTH.md).
    sessions: { store: "memory" },
  },
});
