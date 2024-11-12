import { logger, pathname_fixer } from '../../utils'
import { Route, RouteItem } from '../../routes'
import { APIContext } from '../../interface'
import { MiddlewareCreater } from '../interface'
import { RouterParam } from './interfaces'

const routes: RouteItem[] = []

export interface RouterContext<T extends string = string> extends APIContext {
    params: { [k in T]: string }
}
export const addRoute = function <T extends string> (
    path: T,
    handler: RouteItem<any, any, { params: RouterParam<T> }>['handler'],
    ext?: Omit<RouteItem, 'path' | 'handler'>
) {
    if (typeof handler === 'function') {
        logger.debug(`add route ${path} ${ext?.method || '*'}`)
        const reg = new RegExp(pathname_fixer(path).replace(/:(\w+)/g, '(?<$1>[^/]+)'))
        routes.push({
            method: '*',
            ...(ext || {}),
            path: reg,
            handler: function (body, ctx) {
                return handler(body, {
                    ...ctx,
                    params: (reg.exec(ctx.pathname)?.groups || {}) as RouterParam<T>
                })
            },
        })
    }
}
/**
 * 路由装饰器 
 */
export const RouterDecorator = function (path: string, ext?: Omit<RouteItem, 'path' | 'handler'>) {
    return function (...args: any) {
        const [_, __, descriptor] = args
        if (typeof descriptor.value === 'function') {
            addRoute(path, descriptor.value, ext)
        }
        return descriptor
    }
}

const middleware_routes: MiddlewareCreater = {
    mode: ['dev', 'prod'],
    name: 'routes',
    execute: async (conf) => {
        const route = new Route(conf)
        route.routes = routes
        return {
            onRoute: function (...args) {
                return route.execute.apply(route, args)
            },
        }
    }
}

export default middleware_routes
