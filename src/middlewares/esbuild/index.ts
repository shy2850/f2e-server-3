import { MiddlewareCreater } from "../interface";
import * as path from 'node:path'
import * as fs from 'node:fs'
import logger from "../../utils/logger";
import { exit } from "node:process";
import * as _ from '../../utils/misc'
import { MemoryTree } from "../../memory-tree/interface";
import type { BuildOptions, BuildResult } from 'esbuild'

const middleware_esbuild: MiddlewareCreater = (conf) => {
    const { root, esbuild: esbuildConfig, mode } = conf
    // prod 模式下不加载esbuild
    if (mode === 'prod' || !esbuildConfig) {
        return
    }
    const { esbuildrc, build_external, with_metafile } = esbuildConfig
    const conf_path = path.join(root, esbuildrc)

    // 使用默认配置，检查配置文件是否存在，不存在时，中间件失效
    if (!fs.existsSync(conf_path)) {
        logger.debug(`[esbuild] esbuildrc: ${conf_path} not found, esbuild middleware disabled`)
        return
    }
    try {
        require(conf_path)
    } catch (e) {
        logger.error(`[esbuild] esbuildrc: ${conf_path} is not a valid json file`)
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
    const rebuilder_map = new Map<string, Set<{(): Promise<void>}>>()

    const save = async function (store: MemoryTree.Store, result: BuildResult, build_external: boolean, rebuild?: {(): Promise<void>}) {
        const { outputFiles = [], metafile } = result
        /** 编译external启动加载一次 */
        if (build_external) {
            // TODO
        }
        /** 设置编译依赖 */
        if (metafile && rebuild) {
            const { inputs } = metafile
            Object.keys(inputs).forEach(inputPath => {
                const found = rebuilder_map.get(inputPath) || new Set()
                found.add(rebuild)
                rebuilder_map.set(inputPath, found)
            })
        }
        for (const outputFile of outputFiles) {
            const outputPath = _.pathname_fixer(path.relative(root, outputFile.path))
            const meta = metafile?.outputs?.[outputPath]
            const originPath = meta?.entryPoint || outputPath
            store.save({
                data: outputFile.text,
                originPath,
                outputPath,
            })
            /** js文件索引meta信息 */
            if ( with_metafile && metafile && /\.js$/.test(outputPath)) {
                store.save({
                    originPath: originPath + '.meta',
                    outputPath: outputPath + '.json',
                    data: JSON.stringify(metafile, null, 2)
                })
            }
        }
    }
    const build = async function (store: MemoryTree.Store) {
        for (let i = 0; i < esbuildOptions.length; i++) {
            const option = esbuildOptions[i];
            const result = await builder.build({
                write: false,
                minify: true,
                metafile: true,
                ...option,
            })
            if (!result) {
                logger.error('[f2e] build error')
                exit(1)
            }
            await save(store, result, build_external && (option.external || []).length > 0)
        }
    }

    const watch = async function (store: MemoryTree.Store) {
        for (let i = 0; i < esbuildOptions.length; i++) {
            const option = esbuildOptions[i];
            const ctx = await builder.context({
                write: false,
                minify: false,
                metafile: true,
                ...option,
            })
            const rebuild = async function rebuild() {
                const result = await ctx.rebuild()
                logger.debug(`[esbuild] ${JSON.stringify(option.entryPoints)} rebuild`)
                await save(store, result, false)
            }
            const result = await ctx.rebuild()
            await save(store, result, build_external && (option.external || []).length > 0, rebuild)
        }
    }
    return {
        name: 'esbuild',
        mode: ['dev', 'build'],
        onMemoryLoad: async (store) => {
            return mode === 'dev' ? watch(store) : build(store)
        },
        async buildWatcher(pathname, eventType, build, store) {
            const builders = rebuilder_map.get(pathname)
            if (builders && builders.size > 0) {
                for (const rebuild of builders) {
                    await rebuild()
                }
            }
        },
    }
}

export default middleware_esbuild