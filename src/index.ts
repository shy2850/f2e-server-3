import engine from "./server-engine"
import { F2EConfig } from "./interface"
import { getConfigEvents, getConfigResult } from "./utils/config"
import logger from "./utils/logger"
import createMemoryTree from "./memory-tree"
import { exit } from "node:process"
import * as _ from './utils/misc'
import { server_all } from "./server"

export * from "./interface"

const { App, SSLApp } = engine

export const createBuilder = async (options: F2EConfig) => {
    const { root, output, namehash } = getConfigResult(options)
    const { buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = getConfigEvents(options)
    const memoryTree = createMemoryTree({
        root, dest: output, watch: false, with_hash: !!namehash,
        buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher
    })
    try {
        await memoryTree.input("")
        logger.log("资源编译完成")
        await memoryTree.output("")
        logger.log("资源输出完成")
    } catch (e) {
        logger.error(e)
        exit(1)
    }
}

const createServer = async (options: F2EConfig) => {
    const conf = getConfigResult(options)
    const { root, mode, namehash, port, host, ssl, onServerCreate } = conf
    if (mode === 'build') {
        createBuilder(options)
        return
    }

    const events = getConfigEvents(options)
    const { buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = events
    const memoryTree = createMemoryTree({
        root, watch: mode === 'dev', with_hash: !!namehash,
        buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher
    })
    await memoryTree.input("")

    const app = ssl ? SSLApp(ssl) : App()
    app.listen(host, port, function () {
        logger.log(`Server listening on ${host}:${port}`)
        ssl && logger.log(`SSL: ON`)
        onServerCreate(app, conf)
    })
    .any('/*', server_all(conf, events, memoryTree))

    return app
}

export default createServer