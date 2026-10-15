import { hydrateIslands } from "@devorajs/core/client";

// Only requested when a page actually used an island() — see
// packages/core/src/islandComponent.tsx. Real hydration logic lives
// once in @devorajs/core (shared by every app, including MutationObserver
// support for an island that streams in after this script runs) — this
// file only calls it.
hydrateIslands();
