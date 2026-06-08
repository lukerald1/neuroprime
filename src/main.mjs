import { assertConfig, config } from "./config.mjs";
import { startBot } from "./telegram.mjs";
import { startWebapp } from "./webapp.mjs";

assertConfig();
startWebapp(config.port);
await startBot();
