import { run_memory_tree } from "./memory-tree"
import { run_get_config } from "./config"
import { run_template } from "./utils"
import createServer from "../src/index"
import logger from "../src/utils/logger";
import { exit } from "node:process";

// run_template()
// run_get_config();
// run_memory_tree();

createServer({}).then((app) => {
    app?.get("/exit", (res, req) => {
        res.cork(() => {
            logger.info("Exit Server!");
            res.writeStatus("200 OK");
            res.writeHeader("Content-Type", "text/html");
            res.end("Exit Server!".big().bold());
            setTimeout(() => exit(0), 100);
        });
    });
})

