/**
 * Round 3 phase 3 — page routes: request access (ctx.url/headers/ip/method/
 * request), action results (actionData, fail(), 303/302 redirects), real
 * error statuses + the app's error page, the head API and opt-in theme,
 * and multipart form bodies.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createRenderRoute, createRenderStatic } from "../renderRoute.js";
import { fail, redirect } from "../actionResult.js";
import { HttpError } from "../httpError.js";
import { PageShell } from "../branding.js";
import { renderCsrShell } from "../csrRoute.js";
import { parseFormBody, MalformedBodyError } from "../readBody.js";
import { describeRequest, clientIp } from "../trustProxy.js";
import { createMemorySessionStore } from "../sessionStore.js";
import { THEME_CSS } from "../theme.js";
import type { ErrorPageModule, RouteModule } from "../route.js";
import type { RequestContext } from "../serverFn.js";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

const renderRoute = createRenderRoute({ createElement, renderToString });
const renderStatic = createRenderStatic({ createElement, renderToString });
const meta = { url: "https://app.example.com/search?q=shoes&next=%2Fcart", method: "GET", headers: { "accept-language": "ar" }, ip: "203.0.113.9" };

describe("ctx: request access in loaders and actions", () => {
  it("exposes url (with query), headers, method, ip and a standard Request", async () => {
    let seen: Record<string, unknown> = {};
    const route: RouteModule = {
      loader: (ctx: RequestContext) => {
        seen = {
          q: ctx.url.searchParams.get("q"),
          next: ctx.url.searchParams.get("next"),
          lang: ctx.headers.get("accept-language"),
          method: ctx.method,
          ip: ctx.ip,
          requestUrl: ctx.request.url,
          isRequest: ctx.request instanceof Request,
        };
        return {};
      },
      default: () => createElement("p", null, "ok"),
    };
    await renderRoute(route, { method: "GET", meta });
    expect(seen).toEqual({
      q: "shoes",
      next: "/cart",
      lang: "ar",
      method: "GET",
      ip: "203.0.113.9",
      requestUrl: meta.url,
      isRequest: true,
    });
  });

  it("an older caller without request metadata still works (localhost GET, no headers)", async () => {
    let url = "";
    await renderRoute({ loader: (ctx) => ((url = ctx.url.href), {}), default: () => createElement("p") }, { method: "GET" });
    expect(url).toBe("http://localhost/");
  });

  it("describeRequest/clientIp: scheme, host and IP follow trustProxy", () => {
    const req = {
      url: "/x?y=1",
      method: "GET",
      headers: { host: "internal:4173", "x-forwarded-proto": "https", "x-forwarded-host": "app.example.com", "x-forwarded-for": "6.6.6.6, 203.0.113.9" },
      socket: { remoteAddress: "::ffff:10.0.0.2" },
    };
    expect(describeRequest(req, false)).toMatchObject({ url: "http://internal:4173/x?y=1", ip: "10.0.0.2" });
    // One trusted hop: the proxy appended 203.0.113.9; "6.6.6.6" was client-supplied.
    expect(describeRequest(req, true)).toMatchObject({ url: "https://app.example.com/x?y=1", ip: "203.0.113.9" });
    expect(clientIp(req, 2)).toBe("6.6.6.6");
    expect(clientIp({ headers: {}, socket: {} }, true)).toBeUndefined();
  });
});

describe("action results", () => {
  const form = () => {
    const f = new FormData();
    f.set("code", "000");
    return f;
  };

  it("returned data reaches the render as actionData; fail() sets the status", async () => {
    const route: RouteModule = {
      action: (formData) => (formData.get("code") === "123" ? { ok: true } : fail(400, { error: "Wrong code" })),
      default: ({ actionData }) => createElement("p", null, JSON.stringify(actionData ?? null)),
    };
    const failed = await renderRoute(route, { method: "POST", formData: form() });
    expect(failed?.status).toBe(400);
    expect(failed?.html).toContain("{&quot;error&quot;:&quot;Wrong code&quot;}");
    const ok = new FormData();
    ok.set("code", "123");
    const passed = await renderRoute(route, { method: "POST", formData: ok });
    expect(passed?.status).toBe(200);
    expect(passed?.html).toContain("{&quot;ok&quot;:true}");
  });

  it("redirects: 303 after POST, 302 from a loader, thrown or returned, explicit status kept", async () => {
    const post = await renderRoute({ action: () => redirect("/done"), default: () => null }, { method: "POST", formData: form() });
    expect(post).toMatchObject({ status: 303, redirectTo: "/done" });
    const loaderReturn = await renderRoute({ loader: () => redirect("/login"), default: () => null }, { method: "GET" });
    expect(loaderReturn).toMatchObject({ status: 302, redirectTo: "/login" });
    const loaderThrow = await renderRoute(
      {
        loader: () => {
          throw redirect("/moved", 308);
        },
        default: () => null,
      },
      { method: "GET" }
    );
    expect(loaderThrow).toMatchObject({ status: 308, redirectTo: "/moved" });
    expect(() => redirect("/x", 200 as 301)).toThrow(/301, 302, 303, 307 or 308/);
    expect(() => fail(302, {})).toThrow(/4xx\/5xx/);
  });
});

describe("errors keep their status and render the error page", () => {
  const sessions = () => ({ name: "devora_session", secret: "s", store: createMemorySessionStore() });

  it("requireAuth → 401, verifyCsrf → 403, HttpError(404) → 404, with the built-in page", async () => {
    process.env.NODE_ENV = "production";
    const auth = await renderRoute(
      { loader: (ctx) => (ctx.requireAuth(), {}), default: () => null },
      { method: "GET", sessionCookieOptions: sessions() }
    );
    expect(auth?.status).toBe(401);
    expect(auth?.html).toContain("<h1>401</h1><p>Authentication required</p>");

    const csrf = await renderRoute(
      { action: (fd, ctx) => ctx.verifyCsrf(fd), default: () => null },
      { method: "POST", formData: new FormData(), sessionCookieOptions: sessions() }
    );
    expect(csrf?.status).toBe(403);
    // The CSRF cookie decided for this request still goes out with the error.
    expect(csrf?.setCookie?.some((c) => c.startsWith("devora_csrf="))).toBe(true);

    const missing = await renderRoute(
      {
        loader: () => {
          throw new HttpError(404, "No such order");
        },
        default: () => null,
      },
      { method: "GET" }
    );
    expect(missing).toMatchObject({ status: 404 });
    expect(missing?.html).toContain("No such order");
  });

  it("an unexpected error is a 500 whose message is hidden in production, shown (with stack) in dev", async () => {
    const boom: RouteModule = {
      loader: () => {
        throw new Error("SELECT secret FROM internals");
      },
      default: () => null,
    };
    process.env.NODE_ENV = "production";
    const prod = await renderRoute(boom, { method: "GET" });
    expect(prod?.status).toBe(500);
    expect(prod?.html).toContain("Internal Server Error");
    expect(prod?.html).not.toContain("SELECT secret");
    expect(prod?.error).toBeInstanceOf(Error);
    process.env.NODE_ENV = "development";
    const dev = await renderRoute(boom, { method: "GET" });
    expect(dev?.html).toContain("SELECT secret FROM internals");
    expect(dev?.html).toContain("<pre>");
  });

  it("uses the app's error page, with its meta, and falls back if the error page itself throws", async () => {
    const errorPage: ErrorPageModule = {
      default: ({ status, message }) => createElement("section", { className: "my-error" }, `${status}: ${message}`),
      meta: ({ status }) => ({ title: `Oops ${status}` }),
    };
    const result = await renderRoute(
      {
        loader: () => {
          throw new HttpError(418, "teapot");
        },
        default: () => null,
      },
      { method: "GET", errorPage, errorPageStyles: ["/assets/error.css"] }
    );
    expect(result?.status).toBe(418);
    expect(result?.html).toContain('<section class="my-error">418: teapot</section>');
    expect(result?.html).toContain("<title>Oops 418</title>");
    expect(result?.html).toContain('<link rel="stylesheet" href="/assets/error.css" />');

    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: ErrorPageModule = {
      default: () => {
        throw new Error("error page bug");
      },
    };
    const fallback = await renderRoute(
      {
        loader: () => {
          throw new HttpError(404, "gone");
        },
        default: () => null,
      },
      { method: "GET", errorPage: broken }
    );
    expect(fallback?.html).toContain("<h1>404</h1>");
  });

  it("renderError renders a standalone 404", () => {
    const { status, html } = renderRoute.renderError({ status: 404 });
    expect(status).toBe(404);
    expect(html).toContain("<h1>404</h1><p>Not found</p>");
  });
});

describe("head API and opt-in theme", () => {
  const plain: RouteModule = { default: () => createElement("p", null, "plain") };
  const shelled: RouteModule = { default: () => createElement(PageShell, { children: createElement("p", null, "in shell") }) };

  it("a page that doesn't use PageShell gets no framework CSS or favicon", async () => {
    const result = await renderRoute(plain, { method: "GET" });
    expect(result?.html).not.toContain("display: flex");
    expect(result?.html).not.toContain('rel="icon"');
  });

  it("a page rendering PageShell gets the theme and default favicon", async () => {
    const result = await renderRoute(shelled, { method: "GET" });
    expect(result?.html).toContain(THEME_CSS);
    expect(result?.html).toContain('<link rel="icon" href="/icons/devorajs-logo-withoutbg.png" />');
  });

  it("theme: false / true override detection; an app icon replaces the default", async () => {
    expect((await renderRoute(shelled, { method: "GET", head: { theme: false } }))?.html).not.toContain(THEME_CSS);
    expect((await renderRoute(plain, { method: "GET", head: { theme: true } }))?.html).toContain(THEME_CSS);
    const icon = await renderRoute(shelled, { method: "GET", head: { links: [{ rel: "icon", href: "/me.png" }] } });
    expect(icon?.html).toContain('<link rel="icon" href="/me.png" />');
    expect(icon?.html).not.toContain('<link rel="icon" href="/icons/devorajs-logo');
  });

  it("app head, route CSS, then route meta().head — escaped, with lang", async () => {
    const route: RouteModule = {
      meta: () => ({ title: "T", head: { links: [{ rel: "canonical", href: "https://x.test/a?b=1&c=2" }], meta: [{ name: "robots", content: "noindex" }] } }),
      default: () => createElement("p"),
    };
    const html = (
      await renderRoute(route, {
        method: "GET",
        styles: ["/assets/page-1.css"],
        head: {
          lang: "ar",
          stylesheets: ["https://fonts.example/css?family=Inter"],
          links: [{ rel: "manifest", href: "/manifest.webmanifest" }],
          meta: [{ name: "theme-color", content: "#000" }],
          scripts: [{ src: "/analytics.js", defer: true }],
        },
      })
    )!.html;
    expect(html).toContain('<html lang="ar">');
    expect(html).toContain('<link rel="stylesheet" href="/assets/page-1.css" />');
    expect(html).toContain('<link rel="stylesheet" href="https://fonts.example/css?family=Inter" />');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<meta name="theme-color" content="#000" />');
    expect(html).toContain('<script type="module" src="/analytics.js" defer></script>');
    expect(html).toContain('<link rel="canonical" href="https://x.test/a?b=1&amp;c=2" />');
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html.indexOf("/manifest.webmanifest")).toBeLessThan(html.indexOf("canonical"));
  });

  it("static renders get head + styles + the page URL; csr shells keep the theme by default", async () => {
    let url = "";
    const { html } = await renderStatic(
      { loader: (ctx) => ((url = ctx.url.href), {}), default: () => createElement("p") },
      { url: "https://example.com/about", styles: ["/assets/about.css"], head: { lang: "en" } }
    );
    expect(url).toBe("https://example.com/about");
    expect(html).toContain('<link rel="stylesheet" href="/assets/about.css" />');
    expect(renderCsrShell({ default: () => null }, "/e.js", "/c.js")).toContain(THEME_CSS);
    expect(renderCsrShell({ default: () => null }, "/e.js", "/c.js", undefined, { appHead: { theme: false } })).not.toContain(THEME_CSS);
  });
});

describe("parseFormBody", () => {
  it("multipart/form-data: files arrive as File objects", async () => {
    const source = new FormData();
    source.set("title", "hello");
    source.set("file", new File(["file contents"], "notes.txt", { type: "text/plain" }));
    const request = new Request("http://x", { method: "POST", body: source });
    const body = Buffer.from(await request.arrayBuffer());
    const parsed = await parseFormBody(body, request.headers.get("content-type")!);
    expect(parsed.get("title")).toBe("hello");
    const file = parsed.get("file") as File;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("notes.txt");
    expect(await file.text()).toBe("file contents");
  });

  it("URL-encoded still works; a malformed multipart body is a MalformedBodyError", async () => {
    expect((await parseFormBody(Buffer.from("a=1&b=two"), "application/x-www-form-urlencoded")).get("b")).toBe("two");
    await expect(parseFormBody(Buffer.from("garbage"), "multipart/form-data; boundary=xyz")).rejects.toBeInstanceOf(MalformedBodyError);
  });
});
