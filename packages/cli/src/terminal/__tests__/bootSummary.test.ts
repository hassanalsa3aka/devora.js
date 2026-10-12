import { describe, it, expect } from "vitest";
import { createPaint, stripAnsi } from "@devorajs/scaffold";
import { formatBootSummary, API_ROUTE_LIST_LIMIT, type BootSummaryApp } from "../bootSummary.js";
import { formatDuration, plural } from "../output.js";

const noColor = createPaint(0);

function app(name: string, apiCount: number, pages = ["/", "/login"]): BootSummaryApp {
  const apis = Array.from({ length: apiCount }, (_, i) => `/api/r${i + 1}`);
  return {
    name,
    authMode: "shared",
    domain: `${name}.example.com`,
    localUrl: `http://localhost:1000${name.length}/`,
    networkUrls: [],
    networkNote: "use --host to expose",
    apiUrl: apiCount > 0 ? `http://localhost:1000${name.length}/api` : undefined,
    pages,
    apis,
    apiDir: "endpoints",
  };
}

describe("formatBootSummary", () => {
  it("prints every app's URLs first, then the routes grouped per app", () => {
    const out = formatBootSummary([app("web", 2), app("api", 1, [])], { paint: noColor, expandRoutes: false, quiet: false });
    const lastUrl = out.lastIndexOf("Local:");
    const routes = out.indexOf("Routes");
    expect(lastUrl).toBeGreaterThan(-1);
    expect(routes).toBeGreaterThan(lastUrl);
    expect(out.indexOf("    web\n", routes)).toBeLessThan(out.indexOf("    api\n", routes));
    expect(out).toContain("      page  /login");
    expect(out).toContain("      api   /api/r1");
    expect(out).toContain("    Network:  use --host to expose");
  });

  it(`lists up to ${API_ROUTE_LIST_LIMIT} API routes, counts above that, and always lists pages`, () => {
    const out = formatBootSummary([app("small", API_ROUTE_LIST_LIMIT), app("big", API_ROUTE_LIST_LIMIT + 1)], {
      paint: noColor,
      expandRoutes: false,
      quiet: false,
    });
    expect(out).toContain(`/api/r${API_ROUTE_LIST_LIMIT}`);
    expect(out).toContain(`      api   ${API_ROUTE_LIST_LIMIT + 1} routes under /api`);
    expect(out).not.toContain(`/api/r${API_ROUTE_LIST_LIMIT + 1}`);
    expect(out).toContain("devora dev --routes (or DEVORA_ROUTES=all)");
    expect(out.match(/page {2}\/login/g)).toHaveLength(2);
  });

  it("--routes / DEVORA_ROUTES=all lists everything, with no hint", () => {
    const out = formatBootSummary([app("big", 25)], { paint: noColor, expandRoutes: true, quiet: false });
    expect(out).toContain("/api/r25");
    expect(out).not.toContain("--routes");
  });

  it("an app with no routes says where to add one", () => {
    const out = formatBootSummary([app("empty", 0, [])], { paint: noColor, expandRoutes: false, quiet: false });
    expect(out).toContain("(none yet — add a file under routes/ or endpoints/)");
  });

  it("--quiet: one line per app, no route tables; the LAN warning still prints", () => {
    const out = formatBootSummary([app("web", 3), app("admin", 0)], {
      paint: noColor,
      expandRoutes: false,
      quiet: true,
      exposedUrl: "http://192.168.1.5:10000",
    });
    expect(out).toBe(
      "  web    http://localhost:10003/\n" +
        "  admin  http://localhost:10005/\n" +
        "\n" +
        "  ⚠ Dev server is reachable on your local network at http://192.168.1.5:10000 — anyone on this network can access it.\n"
    );
  });

  it("color on only adds escape codes — the text is identical", () => {
    const apps = [app("web", 12)];
    const plain = formatBootSummary(apps, { paint: noColor, expandRoutes: false, quiet: false });
    const colored = formatBootSummary(apps, { paint: createPaint(3), expandRoutes: false, quiet: false });
    expect(colored).toContain("\x1b[");
    expect(plain).not.toContain("\x1b");
    expect(stripAnsi(colored)).toBe(plain);
  });
});

describe("output helpers", () => {
  it("formats durations and counts", () => {
    expect(formatDuration(812.4)).toBe("812 ms");
    expect(formatDuration(4210)).toBe("4.2 s");
    expect(plural(1, "app")).toBe("1 app");
    expect(plural(3, "app")).toBe("3 apps");
  });
});
