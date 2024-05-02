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
            banner: {
                js: `require = ${GLOBAL_NAME} && ${GLOBAL_NAME}.require;`,
            },
        }
        const origin_map = new Map<string, {
            index: number;
            with_libs: boolean;
            rebuilds: Set<{(): Promise<void>}>;
        }>()
    
        const build = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const _option = esbuildOptions[i];
                const option = { ..._option, ...commonOptions, }
                await external_build({conf, store, option, index: i})
                const result = await builder.build(option)
                Object.keys(result?.metafile?.inputs || {}).forEach(_inputPath => {
                    const inputPath = _.pathname_fixer(_inputPath)
                    const found = origin_map.get(inputPath) || {
                        index: i,
                        with_libs: esbuildConfig.build_external && (!!option.external && option.external?.length > 0),
                        rebuilds: new Set(),
                    }
                    origin_map.set(inputPath, found)
                    store.ignores.add(inputPath)
                })
                await save({ store, result, conf })
            }
        }
    
        const watch = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const _option = esbuildOptions[i];
                const option = { ..._option, ...commonOptions, }
                await external_build({conf, store, option, index: i})
                const ctx = await builder.context(option)
                const rebuild = async function rebuild() {
                    const result = await ctx.rebuild()
                    logger.debug(`[esbuild] ${JSON.stringify(option.entryPoints)} rebuild`)
                    await save({ store, result, conf })
                }
                const result = await ctx.rebuild()
                Object.keys(result?.metafile?.inputs || {}).forEach(_inputPath => {
                    const inputPath = _.pathname_fixer(_inputPath)
                    const found = origin_map.get(inputPath) || {
                        index: i,
                        with_libs: esbuildConfig.build_external && (!!option.external && option.external?.length > 0),
                        rebuilds: new Set(),
                    }
                    found.rebuilds.add(rebuild)
                    origin_map.set(inputPath, found)
                    store.ignores.add(inputPath)
                })
                await save({ store, result, conf })
            }
        }
    
        return {
            async onMemoryInit (store) {
                return mode === 'dev' ? await watch(store) : await build(store)
            },
            async onSet(pathname, data, store) {
                const { reg_inject = /index\.html?$/, cache_root = '.f2e_cache' } = esbuildConfig
                const result = {
                    originPath: pathname,
                    outputPath: pathname,
                    data,
                }
                if (reg_inject.test(pathname) && data) {
                    result.data = data.toString()
                    .replace(/<script(?:(?:\s|.)+?)src=[\"\'](.+?)[\"\'](?!\<)(?:(?:\s|.)*?)(?:(?:\/\>)|(?:\>\s*?\<\/script\>))/g, function (___, src) {
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