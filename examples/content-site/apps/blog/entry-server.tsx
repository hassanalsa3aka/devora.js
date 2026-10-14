import { createElement } from "react";
import { renderToString, renderToPipeableStream } from "react-dom/server";
import { createRenderRoute, createRenderStatic, createRenderStreaming } from "@devorajs/core";

// Framework SSR entry point for this app — loaded via vite.ssrLoadModule
// so react-dom/server resolves against this app's own node_modules. The
// actual render logic lives once in @devorajs/core's renderRoute.ts,
// shared by every app; this file only supplies the React bindings that
// genuinely can't be shared.
export const renderRoute = createRenderRoute({ createElement, renderToString });
export const renderStatic = createRenderStatic({ createElement, renderToString });
export const renderStreaming = createRenderStreaming({ createElement, renderToPipeableStream });
