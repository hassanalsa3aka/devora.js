/** Child process for DEVORA_TEST_DEV_SERVER=experimental (see fixtureApp.ts bootDevServer): boots one app and waits. */
import { createExperimentalAppDevServer } from "../../commands/devExperimental.js";

const options = JSON.parse(process.argv[2]!);
const handle = await createExperimentalAppDevServer(options);
const stop = () => void handle.close().finally(() => process.exit(0));
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
console.log(`READY ${options.port}`);
