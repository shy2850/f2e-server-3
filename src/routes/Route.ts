import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { IRoute, RouteItem } from './interface'
import { MemoryTree } from '../memory-tree'
import { queryparams } from '../utils/misc'
import { APIContext, F2EConfigResult } from '../interface'
import { createResponseHelper } from '../utils/resp'
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
        const { handleError, handleSuccess, handleNotFound, handleSSE } = this.respUtils
        const method = req.getMethod()
        const item = this.match(pathname, method)
        const ctx: APIContext = { req, resp, pathname, store,
            url: new URL(req.getUrl() + '?' + (req.getQuery() || ''), `http://${req.getHeader('host')}`) }
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
                        handleSSE(req, resp, item, data, ctx)
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
                console.error('onRoute Error:', pathname, e)
                handleError(resp, e + '')
            }
            return false
        }
    };
}
