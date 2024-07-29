import { BuildOptions, BuildResult } from "esbuild"
import { MemoryTree } from "../../memory-tree/interface"
import { F2EConfigResult } from "../../interface"
import * as path from 'node:path'
import * as _ from '../../utils/misc'
import { build_external_file, default_config, generate_banner_code, generate_externals_code, generate_filename, generate_inject_code } from "./utils"
import { logger } from "../../utils"

export interface SaveParams {
    store: MemoryTree.Store
    result: BuildResult
    conf: F2EConfigResult
}

export const save = async function (params: SaveParams) {
    const { store, result, conf } = params
    const { root, esbuild } = conf
    if (!esbuild) return
    const with_metafile = esbuild.with_metafile
    const { outputFiles = [], metafile } = result
    
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
                originPath: outputPath + '.json',
                outputPath: outputPath + '.json',
                data: JSON.stringify(metafile, null, 2)
            })
        }
    }
}

export interface BuildExternalOptions {
    conf: F2EConfigResult;
    store: MemoryTree.Store;
    option: BuildOptions;
    index: number;
}
export const external_build = async function ({
    conf,
    store,
    option,
    index,
}: BuildExternalOptions) {
    const { external = [], ..._option } = option
    if (external.length === 0 || !conf.esbuild || !conf.esbuild.build_external) {
        return
    }
    const {
        cache_root = default_config.cache_root,
        inject_global_name = default_config.inject_global_name,
        external_lib_name = default_config.external_lib_name,
    } = conf.esbuild

    const filename = generate_filename(external_lib_name, index)
    build_external_file({
        filename,
        conf: conf.esbuild,
        modules: external,
        index,
    })
    const builder: typeof import('esbuild') = require('esbuild')
    const result = await builder.build({
        ..._option,
        entryPoints: [cache_root + '/' + filename],
        banner: {
            'js': generate_inject_code(inject_global_name, index),
        },
    })
    await save({ store, result, conf })
}
export interface OriginInfo {
    index: number;
    with_libs: boolean;
    hot_modules: string[];
    rebuilds: Set<{(): Promise<void>}>;
}
export const origin_map = new Map<string, OriginInfo>()
export const build_origin_map = function ({
    index,
    inputs,
    rebuild,
    store,
    with_libs,
    hot_modules = [],
}: {
    index: number;
    inputs: {[path: string]: any};
    rebuild?: {(): Promise<void>};
    store: MemoryTree.Store;
    with_libs: boolean;
    hot_modules: string[];
}) {
    if (!inputs) return
    Object.keys(inputs || {}).forEach(_inputPath => {
        const inputPath = _.pathname_fixer(_inputPath)
        const found = origin_map.get(inputPath) || {
            index,
            with_libs,
            hot_modules,
            rebuilds: new Set(),
        }
        if (rebuild) {
            found.rebuilds.add(rebuild)
        }
        origin_map.set(inputPath, found)
        store.ignores.add(inputPath)
    })
}
export interface BuildIntoStoreOptions {
    store: MemoryTree.Store;
    _option: BuildOptions;
    hot_modules?: string[];
    conf: F2EConfigResult;
    index: number;
}
export const build_option = async ({
    store,
    _option,
    conf,
    index,
}: BuildIntoStoreOptions) => {
    if (!conf.esbuild) return
    const { mode, esbuild: {
        build_external = default_config.build_external,
        inject_global_name = default_config.inject_global_name,
    } } = conf

    const option = {
        write: false,
        metafile: true,
        sourcemap: true,
        ..._option,
        minify: mode === 'build',
    }
    const builder: typeof import('esbuild') = require('esbuild')
    const with_libs = build_external && option.format === 'iife' && (!!option.external && option.external?.length > 0)

    if (with_libs) {
        await external_build({conf, store, option, index})
    }
    const result = await builder.build({
        ...option,
        banner: {
            ...(option.banner || {}),
            js: `${option.banner?.js || ''}${generate_banner_code(inject_global_name, index)}`
        },
    })
    if (result?.metafile?.inputs) {
        build_origin_map({
            index,
            inputs: result?.metafile?.inputs,
            store,
            with_libs,
            // build 模式下, 不会重新构建, 所以 hot_modules 为空
            hot_modules: [],
        })
    }
    await save({ store, result, conf })
}

export const watch_option = async ({
    store,
    _option,
    hot_modules = [],
    conf,
    index,
}: Required<BuildIntoStoreOptions>) => {
    if (!conf.esbuild) return
    const { mode, esbuild: {
        build_external = default_config.build_external,
        inject_global_name = default_config.inject_global_name,
    } } = conf

    const option = {
        write: false,
        metafile: true,
        sourcemap: true,
        ..._option,
        minify: mode === 'build',
    }
    const builder: typeof import('esbuild') = require('esbuild')
    const with_libs = build_external && option.format === 'iife' && (!!option.external && option.external?.length > 0)
    if (with_libs) {
        await external_build({conf, store, option, index})
    }
    const ctx = await builder.context({
        ...option,
        external: hot_modules.concat(option.external || []),
        banner: {
            ...(option.banner || {}),
            js: `${option.banner?.js || ''}${generate_banner_code(inject_global_name, index)}`
        }
    })
    const rebuild = async function rebuild () {
        const result = await ctx.rebuild()
        if (result?.metafile?.inputs) {
            build_origin_map({
                index,
                inputs: result?.metafile?.inputs,
                rebuild,
                store,
                with_libs,
                hot_modules,
            })
        }
        logger.debug(
            `[esbuild] ${JSON.stringify(option.entryPoints)} rebuild`,
            // [...origin_map.keys()].filter(k => !k.includes('node_modules'))
        )
        await save({ store, result, conf })
    }
    const result = await ctx.rebuild()
    if (result?.metafile?.inputs) {
        build_origin_map({
            index,
            inputs: result?.metafile?.inputs,
            rebuild,
            store,
            with_libs,
            hot_modules,
        })
    }
    await save({ store, result, conf })
}