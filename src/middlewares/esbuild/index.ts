import { MiddlewareCreater } from "../interface";
import * as path from 'node:path'
import * as fs from 'node:fs'
import logger from "../../utils/logger";
import { exit } from "node:process";
import * as _ from '../../utils/misc'
import { MemoryTree } from "../../memory-tree/interface";
import type { BuildOptions } from 'esbuild'
import { build_option, origin_map, watch_option } from './store'
import { build_external_file, default_config, generate_filename } from "./utils";
import { dynamicImport } from "../../utils";

const middleware_esbuild: MiddlewareCreater = {
    name: 'esbuild',
    mode: ['dev', 'build'],
    execute: (conf) => {
        const { root, esbuild: esbuildConfig, mode } = conf
        // prod 模式下不加载esbuild
        if (!esbuildConfig) {
            return
        }
        const {
            esbuildrc = default_config.esbuildrc,
            external_lib_name = default_config.external_lib_name,
            reg_inject = default_config.reg_inject,
            reg_replacer = default_config.reg_replacer,
            cache_root = default_config.cache_root,
        } = esbuildConfig
        const conf_path = path.join(root, esbuildrc )
    
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
    
        // 检查esbuild依赖
        dynamicImport('esbuild').catch(e => {
            logger.error(`[esbuild] esbuild not found, esbuild middleware disabled`)
            exit(1)
        })

        const esbuildOptions: (BuildOptions & { hot_modules?: string[] })[] = [].concat(require(conf_path))
        const build = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const option = esbuildOptions[i]
                delete option.hot_modules
                await build_option({
                    store, conf, index: i, _option: option,
                })
            }
        }
    
        const watch = async function (store: MemoryTree.Store) {
            for (let i = 0; i < esbuildOptions.length; i++) {
                const option = esbuildOptions[i]
                const hot_modules = option.hot_modules || []
                delete option.hot_modules
                for (let j = 0; j < hot_modules.length; j++) {
                    const moduleId = hot_modules[j];
                    const filename = generate_filename(external_lib_name, moduleId.replace(/[\\\/]/g, '_'));
                    build_external_file({
                        filename,
                        conf: esbuildConfig,
                        modules: [moduleId],
                        index: i,
                    })
                    await watch_option({
                        store, hot_modules: [], conf, index: i, _option: {
                            ...option,
                            entryPoints: [ cache_root + '/' + filename],
                        },
                    })
                }
                await watch_option({
                    store, hot_modules, conf, index: i, _option: option,
                })
            }
        }
    
        return {
            async onMemoryInit (store) {
                return mode === 'dev' ? await watch(store) : await build(store)
            },
            async onSet(pathname, data, store) {
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
                        let scripts: string[] = []
                        if (item) {
                            if (item.with_libs) {
                                const sourcefile = generate_filename(external_lib_name, item.index)
                                scripts.push(`<script src="/${cache_root}/${sourcefile}"></script>\n`)
                            }
                            item.hot_modules?.forEach(moduleId => {
                                const sourcefile = generate_filename(external_lib_name, moduleId.replace(/[\\\/]/g, '_'));
                                scripts.push(`<script data-module="${moduleId}" src="/${cache_root}/${sourcefile}"></script>\n`)
                            })
                        }
                        return scripts.join('') + ___
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