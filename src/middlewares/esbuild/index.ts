import { MiddlewareCreater } from "../interface";
import * as path from 'node:path'
import * as fs from 'node:fs'
import logger from "../../utils/logger";
import { exit } from "node:process";
import * as _ from '../../utils/misc'
import { MemoryTree } from "../../memory-tree/interface";
import type { BuildOptions } from 'esbuild'
import { save } from './store'
import { GLOBAL_NAME, LIB_FILE_NAME, external_build } from "./external_build";

const middleware_esbuild: MiddlewareCreater = {
    name: 'esbuild',
    mode: ['dev', 'build'],
    execute: (conf) => {
        const { root, esbuild: esbuildConfig, mode } = conf
        // prod 模式下不加载esbuild
        if (!esbuildConfig) {
            return
        }
        const conf_path = path.join(root, esbuildConfig.esbuildrc)
    
        // 使用默认配置，检查配置文件是否存在，不存在时，中间件失效
        if (!fs.existsSync(conf_path)) {
            logger.debug(`[esbuild] esbuildrc: ${conf_path} not found, esbuild middleware disabled`)
            return
        }
        try {
            require(conf_path)
        } catch (e) {
            logger.error(`[esbuild] esbuildrc: ${conf_path} is not valid:`, e)
            exit(1)
        }
    
        try {
            // 检查esbuild依赖
            require('esbuild')
        } catch (e) {
            logger.error(`[esbuild] esbuild not found, esbuild middleware disabled`)
            exit(1)
        }
    
        const builder: typeof import('esbuild') = require('esbuild')
        const esbuildOptions: BuildOptions[] = [].concat(require(conf_path))
        const commonOptions: BuildOptions = {
            write: false,
            metafile: true,
            minify: mode === 'build',
            sourcemap: true,
        }
        const origin_map = new Map<string, {
            index: number;
            with_libs: boolean;
            rebuilds: Set<{(): Promise<void>}>;
        }>()
        const build_origin_map = function ({
            index,
            inputs,
            rebuild,
            store,
            with_libs,
        }: {
            index: number;
            inputs: {[path: string]: any};
            rebuild?: {(): Promise<void>};
            store: MemoryTree.Store;
            with_libs: boolean;
        }) {
            if (!inputs) return
            Object.keys(inputs || {}).forEach(_inputPath => {
                const inputPath = _.pathname_fixer(_inputPath)
                const found = origin_map.get(inputPath) || {
                    index,
                    with_libs,
                    rebuilds: new Set(),
                }
                if (rebuild) {
                    found.rebuilds.add(rebuild)
                }
                origin_map.set(inputPath, found)
                store.ignores.add(inputPath)
            })
        }
    
        const build = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const _option = esbuildOptions[i];
                const option = { ..._option, ...commonOptions, 
                    banner: _option.external ? {
                        js: `require = ${GLOBAL_NAME} && ${GLOBAL_NAME}.require;`,
                    } : _option.banner,
                }
                await external_build({conf, store, option, index: i})
                const result = await builder.build(option)
                if (result?.metafile?.inputs) {
                    build_origin_map({
                        index: i,
                        inputs: result?.metafile?.inputs,
                        store,
                        with_libs: esbuildConfig.build_external && (!!option.external && option.external?.length > 0),
                    })
                }
                await save({ store, result, conf })
            }
        }
    
        const watch = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const _option = esbuildOptions[i];
                const option = { ..._option, ...commonOptions, 
                    banner: _option.external ? {
                        js: `require = ${GLOBAL_NAME} && ${GLOBAL_NAME}.require;`,
                    } : _option.banner,
                }
                await external_build({conf, store, option, index: i})
                const ctx = await builder.context(option)
                const rebuild = (function (index) {
                    return async function () {
                        const result = await ctx.rebuild()
                        if (result?.metafile?.inputs) {
                            build_origin_map({
                                index: i,
                                inputs: result?.metafile?.inputs,
                                rebuild,
                                store,
                                with_libs: esbuildConfig.build_external && (!!option.external && option.external?.length > 0),
                            })
                        }
                        logger.debug(
                            `[esbuild] ${JSON.stringify(option.entryPoints)} rebuild`,
                            // [...origin_map.keys()].filter(k => !k.includes('node_modules'))
                        )
                        await save({ store, result, conf })
                    }
                })(i)
                const result = await ctx.rebuild()
                if (result?.metafile?.inputs) {
                    build_origin_map({
                        index: i,
                        inputs: result?.metafile?.inputs,
                        rebuild,
                        store,
                        with_libs: esbuildConfig.build_external && (!!option.external && option.external?.length > 0),
                    })
                }
                await save({ store, result, conf })
            }
        }
    
        return {
            async onMemoryInit (store) {
                return mode === 'dev' ? await watch(store) : await build(store)
            },
            async onSet(pathname, data, store) {
                const { reg_inject = /index\.html?$/, reg_replacer, cache_root = '.f2e_cache' } = esbuildConfig
                const result = {
                    originPath: pathname,
                    outputPath: pathname,
                    data,
                }
                if (reg_inject.test(pathname) && data) {
                    result.data = data.toString()
                    // 原来正则在某些情况下会导致v8(node和chrome)卡死，JavaScriptCore(bun和safari)不会，所以这里用简单正则替换
                    .replace(reg_replacer || /<script\s.*?src="(.*?)".*?>\s*<\/script\>/g, function (___, src) {
                        const key = _.pathname_fixer('/' === src.charAt(0) ? src : path.join(path.dirname(pathname), src))
                        const item = origin_map.get(key)
                        if (item && item.with_libs) {
                            const sourcefile = _.template(LIB_FILE_NAME, { index: item.index })
                            const originPath = `${cache_root}/${sourcefile}`
                            return `<script src="/${originPath}"></script>\n${___}`
                        } else {
                            return ___
                        }
                    })
                }
                return result
            },
            async buildWatcher(pathname, eventType, build, store) {
                const item = origin_map.get(pathname)
                if (item && item.rebuilds.size > 0) {
                    for (const rebuild of item.rebuilds) {
                        await rebuild()
                    }
                }
            },
        }
    }
}

export default middleware_esbuild