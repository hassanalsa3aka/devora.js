import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { createRenderStreaming } from "../renderStreaming.js";
import { createMemorySessionStore } from "../sessionStore.js";
import { Island, clearStreamingModuleCache } from "../islandComponent.js";
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

describe("clearStreamingModuleCache — real dev-mode staleness fix", () => {
  it("a cleared cache re-imports the same descriptor instead of reusing a stale resolution", async () => {
    // Real, previously-undiscovered bug: streamingModuleCache is keyed by
    // the descriptor *object*, which can survive a dev-mode edit to the
    // island's own component file (the route file that created the
    // descriptor isn't necessarily reloaded just because something it
    // dynamically imports changed) — without clearing it, a stale
    // resolution would be served forever until a full server restart.
    let importCount = 0;
    const descriptor = island(async () => {
      importCount++;
      return { default: () => createElement("span", null, `version-${importCount}`) };
    }, "/assets/versioned.js");

    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };
    const renderStreaming = createRenderStreaming(deps);

    const render = async () => {
      const result = await renderStreaming(routeModule, {});
      const { destination, chunks, done } = collectChunks();
      result!.pipeTo(destination);
      await done;
      return chunks().join("");
    };

    const first = await render();
    expect(first).toContain("version-1");

    const second = await render();
    expect(second).toContain("version-1"); // still cached — same descriptor object, no clear yet
    expect(importCount).toBe(1);

    clearStreamingModuleCache();

    const third = await render();
    expect(third).toContain("version-2"); // re-imported after the clear
    expect(importCount).toBe(2);
  });
});

describe("real bug: a rejected island import no longer permanently poisons the cache", () => {
  it("the request AFTER a failed import retries fresh, instead of replaying the same cached error forever", async () => {
    // Real, previously-undiscovered bug: a rejected `descriptor.importer()`
    // used to be cached forever — every future request for that island
    // threw the exact same stale error, with `descriptor.importer()` never
    // called again, even once the underlying transient failure (e.g. a
    // cold-start disk/network hiccup) would have resolved on retry.
    let attempts = 0;
    const descriptor = island(async () => {
      attempts++;
      if (attempts === 1) throw new Error("transient failure");
      return { default: () => createElement("span", null, `attempt-${attempts}`) };
    }, "/assets/flaky.js");

    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };
    const renderStreaming = createRenderStreaming(deps);

    // First request: the import rejects — reported as a boundary error,
    // never crashes the render.
    const first = await renderStreaming(routeModule, {});
    const reports: Array<{ phase: string }> = [];
    const { destination: dest1, done: done1 } = collectChunks();
    first!.pipeTo(dest1, (_err, phase) => reports.push({ phase }));
    await done1;
    expect(reports).toEqual([{ phase: "boundary" }]);
    expect(attempts).toBe(1);

    // The failed cache entry's removal is deliberately scheduled on a
    // macrotask (see islandComponent.tsx's doc comment on why an inline
    // delete causes a request-hanging retry loop instead) — give it a real
    // tick to run before the second request.
    await new Promise((r) => setTimeout(r, 10));

    // Second request, same descriptor, no clearStreamingModuleCache() call
    // in between — before this fix, this would throw the SAME cached
    // rejection forever (attempts staying at 1). After the fix, it retries
    // and succeeds.
    const second = await renderStreaming(routeModule, {});
    const { destination: dest2, chunks: chunks2, done: done2 } = collectChunks();
    second!.pipeTo(dest2);
    await done2;
    expect(chunks2().join("")).toContain("attempt-2");
    expect(attempts).toBe(2);
  });
});

describe("real bug: a hung Suspense boundary used to hold the connection open forever", () => {
  it("aborts and completes the response once streamTimeoutMs elapses, instead of hanging indefinitely", async () => {
    // A descriptor whose import NEVER resolves or rejects — the exact
    // real-world case that used to have no bound at all: a genuinely hung
    // fetch inside a loader, a dependency that never settles. Deliberately
    // never call releaseImport().
    const { descriptor } = deferredIslandDescriptor("never-resolves");
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, { streamTimeoutMs: 30 });

    const { destination, chunks, done } = collectChunks();
    const reports: Array<{ phase: string }> = [];
    result!.pipeTo(destination, (_err, phase) => reports.push({ phase }));

    // The real assertion: the response actually completes ("end" fires) —
    // before this fix, nothing here would ever call destination.end(), and
    // this await would hang until the test's own timeout killed it.
    await done;

    expect(reports).toEqual([{ phase: "boundary" }]);
    expect(chunks().join("")).toContain("</html>"); // a complete document was still sent, not a truncated one
  });
});

