import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { IRoute, RouteItem } from './interface'
import { MemoryTree } from '../memory-tree'
import { queryparams } from '../utils/misc'
import { APIContext, F2EConfigResult } from '../interface'
import { createResponseHelper } from '../utils/resp'
import logger from '../utils/logger'
export * from './interface'

export class Route implements IRoute {
    routes: RouteItem[] = []
    route_map = new Map<string, RouteItem>()
    options: F2EConfigResult
    respUtils: ReturnType<typeof createResponseHelper>
    constructor (options: F2EConfigResult) {
        this.options = options
        this.respUtils = createResponseHelper(options)
    }
    private handleSSE (req: HttpRequest, resp: HttpResponse, item: RouteItem, body: any, ctx: APIContext) {
        const {
            interval = 1000,
            interval_beat = 30000,
            default_content = '',
        } = item
        resp.cork(() => {
            resp.writeStatus('200 OK')
            resp.writeHeader('Content-Type', 'text/event-stream')
            resp.writeHeader('Cache-Control', 'no-cache')
            resp.writeHeader('Connection', 'keep-alive')
        })
        let interval1: Timer
        const heartBeat = function heartBeat () {
            resp.cork(() => {
                resp.write(`data:${default_content}\n\n`)
            })
            if (interval_beat) {
                interval1 = setTimeout(heartBeat, interval_beat)
            }
        }
        let interval2: Timer
        const loop = async function loop () {
            try {
                const res = await item.handler(body, ctx)
                if (res) {
                    resp.cork(() => {
                        resp.write(`data:${JSON.stringify(res)}\n\n`)
                    })
                }
            } catch (e) {
                logger.error('SSE LOOP:', e)
            }
            if (interval) {
                interval2 = setTimeout(loop, interval)
            }
        }
        resp.onAborted(() => {
            clearTimeout(interval1)
            clearTimeout(interval2)
        })
        loop()
        heartBeat()
        return false
    }
    private find (path: string, method = '*') {
        return this.routes.find(r => {
            if (r.method === method || r.method === '*') {
                return typeof r.path === 'string' ? r.path === path : r.path.test(path)
            } else {
                return false
            }
        })
    }
    on = (path: string | RegExp, handler: RouteItem['handler'], ext?: Omit<RouteItem, 'path' | 'handler'>) => {
        this.routes.push({
            path, handler, method: '*', ...(ext || {}),
        })
    }
    match = (path: string, method = '*') => {
        let item = this.route_map.get(path + ':' + method) || this.route_map.get(path + ':*')
        if (item) {
            return item
        }
        item = this.find(path, method)
        if (item) {
            if (item.cache) {
                this.route_map.set(path + ':' + item.method, item)
            }
            return item
        }
        return undefined
    };
    execute = async (pathname: string, req: HttpRequest, resp: HttpResponse, store?: MemoryTree.Store, body?: Buffer) => {
        const { handleError, handleSuccess, handleNotFound } = this.respUtils
        const method = req.getMethod()
        const item = this.match(pathname, method)
        const ctx: APIContext = { req, resp, pathname, store }
        if (item) {
            let data: any = null
            try {
                if (method === 'post' && body && body.length > 0) {
                    const contentType = req.getHeader('content-type') || 'application/x-www-form-urlencoded'
                    switch (contentType) {
                        case 'application/json':
                            data = JSON.parse(body.toString())
                            break
                        default:
                            data = queryparams(body.toString())
                            break
                    }
                }
                switch (item.type || 'json') {
                    case 'json':
                        handleSuccess(req, resp, '.json', JSON.stringify(await item.handler(data, ctx)))
                        break
                    case 'jsonp':
                        const callback = req.getQuery('callback') || 'callback'
                        handleSuccess(req, resp, '.js', `${callback}(${JSON.stringify(await item.handler(data, ctx))})`)
                        break
                    case 'sse':
                        this.handleSSE(req, resp, item, data, ctx)
                        break;
                    default:
                        const result = await item.handler(data, ctx)
                        if (typeof result === 'undefined') {
                            handleNotFound(resp, pathname)
                        } else {
                            handleSuccess(req, resp, item.sourceType || 'txt', result)
                        }
                        break;
                }
            } catch (e) {
                handleError(resp, e + '')
            }
            return false
        }
    };
}
