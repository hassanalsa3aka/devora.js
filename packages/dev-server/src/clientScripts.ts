/**
 * The two scripts the dev server serves to the browser as files (never inline: the page's CSP is `default-src 'self'`).
 * Plain browser JavaScript kept as strings so there is nothing to build and nothing to resolve at run time.
 */
export const HMR_CLIENT = `
const hots = new Map();
export function createHotContext(url) {
  const hot = { data: {}, accepted: false, accept() { hot.accepted = true; }, dispose() {}, invalidate() { location.reload(); } };
  hots.set(url, hot);
  return hot;
}
function overlay(text) {
  let box = document.getElementById("devora-error-overlay");
  if (!text) { if (box) box.remove(); return; }
  if (!box) {
    box = document.createElement("pre");
    box.id = "devora-error-overlay";
    const s = box.style;
    s.position = "fixed"; s.inset = "0"; s.zIndex = "2147483647"; s.margin = "0"; s.padding = "24px"; s.overflow = "auto";
    s.background = "rgba(20,20,24,.96)"; s.color = "#ffb4b4"; s.font = "13px/1.5 ui-monospace, monospace"; s.whiteSpace = "pre-wrap";
    box.addEventListener("click", () => box.remove());
    document.body.appendChild(box);
  }
  box.textContent = text;
}
function updateStyle(url, t) {
  for (const link of document.querySelectorAll("link[rel=stylesheet]")) {
    if (new URL(link.href, location.href).pathname === url) link.href = url + "?t=" + t;
  }
}
export function connect(token) {
  const open = () => {
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/_devora/hmr", ["devora-hmr", token]);
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "full-reload") location.reload();
      else if (msg.type === "error") overlay(msg.message);
      else if (msg.type === "css-update") { updateStyle(msg.url, msg.t); overlay(""); }
      else if (msg.type === "update") {
        try {
          for (const url of msg.urls) await import(url + "?t=" + msg.t);
          if (window.__devoraRefresh) window.__devoraRefresh.performReactRefresh();
          overlay("");
        } catch (error) { overlay(String(error && error.stack || error)); }
      }
    };
    ws.onclose = () => { setTimeout(() => { fetch("/_devora/hmr-client.js", { cache: "no-store" }).then(() => location.reload(), open); }, 1000); };
  };
  open();
}
`;

export function preambleScript(token: string, refreshDep: string): string {
  return `import RefreshRuntime from ${JSON.stringify(refreshDep)};
import { connect } from "/_devora/hmr-client.js";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__devoraRefresh = RefreshRuntime;
connect(${JSON.stringify(token)});
`;
}
