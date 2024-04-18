import { F2EConfigResult } from "../interface";
import { MemoryTree } from "../memory-tree";
import logger from "../utils/logger";
import { MiddlewareEvents, MiddlewareCreater, MiddlewareReference, MiddlewareResult } from "./interface";
import { exit } from 'node:process';
import * as _ from '../utils/misc';

export const combineMiddleware = (conf: F2EConfigResult, middlewares: (MiddlewareCreater | MiddlewareReference)[]): Required<MiddlewareEvents> => {
    const { mode } = conf
    const beforeRoutes: Required<MiddlewareEvents>["beforeRoute"][] = []
    const onRoutes: Required<MiddlewareEvents>["onRoute"][] = []
    const buildWatchers: Required<MiddlewareEvents>["buildWatcher"][] = []
    const onSets: Required<MiddlewareEvents>["onSet"][] = []
    const onGets: Required<MiddlewareEvents>["onGet"][] = []
    const buildFilters: Required<MiddlewareEvents>["buildFilter"][] = []
    const watchFilters: Required<MiddlewareEvents>["watchFilter"][] = []
    const outputFilters: Required<MiddlewareEvents>["outputFilter"][] = []

    for (let i = 0; i < middlewares.length; i++) {
        const m = middlewares[i];
        let middle: MiddlewareResult | undefined = undefined;
        if ('middleware' in m) {
            const middlewareName = `f2e-middle-${m.middleware}`
            try {
                middle = require(middlewareName)(conf, m.options)
            } catch (e) {
                logger.error(e)
                exit(1)
            }
        }
        if (typeof m === 'function') {
            middle = m(conf)
        }
        if (middle && middle.mode.includes(mode)) {
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
        beforeRoute: async (pathname, req, resp, conf) => {
            for (let i = 0; i < beforeRoutes.length; i++) {
                // beforeRoute 返回 false 停止继续
                let res = await Promise.resolve(beforeRoutes[i](pathname, req, resp, conf))
                if (typeof res !== 'undefined') {
                    return res
                }
            }
        },
        onRoute: async (pathname, req, resp, body, memory) => {
            for (let i = 0; i < onRoutes.length; i++) {
                // onRoute 返回 false 停止继续
                let res = await Promise.resolve(onRoutes[i](pathname, req, resp, body, memory))
                if (typeof res !== 'undefined') {
                    return res
                }
            }
        },
        buildWatcher: (pathname, eventType, build, store) => {
            logger.debug(`${eventType}: ${pathname}`)
            buildWatchers.map(item => item(pathname, eventType, build, store))
        },
        onSet: async (pathname, data, store) => {
            let temp: MemoryTree.SetResult = { data, originPath: pathname, outputPath: pathname }
            for (let i = 0; i < onSets.length; i++) {
                let { data, outputPath } = await Promise.resolve(onSets[i](temp.outputPath, temp.data, store))
                Object.assign(temp, {
                    data, outputPath
                })
            }
            return temp
        },
        onGet: async (pathname, data, store) => {
            let temp = data
            for (let i = 0; i < onGets.length; i++) {
                let res = await Promise.resolve(onGets[i](pathname, temp || data, store))
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