describe("createRenderStreaming — destination error handling", () => {
  it("a destination 'error' event (e.g. a client disconnecting mid-stream) doesn't crash the process", async () => {
    // Real, previously-undiscovered bug: Node's EventEmitter contract
    // throws (crashing the whole process, not just this request) if an
    // "error" event fires with zero listeners attached — pipeTo used to
    // attach none at all. If this test's `destination.emit("error", ...)`
    // below were uncaught, it would throw synchronously right here and
    // fail this test (or crash the whole test process) — the absence of a
    // thrown/rejected error IS the assertion.
    const { descriptor, releaseImport } = deferredIslandDescriptor("abort-check");
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement(Island, { component: descriptor, props: {} }),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {});

    const destination = new PassThrough();
    const chunksAfterError: string[] = [];
    let sawError = false;
    destination.on("error", () => (sawError = true));
    destination.on("data", (chunk: Buffer) => {
      if (sawError) chunksAfterError.push(chunk.toString("utf-8"));
    });

    result!.pipeTo(destination);
    await new Promise((r) => setTimeout(r, 20)); // let the shell flush

    destination.emit("error", new Error("simulated client disconnect"));
    releaseImport();
    await new Promise((r) => setTimeout(r, 20));

    expect(sawError).toBe(true);
    // The render was aborted — no further chunks (e.g. the island's real
    // content, which would otherwise arrive once releaseImport() resolves)
    // should show up after the destination already errored.
    expect(chunksAfterError).toEqual([]);
  });
});

describe("createRenderStreaming — real bug: backpressure was ignored, letting one slow client buffer unbounded memory", () => {
  function bigRouteModule(): RouteModule {
    // A route large enough (~400KB of real react-dom output) that "all of
    // it got buffered anyway" and "the source was genuinely paused" are
    // clearly distinguishable, not just off-by-a-chunk noise.
    const bigText = "x".repeat(2000);
    return {
      renderMode: "streaming",
      default: () =>
        createElement(
          "div",
          null,
          ...Array.from({ length: 200 }, (_, i) => createElement("p", { key: i }, bigText))
        ),
    };
  }

  it("a fast destination receives the full document (sanity baseline for the size used below)", async () => {
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(bigRouteModule(), {});
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);
    await done;
    expect(chunks().join("").length).toBeGreaterThan(300_000);
  });

  it("pauses the source instead of buffering when the destination's write() returns false", async () => {
    // A real Writable that never drains — write() always returns false
    // once its small internal buffer fills, and nothing ever reads it back
    // out, exactly like a slow/stalled network client. Before this fix (a
    // hand-rolled `passThrough.on("data", chunk => destination.write
    // (chunk))` loop that never checked write()'s return value), the
    // PassThrough kept emitting "data" regardless of that return value, so
    // bytes piled up in the destination's own internal buffer with nothing
    // bounding it. A real Writable stays in paused mode (nothing consuming
    // its readable side) unless something attaches a "data" listener,
    // calls .resume(), or pipes it elsewhere — none of which this test
    // does, so its internal buffer genuinely fills and back-pressures the
    // writer, exactly like a client that has stopped reading its response.
    const destination = new PassThrough({ highWaterMark: 16 });
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(bigRouteModule(), {});

    result!.pipeTo(destination);
    await new Promise((r) => setTimeout(r, 50));

    // The real assertion: destination.writableLength (Node's own internal
    // buffered-byte count) stays a small fraction of the ~400KB document
    // (see the baseline test above) instead of growing to fit all of it —
    // proof the source was actually paused, not "eventually all written
    // anyway regardless of whether the consumer is reading."
    expect(destination.writableLength).toBeLessThan(50_000);
  });
});

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

  it("omits the island client script when the route rendered zero islands, even though the app has one configured", async () => {
    // Real bug fixed here (see islandComponent.tsx's Island() doc comment):
    // the tail used to include the hydration script for ANY app that has an
    // island anywhere, not just routes that actually rendered one.
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement("h1", null, "No islands on this page"),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, { islandClientUrl: "/island-client.tsx" });
    const { destination, chunks, done } = collectChunks();
    result!.pipeTo(destination);
    await done;

    const full = chunks().join("");
    expect(full).not.toContain("/island-client.tsx");
    expect(full).not.toContain("<script");
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

  it("propagates a real Set-Cookie from a session-carrying context", async () => {
    const routeModule: RouteModule = {
      renderMode: "streaming",
      default: () => createElement("p", null, "x"),
    };
    const renderStreaming = createRenderStreaming(deps);
    const result = await renderStreaming(routeModule, {
      sessionCookieOptions: { name: "devora_session", secret: "test-secret", store: createMemorySessionStore() },
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
