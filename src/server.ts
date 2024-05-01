import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { MiddlewareEvents } from "./middlewares/interface"
import * as _ from './utils/misc'
import { APIContext, F2EConfigResult } from "./interface"
import { MemoryTree } from "./memory-tree"
import { createResponseHelper, getHttpHeaders } from "./utils/resp"
import engine from "./server-engine"
import logger from "./utils/logger"
import { IncomingMessage } from "node:http"

export const server_all = (conf: F2EConfigResult, events: Required<MiddlewareEvents>, memory: MemoryTree.MemoryTree) => {
    const { onRoute, beforeRoute } = events
    const { handleDirectory, handleNotFound, handleSuccess, handleError } = createResponseHelper(conf)
    const execute = async (pathname: string, ctx: APIContext) => {
        const {req, resp} = ctx
        const routeResult = await onRoute(pathname, ctx)
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
            handleSuccess(ctx, pathname, data)
        } else {
            handleError(resp, 'Unknown Error!\n Wrong Data in memory')
        }
    }

    return async (resp: HttpResponse, req: HttpRequest) => {
        const location = new URL(req.getUrl() + '?' + (req.getQuery() || ''), `http://${req.getHeader('host')}`)
        if (conf.host != '0.0.0.0') {
            if (location.hostname != conf.host) {
                handleError(resp, 'Wrong Host!')
                return
            }
        }
        let pathname = _.pathname_fixer(_.decode(location.pathname))
        const headers = getHttpHeaders('request' in req ? (req.request as IncomingMessage) : req)
        const ctx: APIContext = {
            req, resp, location, pathname,
            store: memory.store, method: req.getMethod() || 'get',
            headers,
        }
        let pathnameTemp = await beforeRoute(pathname, ctx)
        if (pathnameTemp === false) {
            return
        } else if (typeof pathnameTemp === 'string') {
            pathname = pathnameTemp
        }
        const method = req.getMethod().toUpperCase()
        const body = method === 'POST' ? await engine.parseBody(req, resp) : undefined
        if (body) {
            logger.debug(location.pathname, body.toString())
        }
        await execute(pathname, { ...ctx, body })
    }
}