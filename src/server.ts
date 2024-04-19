import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { MiddlewareEvents } from "./middlewares/interface"
import * as _ from './utils/misc'
import { F2EConfigResult } from "./interface"
import { MemoryTree } from "./memory-tree"
import { createResponseHelper } from "./utils/resp"
import engine from "./server-engine"
import logger from "./utils/logger"

export const server_all = (conf: F2EConfigResult, events: Required<MiddlewareEvents>, memory: MemoryTree.MemoryTree) => {
    const { onRoute, beforeRoute } = events
    const { handleDirectory, handleNotFound, handleSuccess, handleError } = createResponseHelper(conf)
    const execute = async (pathname: string, req: HttpRequest, resp: HttpResponse, body?: Buffer) => {
        const routeResult = await onRoute(pathname, req, resp, memory.store, body)
        if (routeResult === false) {
            return
        } else if (typeof routeResult === 'string') {
            pathname = routeResult || pathname
        }
        pathname = _.pathname_fixer(pathname)
        const data = await memory.store.load(pathname)
        if (conf.page_dir != false && _.isPlainObject(data)) {
            handleDirectory(resp, pathname, data)
        } else if (typeof data === 'undefined') {
            handleNotFound(resp, pathname)
        } else if (typeof data === 'string' || Buffer.isBuffer(data)) {
            handleSuccess(req, resp, pathname, data)
        } else {
            handleError(resp, 'Unknown Error!\n Wrong Data in memory')
        }
    }

    return async (resp: HttpResponse, req: HttpRequest) => {
        const location = new URL('http://127.0.0.1' + req.getUrl())
        let pathname = _.pathname_fixer(_.decode(location.pathname))
        let pathnameTemp = await beforeRoute(pathname, req, resp, conf)
        if (pathnameTemp === false) {
            return
        } else if (typeof pathnameTemp === 'string') {
            pathname = pathnameTemp
        }
        const method = req.getMethod().toUpperCase()
        const body = method === 'POST' ? await engine.parseBody(req, resp) : undefined
        body && logger.debug(location.pathname, body.toString())
        await execute(pathname, req, resp, body)
    }
}