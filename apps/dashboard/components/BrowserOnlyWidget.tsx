// clientOnly() proof (ROADMAP.md's clientOnly item): this module reads
// `window` at *module scope* (not just inside a render/effect), so simply
// importing it — never mind rendering it — throws `window is not defined`
// on the server. A component that only touched `window` inside render would
// prove nothing about clientOnly() specifically, since nothing here ever
// calls render() on the server for a module that was never imported; the
// module-scope read is what makes this a real test instead of a synthetic
// one. This stands in for a genuine browser-only library (three.js,
// fabric.js, etc. all touch `window`/`document` at load time the same way)
// without pulling in one just to prove the primitive works.
const initialWidth = window.innerWidth;

export default function BrowserOnlyWidget() {
  return <p>Browser-only widget loaded — window.innerWidth was {initialWidth}px at import time.</p>;
}
