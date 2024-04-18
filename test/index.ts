import { run_memory_tree } from "./memory-tree"
import { run_get_config } from "./config"
import { run_template } from "./utils"
import createServer from "../src/index"
import logger from "../src/utils/logger";
import { exit } from "node:process";

logger.log(
    'uWebsucket.js version: ',
    process.platform + '_' + process.arch + '_' + process.versions.modules,
    '\n'
);

// run_template()
// run_get_config();
// run_memory_tree();

createServer({
    port: 3000
}).then((app) => {
    app?.get("/exit", (res, req) => {
        res.cork(() => {
            res.end("Exit Server!".big().bold());
            setTimeout(() => exit(0), 100);
        });
    });
})

