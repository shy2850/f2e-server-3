import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { MiddlewareEvents } from "./middlewares/interface"
import * as _ from './utils/misc'
import { F2EConfigResult } from "./interface"
import { MemoryTree } from "./memory-tree"
import { createResponseHelper } from "./utils/resp"

export const server_all = (conf: F2EConfigResult, events: Required<MiddlewareEvents>, memory: MemoryTree.MemoryTree) => {
    const { onRoute, beforeRoute } = events
    const { handleDirectory, handleNotFound, handleSuccess, handleError } = createResponseHelper(conf)
    const execute = async (pathname: string, req: HttpRequest, resp: HttpResponse, body?: Buffer) => {
        const routeResult = await onRoute(pathname, req, resp, body, memory.store)
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
        if (method === 'POST') {
            let buffers: Uint8Array[] = [];
            resp.onData(async function (ab, isLast) {
                buffers.push(Buffer.from(ab))
                if (isLast) {
                    const body = Buffer.concat(buffers)
                    await execute(pathname, req, resp, body)
                }
            }).onAborted(function () {
                resp.aborted = true;
            })
        } else {
            await execute(pathname, req, resp)
        }
    }
}