import { run_memory_tree } from "./memory-tree"
import { run_get_config } from "./config"
import { run_filterUWS, run_template, } from "./utils"
import createServer, { Route, UserStore } from "../src/index"
import logger from "../src/utils/logger";
import * as _ from "../src/utils/misc";
import { exit } from "node:process";
import { createResponseHelper } from "../src/utils/resp";
import { server } from "./server";
import path from "node:path";

// run_template()
// run_get_config();
// run_memory_tree();

createServer({
    // host: "server.local",
    auth: {
        redirect: true,
        store: new UserStore(path.join(process.cwd(), '.f2e_cache/auth.db')),
    },
    middlewares: [
        server,
    ],
}).then((context) => {
    const { handleSuccess, handleError } = createResponseHelper(context.conf)
    if ('app' in context) {
        context.app?.get("/exit", (res, req) => {
            res.cork(() => {
                logger.info("Exit Server!");
                setTimeout(() => exit(0), 100);
                handleSuccess({ resp: res, headers: {} }, 'html', "Exit Server!".big().bold());
            });
        });
        context.app?.get("/delete_uws_node", (res, req) => {
            res.cork(() => {
                try {
                    const rest = run_filterUWS()
                    logger.info("Delete OK!");
                    handleSuccess(
                        { resp: res, headers: {} }, 'html',
                        _.renderHTML(`<h2>删除后剩余文件</h2> <ol>{{each rest}}<li>{{@}}</li>{{/each}}</ol>`, { rest })
                    );
                } catch (e) {
                    handleError(res, e + '');
                }
            });
        });
    }
})

