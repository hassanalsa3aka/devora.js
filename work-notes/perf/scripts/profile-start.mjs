// Runs `devora start` from an installed @devorajs/cli so `node --cpu-prof` can write its profile on Ctrl-C.
//   cd benchmarks/apps/devora-api && PORT=4310 NODE_ENV=production DEVORA_SESSION_SECRET=... \
//     node --cpu-prof --cpu-prof-dir=<dir> <this file>
import path from "node:path";
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
const cli = path.resolve("node_modules/@devorajs/cli/dist/index.js");
process.argv = [process.argv[0], cli, "start"];
await import(cli);
