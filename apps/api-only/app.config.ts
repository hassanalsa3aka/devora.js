import { defineApp } from "@devorajs/core/config";

// Backend-only app mode (architecture-v2.md §3.4) — pure API, no pages, no
// client build. Real proof this works end to end: this app has no routes/
// directory and no entry-server.tsx at all.
export default defineApp({
  backendOnly: true,
});
