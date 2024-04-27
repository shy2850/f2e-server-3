import engine from "./server-engine"
import { F2EConfig } from "./interface"
import { getConfigEvents, getConfigResult } from "./utils/config"
import logger from "./utils/logger"
import createMemoryTree from "./memory-tree"
import { exit } from "node:process"
import * as _ from './utils/misc'
import { server_all } from "./server"

export * from "./interface"
export * from "./utils"
export * from './routes'

const { App, SSLApp } = engine

export const createBuilder = async (options: F2EConfig) => {
    const conf = getConfigResult(options)
    const { root, watch, namehash, dest } = conf
    const events = getConfigEvents(options)
    const { onMemoryInit, onMemoryLoad, buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = events
    const memoryTree = createMemoryTree({
        root, dest: dest, watch, namehash,
        buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher
    })
    try {
        await onMemoryInit(memoryTree.store)
        await memoryTree.input("")
        await onMemoryLoad(memoryTree.store)
        await memoryTree.output("")
    } catch (e) {
        logger.error(e)
        exit(1)
    }
    return { conf, events, memoryTree }
}

export const createServer = async (options: F2EConfig) => {
    const startTime = Date.now()
    const conf = getConfigResult(options)
    const { root, watch, dest, mode, namehash, port, host, ssl, onServerCreate } = conf
    if (mode === 'build') {
        return createBuilder(options)
    }

    const events = getConfigEvents(options)
    const { onMemoryLoad, onMemoryInit, buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher } = events
    const memoryTree = createMemoryTree(mode === 'dev' ? {
        root, watch, namehash, dest,
        buildFilter, watchFilter, outputFilter, onGet, onSet, buildWatcher
    } : { root }); // prod模式下，不加载任何中间件
    await onMemoryInit(memoryTree.store)
    await memoryTree.input("")
    await onMemoryLoad(memoryTree.store)
    logger.debug('server init: ' + (Date.now() - startTime) + 'ms')
    memoryTree.watch()

    const app = ssl ? SSLApp(ssl) : App()
    app.listen(host, port, function () {
        logger.debug(`Server listening on ${host}:${port}`)
        ssl && logger.debug(`SSL: ON`)
        onServerCreate(app, conf)
    })
    .any('/*', server_all(conf, events, memoryTree))

    return { app, conf, events, memoryTree }
}

export default createServer