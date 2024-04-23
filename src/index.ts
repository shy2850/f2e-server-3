import engine from "./server-engine"
import { F2EConfig } from "./interface"
import { getConfigEvents, getConfigResult } from "./utils/config"
import logger from "./utils/logger"
import createMemoryTree from "./memory-tree"
import { exit } from "node:process"
import * as _ from './utils/misc'
import { server_all } from "./server"
export { Logger, LogLevel } from './utils/logger';

export * from "./interface"

const { App, SSLApp } = engine

export const createBuilder = async (options: F2EConfig) => {
    const { root, watch, namehash, dest } = getConfigResult(options)
    const { buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = getConfigEvents(options)
    const memoryTree = createMemoryTree({
        root, dest: dest, watch, namehash,
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
    const startTime = Date.now()
    const conf = getConfigResult(options)
    const { root, watch, dest, mode, namehash, port, host, ssl, onServerCreate } = conf
    if (mode === 'build') {
        createBuilder(options)
        return
    }

    const events = getConfigEvents(options)
    const { buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = events
    const memoryTree = createMemoryTree(mode === 'dev' ? {
        root, watch, namehash, dest,
        buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher
    } : { root }); // prod模式下，不加载任何中间件
    await memoryTree.input("")
    logger.debug('启动时间:' + (Date.now() - startTime) + 'ms')

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