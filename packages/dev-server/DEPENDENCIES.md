# packages/dev-server (@devorajs/sekhem) dependency justifications

- **esbuild** - transforms TypeScript and JSX, bundles dependencies for the dev server and builds the production bundles; no Vite is involved.
- **acorn** - parses modules to find imports, island calls and components for Fast Refresh; it only reads source text, nothing is evaluated.
- **react-refresh** - the runtime that React Fast Refresh needs in the browser.
