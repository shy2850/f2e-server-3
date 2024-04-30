import { F2EConfigResult } from "../interface";
import { MemoryTree } from "../memory-tree";
import logger from "../utils/logger";
import { MiddlewareEvents, MiddlewareCreater, MiddlewareReference, MiddlewareResult } from "./interface";
import { exit } from 'node:process';
import * as _ from '../utils/misc';
import middleware_livereload from './livereload';
import middleware_tryfiles from './try_files';
import middleware_proxy from './proxy';
import middleware_esbuild from './esbuild';
import middleware_less from './less';
import middleware_auth from './auth';

export const combineMiddleware = (conf: F2EConfigResult, middlewares: (MiddlewareCreater | MiddlewareReference)[]): Required<MiddlewareEvents> => {
    const { mode } = conf
    const onMemoryLoads: Required<MiddlewareEvents>["onMemoryLoad"][] = []
    const onMemoryInits: Required<MiddlewareEvents>["onMemoryInit"][] = []
    const beforeRoutes: Required<MiddlewareEvents>["beforeRoute"][] = []
    const onRoutes: Required<MiddlewareEvents>["onRoute"][] = []
    const buildWatchers: Required<MiddlewareEvents>["buildWatcher"][] = []
    const onSets: Required<MiddlewareEvents>["onSet"][] = []
    const onGets: Required<MiddlewareEvents>["onGet"][] = []
    const buildFilters: Required<MiddlewareEvents>["buildFilter"][] = []
    const watchFilters: Required<MiddlewareEvents>["watchFilter"][] = []
    const outputFilters: Required<MiddlewareEvents>["outputFilter"][] = []

    /** 开始内置中间件加载 */
    middlewares.push(middleware_less)
    middlewares.push(middleware_esbuild)
    middlewares.push(middleware_proxy)
    middlewares.push(middleware_livereload)
    /** tryfiles 顺序需要在最后 */
    middlewares.push(middleware_tryfiles)

    middlewares.unshift(middleware_auth)
    for (let i = 0; i < middlewares.length; i++) {
        const m = middlewares[i];
        let middle: MiddlewareResult | undefined = undefined;
        if ('middleware' in m) {
            const middlewareName = `f2e-middle-${m.middleware}`
            try {
                middle = require(middlewareName)(conf, m.options)
                if (middle) {
                    middle.name = m.middleware
                }
            } catch (e) {
                logger.error(e)
                exit(1)
            }
        }
        if (typeof m === 'function') {
            middle = m(conf)
        }
        if (middle && middle.mode.includes(mode)) {
            middle.onMemoryInit && onMemoryInits.push(middle.onMemoryInit)
            middle.onMemoryLoad && onMemoryLoads.push(middle.onMemoryLoad)
            middle.beforeRoute && beforeRoutes.push(middle.beforeRoute)
            middle.onRoute && onRoutes.push(middle.onRoute)
            middle.buildWatcher && buildWatchers.push(middle.buildWatcher)
            middle.onSet && onSets.push(middle.onSet)
            middle.onGet && onGets.push(middle.onGet)
            middle.buildFilter && buildFilters.push(middle.buildFilter)
            middle.watchFilter && watchFilters.push(middle.watchFilter)
            middle.outputFilter && outputFilters.push(middle.outputFilter)
        }
    }
    return {
        onMemoryInit: async (store) => {
            await Promise.all(onMemoryInits.map(fn => fn?.(store)))
        },
        onMemoryLoad: async (store) => {
            await Promise.all(onMemoryLoads.map(fn => fn?.(store)))
        },
        beforeRoute: async (pathname, ctx) => {
            let _pathname = pathname
            for (let i = 0; i < beforeRoutes.length; i++) {
                // beforeRoute 返回 false 停止继续
                let res = await beforeRoutes[i](pathname, ctx)
                if (res === false) {
                    return res
                }
                if (typeof res === 'string') {
                    _pathname = res
                }
            }
            return _pathname
        },
        onRoute: async (pathname, ctx) => {
            let _pathname = pathname
            for (let i = 0; i < onRoutes.length; i++) {
                // onRoute 返回 false 停止继续
                let res = await onRoutes[i](_pathname, ctx)
                if (res === false) {
                    return false
                }
                if (typeof res === 'string') {
                    _pathname = res
                }
            }
            return _pathname
        },
        buildWatcher: (pathname, eventType, build, store) => {
            buildWatchers.map(item => item(pathname, eventType, build, store))
        },
        onSet: async (pathname, data, store) => {
            let result: MemoryTree.SetResult = { data, originPath: pathname, outputPath: pathname }
            for (let i = 0; i < onSets.length; i++) {
                const temp = await onSets[i](result.outputPath, result.data, store)
                result = Object.assign({}, result, temp)
            }
            return {
                ...result,
                originPath: pathname,
            }
        },
        onGet: async (pathname, data, store) => {
            let temp = data
            for (let i = 0; i < onGets.length; i++) {
                let res = await onGets[i](pathname, temp || data, store)
                temp = res || temp
            }
            return temp
        },
        watchFilter: (pathname) => {
            for (let i = 0; i < watchFilters.length; i++) {
                let allow = watchFilters[i](pathname)
                if (allow === false) {
                    return false
                }
            }
            return true
        },
        buildFilter: (pathname) => {
            for (let i = 0; i < buildFilters.length; i++) {
                let allow = buildFilters[i](pathname)
                if (allow === false) {
                    return false
                }
            }
            return true
        },
        outputFilter: (pathname, data) => {
            for (let i = 0; i < outputFilters.length; i++) {
                let allow = outputFilters[i](pathname, data)
                if (allow === false) {
                    return false
                }
            }
            return true
        }
    }
}