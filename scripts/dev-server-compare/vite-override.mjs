// Preloaded with `node --import`: makes every `import "vite"` (the CLI, the app's vite.config.ts, @vitejs/plugin-react) resolve to
// the Vite in DEVORA_VITE_DIR/node_modules/vite instead of the repository's. Used to measure the same CLI against Vite 7 and 8.
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dir = process.env.DEVORA_VITE_DIR;
if (dir) {
  const entry = pathToFileURL(path.join(dir, "node_modules", "vite", "dist", "node", "index.js")).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "vite") return { url: entry, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
}
