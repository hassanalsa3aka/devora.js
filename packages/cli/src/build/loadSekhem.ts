/**
 * Sekhem, the engine of our own, is a separate package (`@devorajs/sekhem`): a project that asks for it installs it. A missing
 * package is said in one sentence with the command that fixes it, instead of a module-not-found stack.
 */
export async function loadSekhem(): Promise<typeof import("@devorajs/sekhem")> {
  try {
    return await import("@devorajs/sekhem");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND" || /Cannot find (package|module)/.test((error as Error).message)) {
      throw new Error(
        "[devora] the Sekhem engine is a separate package and is not installed here. Install it (Node 22.15 or later): " +
          "npm install --save-dev @devorajs/sekhem   (or pnpm add -D / yarn add -D), or run with --engine=vite."
      );
    }
    throw error;
  }
}
