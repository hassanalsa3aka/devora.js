import { describe, it, expect } from "vitest";
import { readBodyWithLimit, PayloadTooLargeError, MAX_BODY_BYTES } from "../readBody.js";

/** A real async-iterable stream-like object, not a mock of Node's actual
 * IncomingMessage — readBodyWithLimit only ever needs `for await` + an
 * optional `destroy()`, so this exercises the real contract directly. */
function fakeStream(chunks: Buffer[]): AsyncIterable<Buffer> & { destroy: () => void; destroyed: boolean } {
  return {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

describe("readBodyWithLimit — real bug: unbounded request-body buffering (DoS)", () => {
  it("concatenates chunks under the limit into the full body", async () => {
    const stream = fakeStream([Buffer.from("hello "), Buffer.from("world")]);
    const body = await readBodyWithLimit(stream, 1024);
    expect(body.toString("utf-8")).toBe("hello world");
  });

  it("real bug: throws PayloadTooLargeError instead of buffering unbounded data past the limit", async () => {
    const bigChunk = Buffer.alloc(1024, "x");
    const stream = fakeStream([bigChunk, bigChunk, bigChunk]); // 3KB total
    await expect(readBodyWithLimit(stream, 2048)).rejects.toThrow(PayloadTooLargeError);
  });

  it("destroys the underlying stream the moment the limit is exceeded, instead of reading it to completion", async () => {
    const bigChunk = Buffer.alloc(1024, "x");
    const stream = fakeStream([bigChunk, bigChunk, bigChunk]);
    try {
      await readBodyWithLimit(stream, 1500);
    } catch {
      // expected
    }
    expect(stream.destroyed).toBe(true);
  });

  it("a body exactly at the limit is accepted, one byte over is rejected", async () => {
    const exact = Buffer.alloc(100, "a");
    await expect(readBodyWithLimit(fakeStream([exact]), 100)).resolves.toEqual(exact);

    const overByOne = Buffer.alloc(101, "a");
    await expect(readBodyWithLimit(fakeStream([overByOne]), 100)).rejects.toThrow(PayloadTooLargeError);
  });

  it("defaults to MAX_BODY_BYTES when no explicit limit is given", async () => {
    const stream = fakeStream([Buffer.from("small")]);
    await expect(readBodyWithLimit(stream)).resolves.toEqual(Buffer.from("small"));
    expect(MAX_BODY_BYTES).toBeGreaterThan(0);
  });

  it("an empty body resolves to an empty buffer, not an error", async () => {
    const body = await readBodyWithLimit(fakeStream([]), 1024);
    expect(body.length).toBe(0);
  });
});
