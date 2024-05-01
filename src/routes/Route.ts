import { IRoute, RouteFilter, RouteItem } from './interface'
import { queryparams } from '../utils/misc'
import { APIContext, F2EConfigResult } from '../interface'
import { createResponseHelper } from '../utils/resp'
export * from './interface'

export class Route implements IRoute {
    routes: RouteItem[] = []
    route_map = new Map<string, RouteItem>()
    options: F2EConfigResult
    respUtils: ReturnType<typeof createResponseHelper>
    filter?: RouteFilter
    constructor (options: F2EConfigResult, filter?: RouteFilter) {
        this.options = options
        this.respUtils = createResponseHelper(options)
        this.filter = filter
    }
    private find (path: string, method = '*') {
        return this.routes.find(r => {
            if (r.method?.toUpperCase() === method.toUpperCase() || r.method === '*') {
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
    execute = async (pathname: string, ctx: APIContext) => {
        const { handleError, handleSuccess, handleNotFound, handleSSE } = this.respUtils
        const { req, resp, body, headers = {} } = ctx
        if (this.filter) {
            const filterResult = await this.filter(pathname, ctx)
            if (false === filterResult) {
                return false
            }
            if (typeof filterResult === 'string') {
                pathname = filterResult
            }
        }
        let data: any = null
        if (body && body.length > 0) {
            const contentType = headers['content-type'] || 'application/x-www-form-urlencoded'
            try {
                switch (contentType) {
                    case 'application/json':
                        data = JSON.parse(body.toString())
                        break
                    default:
                        data = queryparams(body.toString())
                        break
                }
            } catch (e) {
                console.error('onRoute Error:', pathname, e)
            }
        }
        const item = this.match(pathname, body ? 'post' : 'get')
        if (item) {
            try {
                switch (item.type || 'json') {
                    case 'json':
                        handleSuccess(ctx, '.json', JSON.stringify(await item.handler(data, ctx)))
                        break
                    case 'jsonp':
                        const callback = req.getQuery('callback') || 'callback'
                        handleSuccess(ctx, '.js', `${callback}(${JSON.stringify(await item.handler(data, ctx))})`)
                        break
                    case 'sse':
                        handleSSE(ctx, item, data)
                        break;
                    default:
                        const result = await item.handler(data, ctx)
                        if (typeof result === 'undefined') {
                            handleNotFound(resp, pathname)
                        } else {
                            handleSuccess(ctx, item.sourceType || 'txt', result)
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
