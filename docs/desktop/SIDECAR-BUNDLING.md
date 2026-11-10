# Shipping the server as a binary: what was tried, what works, what is left

`devora desktop build` writes the Tauri project and declares `binaries/devora-server-<target>` as the bundle's sidecar, but nothing
builds that binary yet (ROADMAP.md, Desktop target). This note records what a check on macOS (Apple silicon, Node 26.13.0) found, so
the work can start from facts. Nothing here is implemented in the CLI.

## What works (checked)

- `node --build-sea sea-config.json` (Node 25.5 and later, so Node 26) writes a single executable: the Node binary plus a blob with
  the main script and named assets (about 145 MB for the Node 26 binary).
- On macOS the result must be signed before it runs (`codesign --sign - --force <binary>`; an ad-hoc signature is enough on the build
  machine; a distributed app needs the developer's own signature). Unsigned, the system kills it with exit 137.
- The main script of a single executable is a CommonJS file and cannot `import()` a file (the error is "No such built-in module").
  What does work: the main script writes its assets to a folder, then `createRequire(folder + "/x.cjs")("boot.cjs")`; the loaded
  `boot.cjs` is an ordinary CommonJS module, and an `import("./esm.mjs")` from it loads ES modules from the folder normally.
  So the sidecar is: extract the app (once per version, into the user's cache folder) and start the existing start bundle from there.

## What is left

1. **Which files go in.** `dist/` of the app, the start bundle (`packages/cli/dist/start.js`), and every package the built server
   imports at run time (the build leaves installed packages external). The list has to be computed, not guessed: either bundle all
   dependencies into the server output for desktop builds (the Sekhem build already decides external or not per package in
   `externalPackagesPlugin`), or trace the imports.
2. **The asset format.** Single-executable assets are whole files; an app is hundreds. Either one archive file with a small index, or
   a bundle of the server into few files.
3. **Where it extracts.** A folder named by a hash of the contents under the platform's per-user cache folder, written with mode
   0700, checked by hash before use (the same rule as the Sekhem caches), never reused across versions.
4. **Target triples.** One binary per OS and CPU (`devora-server-aarch64-apple-darwin`, ...). Cross-building a binary needs that
   platform's Node binary; this has not been tried.
5. **The shell.** The generated Rust shell already starts the sidecar with the launch token and the parent process id; it must also pass
   the extracted folder's location. It has still not been compiled or run (ROADMAP.md).
6. **Signing and notarisation** on macOS, signing on Windows: the author's accounts and certificates, not code.
7. **Tests** that run the produced binary on each OS (only macOS has been used).

Not decided, and left to the maintainer: whether the extra download size (about 150 MB for the runtime alone) is acceptable, or the
shell should use a Node the user already has.
