import { startWebapp } from "../src/webapp.mjs";

const port = Number(process.env.PORT || 3103);
startWebapp(port);
