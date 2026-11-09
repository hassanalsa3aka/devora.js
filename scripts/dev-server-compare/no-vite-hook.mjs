// Preloaded with `node --import`: any attempt to load Vite (or a Vite plugin) fails. Used to prove the own engine never needs it.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "vite" || specifier.startsWith("vite/") || specifier.startsWith("@vitejs/") || /[\\/]node_modules[\\/](\.pnpm[\\/][^\\/]*[\\/]node_modules[\\/])?vite[\\/]/.test(specifier)) {
      throw new Error(`NO-VITE: something tried to load "${specifier}" (from ${context.parentURL ?? "?"})`);
    }
    return nextResolve(specifier, context);
  },
});
