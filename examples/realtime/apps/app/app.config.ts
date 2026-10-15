import { defineApp } from "@devorajs/core/config";

// Where the browser connects for live updates (see ../../realtime/). Used
// for the CSP below and for the token route's answer; set REALTIME_URL for
// both `devora build` and `devora start` when it isn't the local default.
const realtime = new URL(process.env.REALTIME_URL ?? "http://localhost:4400");
const wsOrigin = `${realtime.protocol === "https:" ? "wss:" : "ws:"}//${realtime.host}`;

export default defineApp({
  defaultRenderMode: "ssr",
  sitemap: false,
  apiDir: "endpoints",
  security: {
    // The default policy is `default-src 'self'; style-src 'self' 'unsafe-inline';
    // object-src 'none'; base-uri 'self'`, which blocks a connection to any
    // other origin. This replaces it with the same policy plus `connect-src`
    // naming the realtime server (http(s) for the polling transport, ws(s)
    // for the upgrade). Setting `csp` replaces the whole default string.
    csp:
      "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; " +
      `connect-src 'self' ${realtime.origin} ${wsOrigin}`,
  },
});
