#!/usr/bin/env node
// Launcher: `devora start` loads the small start bundle, every other command the full CLI.
const command = process.argv.slice(2).filter((arg) => arg !== "--")[0];
await import(command === "start" ? "./start.js" : "./index.js");
