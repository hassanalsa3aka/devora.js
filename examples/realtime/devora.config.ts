import { defineProject } from "@devorajs/core/config";

export default defineProject({
  apps: [{ name: "app", dir: "apps/app", domain: "app.example.com", auth: "shared" }],
  shared: {
    core: "packages/core",
    backend: "packages/backend",
    auth: "shared",
    // "memory" works for one long-lived `devora start` process only.
    // Use a database-backed store before deploying (see the README).
    sessions: { store: "memory" },
  },
});
