import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "@devorajs/core";

/**
 * Framework SSR entry point for this app (see ROADMAP.md #1). Loaded via
 * vite.ssrLoadModule so react-dom/server resolves against this app's own
 * node_modules — the same pattern Vite's own SSR guide uses. The actual
 * render logic lives once in @devorajs/core's renderRoute.ts, shared by all
 * three apps (previously a byte-for-byte identical copy in each) — this
 * file only supplies the per-app React bindings that genuinely can't be
 * shared.
 */
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
