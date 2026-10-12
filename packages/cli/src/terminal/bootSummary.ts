import type { Paint } from "@devorajs/scaffold";

/** One booted dev app, as the summary prints it. */
export interface BootSummaryApp {
  name: string;
  authMode: string;
  domain?: string;
  localUrl: string;
  networkUrls: string[];
  /** Shown when there are no network URLs: "use --host to expose". */
  networkNote?: string;
  /** Base URL of the app's API routes, when it has any. */
  apiUrl?: string;
  /** Page route paths ("/", "/login"). */
  pages: string[];
  /** API route paths, already prefixed ("/api/health"). */
  apis: string[];
  /** The app's API folder, for the "no routes yet" hint ("endpoints"). */
  apiDir: string;
}

export interface BootSummaryOptions {
  paint: Paint;
  /** --routes / DEVORA_ROUTES=all: list every API route, however many. */
  expandRoutes: boolean;
  /** --quiet: one line per app, no route tables. */
  quiet: boolean;
  /** The first network URL of a dev server reachable from the LAN, if any. */
  exposedUrl?: string;
}

/** Apps with more API routes than this show a count instead of the list. */
export const API_ROUTE_LIST_LIMIT = 10;

/**
 * `devora dev`'s boot output: every app's URLs together first, then the
 * route tables grouped per app. Pages are always listed; an app's API
 * routes are listed when there are at most API_ROUTE_LIST_LIMIT of them,
 * otherwise counted (--routes or DEVORA_ROUTES=all lists them all).
 */
export function formatBootSummary(apps: BootSummaryApp[], opts: BootSummaryOptions): string {
  const { paint } = opts;
  const lines: string[] = [];
  const nameWidth = Math.max(...apps.map((a) => a.name.length));

  if (opts.quiet) {
    for (const app of apps) lines.push(`  ${app.name.padEnd(nameWidth)}  ${paint.blue(app.localUrl)}`);
  } else {
    for (const app of apps) {
      const facts = [`auth: ${app.authMode}`, ...(app.domain ? [app.domain] : [])].join(" · ");
      lines.push(`  ${paint.bold(app.name)}  ${paint.dim(facts)}`);
      lines.push(`    ${label("Local")}${paint.blue(app.localUrl)}`);
      for (const url of app.networkUrls) lines.push(`    ${label("Network")}${paint.blue(url)}`);
      if (app.networkUrls.length === 0) lines.push(`    ${label("Network")}${paint.dim(app.networkNote ?? "use --host to expose")}`);
      if (app.apiUrl) lines.push(`    ${label("API")}${paint.blue(app.apiUrl)}`);
      lines.push("");
    }

    lines.push(`  ${paint.bold("Routes")}`);
    let hidden = false;
    for (const app of apps) {
      lines.push(`    ${app.name}`);
      if (app.pages.length === 0 && app.apis.length === 0) {
        lines.push(`      ${paint.dim(`(none yet — add a file under routes/ or ${app.apiDir}/)`)}`);
        continue;
      }
      for (const route of app.pages) lines.push(`      ${paint.dim("page")}  ${route}`);
      if (app.apis.length > API_ROUTE_LIST_LIMIT && !opts.expandRoutes) {
        hidden = true;
        lines.push(`      ${paint.dim("api")}   ${app.apis.length} routes under /api`);
      } else {
        for (const route of app.apis) lines.push(`      ${paint.dim("api")}   ${route}`);
      }
    }
    if (hidden) lines.push(`    ${paint.dim("list every API route: devora dev --routes (or DEVORA_ROUTES=all)")}`);
  }

  if (opts.exposedUrl) {
    lines.push("");
    lines.push(
      `  ${paint.yellow("⚠")} Dev server is reachable on your local network at ${opts.exposedUrl} — anyone on this network can access it.`
    );
  }
  return lines.join("\n") + "\n";

  function label(text: string): string {
    return paint.dim(`${text}:`.padEnd(10));
  }
}
