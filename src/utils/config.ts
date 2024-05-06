import { F2EConfig, F2EConfigResult } from "../interface";
import * as _ from "./misc"
import * as path from 'node:path'
import * as fs from 'node:fs'
import { MiddlewareCreater } from "../middlewares/interface";
import { combineMiddleware } from "../middlewares";
import { setMimeTypes } from "./mime";
import { page_404, page_500, page_dir } from "./templates";

let F2E_CONFIG_PATH = ''
export const F2E_CONFIG = '.f2econfig.js'
export const setConfigPath = (path: string) => F2E_CONFIG_PATH = path
const getConfig = (conf: F2EConfig = {}) => {
    let pathname = F2E_CONFIG_PATH.startsWith('/') ? F2E_CONFIG_PATH : path.join(process.cwd(), F2E_CONFIG)
    if (fs.existsSync(pathname)) {
        conf = {
            ...require(pathname),
            ...conf,
        }
    }
    if (conf.mimeTypes) setMimeTypes(conf.mimeTypes)
    return conf
}

/** 保留基础配置 */
export const getConfigResult = function (conf: F2EConfig = {}) {
    conf = getConfig(conf)
    const mode = conf.mode || "prod"
    const config: F2EConfigResult = {
        mode,
        port: conf.port || 2850,
        host: conf.host || '0.0.0.0',
        root: conf.root || process.cwd(),
        ssl: conf.ssl || false,
        gzip: conf.gzip || false,
        gzip_filter: conf.gzip_filter || function (pathname, size) { return _.isText(pathname) && size > 4096; },
        cache_filter: conf.cache_filter || function (pathname, size) { return !/\.html?$/.test(pathname) },
        watch: typeof conf.watch === 'boolean' ? conf.watch : mode === 'dev',
        onServerCreate: conf.onServerCreate || function (server) { return server; },
        namehash: {
            entries: ['\\.html$'],
            searchValue: ['\\s(?:src)="([^"]*?)"', '\\s(?:href)="([^"]*?)"'],
            replacer: (output, hash) => `/${output}?${hash}`,
            ...(conf.namehash || {})
        },
        mimeTypes: conf.mimeTypes || {},
        dest: conf.dest || path.join(process.cwd(), './output'),
        range_size: conf.range_size || 1024 * 1024 * 10,
        page_404: conf.page_404 || page_404,
        page_50x: conf.page_50x || page_500,
        page_dir: conf.page_dir || page_dir,

        // 以下为内置中间件相关配置
        try_files: conf.try_files || false,
        livereload: conf.livereload || (mode === 'dev' && {}) || false,
        proxies: conf.proxies || [],
        esbuild: conf.esbuild || (mode != 'prod' && {
            esbuildrc: '.esbuildrc.js',
            build_external: true,
            with_metafile: mode === 'dev',
        }) || false,
        less: conf.less || false,
        auth: conf.auth || false,
        alias: conf.alias || false,
    }
    return config;
}

/** 整理中间件配置 */
export const getConfigEvents = (conf: F2EConfig = {}) => {
    conf = getConfig(conf)
    const { buildFilter, watchFilter, outputFilter, onGet, onSet, onRoute, beforeRoute, buildWatcher, middlewares = [] } = conf
    const middlewareBase: MiddlewareCreater = {
        name: "system",
        mode: ["dev", "build", "prod"],
        execute: () => {
            return {
                buildFilter, watchFilter, outputFilter, onGet, onSet, onRoute, beforeRoute, buildWatcher,
            }
        }
    }
    return combineMiddleware(getConfigResult(conf), [middlewareBase, ...middlewares])
}