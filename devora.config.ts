import { defineProject } from "@devorajs/core/config";

export default defineProject({
  apps: [
    // none: no login anywhere on this site — opts out of the whole
    // session/cookie/CSRF carrier, so it needs zero DEVORA_SESSION_SECRET*.
    { name: "marketing", dir: "apps/marketing", domain: "example.com", auth: "none" },
    { name: "dashboard", dir: "apps/dashboard", domain: "app.example.com" },
    // isolated: this app opts out of shared auth, gets its own session context
    { name: "admin", dir: "apps/admin", domain: "admin.example.com", auth: "isolated" },
  ],
  shared: {
    core: "packages/core",
    backend: "packages/backend",
    // project-level default — apps share one auth/session context
    // unless a given app overrides it with auth: "isolated"
    auth: "shared",
  },
});
