import { describe, expect, it } from "vitest";
import { describeRequest } from "../trustProxy.js";

const req = (over: Record<string, unknown> = {}) => ({ url: "/a/b?c=1", method: "POST", headers: { host: "example.test" } as Record<string, string | string[] | undefined>, socket: { remoteAddress: "10.0.0.5" }, ...over });

describe("describeRequest", () => {
  it("describes the request with an absolute url, method, headers and ip", () => {
    const m = describeRequest(req(), false);
    expect(m.url).toBe("http://example.test/a/b?c=1");
    expect(m.method).toBe("POST");
    expect(m.ip).toBe("10.0.0.5");
    expect(m.headers.host).toBe("example.test");
  });
  it("uses the proxy's scheme and host only when trusted", () => {
    const headers = { host: "internal:3000", "x-forwarded-proto": "https", "x-forwarded-host": "public.test" };
    expect(describeRequest(req({ headers }), true).url).toBe("https://public.test/a/b?c=1");
    expect(describeRequest(req({ headers }), false).url).toBe("http://internal:3000/a/b?c=1");
  });
  it("keeps the URL it saw at creation even if the request is rewritten later", () => {
    const r = req();
    const m = describeRequest(r, false);
    r.url = "/changed";
    expect(m.url).toBe("http://example.test/a/b?c=1");
  });
  it("falls back to localhost for a host the URL parser rejects", () => {
    expect(describeRequest(req({ headers: { host: "bad host" } }), false).url).toBe("http://localhost/a/b?c=1");
  });
});
