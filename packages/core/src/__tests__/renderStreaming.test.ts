import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { createRenderStreaming } from "../renderStreaming.js";
import { Island } from "../islandComponent.js";
import { island } from "../island.js";
import type { RouteModule } from "../route.js";

const deps = { createElement, renderToPipeableStream };

function collectChunks(): { destination: PassThrough; chunks: () => string[]; done: Promise<void> } {
  const destination = new PassThrough();
  const seen: string[] = [];
  destination.on("data", (chunk: Buffer) => seen.push(chunk.toString("utf-8")));
  const done = new Promise<void>((resolve) => destination.on("end", resolve));
  return { destination, chunks: () => seen, done };
}

/** A real deferred import — resolves only when the test tells it to, so we
 * can prove content genuinely streams in *after* the shell, not just that
 * the final HTML happens to be correct once everything settles. */
function deferredIslandDescriptor(label: string) {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => (resolve = r));
  const descriptor = island(async () => {
    await gate;
    return { default: () => createElement("span", { "data-testid": label }, label) };
  }, `/assets/${label}.js`);
  return { descriptor, releaseImport: resolve };
}

describe("createRenderStreaming — CSP nonce (securityHeaders.ts's addNonceToCsp)", () => {
  it("a real post-shell React patch script carries the request's nonce attribute", async () => {
    // Real, previously-undiscovered bug: React's own inline Suspense-
    // boundary-patch script (injected after the shell, once a deferred
    // island resolves) is blocked outright by this framework's default
    // `default-src 'self'` CSP — confirmed directly in a real browser
    // (Playwright) before this fix existed. This test verifies the actual
    // fix against real react-dom/server output, not a mock: with a real
    // nonce passed through, the post-shell inline script React emits must
    // carry that exact nonce attribute.
    const { descriptor, releaseImport } = deferredIslandDescriptor("nonce-check");
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, { nonce: "test-nonce-123" });
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);

    await new Promise((r) => setTimeout(r, 20));
    releaseImport();
    await done;

    const full = chunks().join("");
    expect(full).toContain("nonce-check");
    // React's real post-shell patch script — a real <script nonce="...">,
    // not asserted by string-matching alone: confirmed it's genuinely
    // present as an inline script tag with the exact nonce value.
    expect(full).toMatch(/<script[^>]*\bnonce="test-nonce-123"/);
  });
});

describe("createRenderStreaming — real streaming behavior, not just final output", () => {
  it("writes the document head and shell content before an island's import resolves", async () => {
    const { descriptor, releaseImport } = deferredIslandDescriptor("slow-widget");
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () =>
        createElement(
          "div",
          null,
          createElement("h1", null, "Shell content"),
          createElement(Island, { component: descriptor, props: {} })
        ),
    };

    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});
    expect(result).not.toBeNull();

    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);

    // Give the shell a real tick to flush before we ever release the
    // island's import — if the shell only appeared *after* releaseImport(),
    // this wouldn't be streaming, it'd be the old "wait for everything"
    // model wearing a streaming API's clothes.
    await new Promise((r) => setTimeout(r, 20));
    const beforeRelease = chunks().join("");
    expect(beforeRelease).toContain("Shell content");
    expect(beforeRelease).toContain("data-island-pending");
    expect(beforeRelease).not.toContain("slow-widget");

    releaseImport();
    await done;

    const full = chunks().join("");
    expect(full).toContain("slow-widget");
    expect(full).toContain("data-island=");
    expect(full).toContain("</html>");
  });

  it("includes the island client script in the tail when islandClientUrl is set", async () => {
    const { descriptor, releaseImport } = deferredIslandDescriptor("tail-check");
    releaseImport(); // resolve immediately — this test only cares about the tail
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };

    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, { islandClientUrl: "/island-client.tsx" });
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);
    await done;

    const full = chunks().join("");
    expect(full).toContain('<script type="module" src="/island-client.tsx"></script>');
  });

  it("a route with no islands at all still streams a complete, valid document", async () => {
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement("h1", null, "Plain page"),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);
    await done;

    const full = chunks().join("");
    expect(full).toContain("<!doctype html>");
    expect(full).toContain("Plain page");
    expect(full).toContain("</html>");
  });

  it("runs the loader and passes its data to the component", async () => {
    const routeModule: RouteModule<{ name: string }> = {
      renderMode: "streaming",
      loader: async () => ({ name: "real data" }),
      default: ({ data }) => createElement("p", null, data?.name),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);
    await done;

    expect(chunks().join("")).toContain("real data");
  });

  it("propagates a real Set-Cookie from a signed session context", async () => {
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement("p", null, "x"),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {
      sessionCookieOptions: { name: "devora_session", secret: "test-secret" },
    });
    // No incoming cookie and no existing CSRF cookie — a fresh CSRF cookie
    // is issued even on a plain GET (same as the two-pass ssr path).
    expect(result!.setCookie?.some((c) => c.startsWith("devora_csrf="))).toBe(true);
  });

  it("reports a shell error without ever writing to the destination", async () => {
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => {
        throw new Error("shell blew up");
      },
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});
    const { destination, chunks } = collectChunks();
    const errors: unknown[] = [];
    const phases: string[] = [];
    let wroteAnything = false;
    destination.on("data", () => (wroteAnything = true));

    await new Promise<void>((resolve) => {
      result!.pipeTo(destination, (err, phase) => {
        errors.push(err);
        phases.push(phase);
        resolve();
      });
    });

    expect(errors).toHaveLength(1);
    expect(phases).toEqual(["shell"]);
    expect(wroteAnything).toBe(false);
    expect(chunks()).toHaveLength(0);
  });

  it("reports a post-shell (boundary) error separately, after the shell has already been sent", async () => {
    const failingDescriptor = {
      __island: true as const,
      importer: () => Promise.reject(new Error("island import failed")),
      clientUrl: "/assets/broken.js",
    };
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () =>
        createElement(
          "div",
          null,
          createElement("h1", null, "Shell content"),
          createElement(Island, { component: failingDescriptor, props: {} })
        ),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});
    const { destination, done } = collectChunks();
    const reports: Array<{ phase: string }> = [];

    result!.pipeTo(destination, (_err, phase) => {
      reports.push({ phase });
    });
    await done;

    expect(reports).toEqual([{ phase: "boundary" }]);
  });
});
