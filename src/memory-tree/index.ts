import { MemoryTree } from "./interface"
import * as _ from '../utils/misc'
import { defaultOptions } from './defaults'
import { inputProvider, beginWatch } from "./input"
import { outputProvider } from "./output"
import path from 'node:path'
import url from 'node:url'
import { createHash } from "node:crypto"
import logger from "../utils/logger"

export * from "./interface"
export * from "./defaults"


const inEntries = (entries: string[] = [], pathname: string) => {
    return entries.find(item => new RegExp(item).test(pathname))
}
export const createStore = function (options: Pick<MemoryTree.Options, 'onGet'|'namehash'|'watch'>): MemoryTree.Store {
    const { onGet, namehash, watch } = options
    let o = {}
    const origin_map = new Map<string, MemoryTree.SetResult>()
    const store: MemoryTree.Store = {
        ignores: new Set(),
        origin_map,
        _get(pathname) {
            const arr = _.pathname_arr(pathname)
            return arr.length ? _.get(o, arr) : o
        },
        async load (_pathname) {
            const pathname = _.pathname_fixer(_pathname)
            let result = await onGet(pathname, store._get(pathname), store)
            if (result && namehash && namehash.entries && namehash.searchValue) {
                if (inEntries(namehash.entries, pathname)) {
                    const searchValues = namehash.searchValue.map(t => new RegExp(t, 'g'))
                    result = result.toString()
                    for (let i = 0; i < searchValues.length; i++) {
                        const searchValue = searchValues[i]
                        const replacer = (mat: string, src: string) => {
                            const key = _.pathname_fixer('/' === src.charAt(0) ? src : path.join(path.dirname(pathname), src))
                            const out = origin_map.get(key)
                            if (!out) return mat
                            const targetSrc = (namehash.publicPath || '/') + out.outputPath.replace(/^\/+/, '')
                            return mat.replace(src,  targetSrc + (watch ? `" data-origin="${key}" data-hash="${out.hash}"` : ''))
                        }
                        result = result.replace(searchValue, replacer)
                    }
                }
            }
            return result
        },
        save(result) {
            // outputPath 需要携带根路径 /
            if (namehash && (Buffer.isBuffer(result.data) || typeof result.data === 'string')) {
                const hash = createHash('md5').update(result.data).digest('hex').slice(0, 8)
                result.hash = hash
                if (namehash.replacer) {
                    if (!inEntries(namehash?.entries, result.originPath)) {
                        result.outputPath = namehash.replacer(_.pathname_fixer(result.outputPath || result.originPath), hash) || result.outputPath
                    } else if (namehash.searchValue && watch) {
                        const searchValues = namehash.searchValue.map(t => new RegExp(t, 'g'))
                        const context = result.data.toString()
                        const deps: string[] = []
                        for (let i = 0; i < searchValues.length; i++) {
                            const searchValue = searchValues[i]
                            context.replace(searchValue, (mat: string, src: string) => {
                                const key = _.pathname_fixer('/' === src.charAt(0) ? src : path.join(path.dirname(result.originPath), src))
                                deps.push(key)
                                return mat
                            })
                        }
                        result.deps = deps
                    }
                }
            }
            result.updateTime = + new Date()
            origin_map.set(result.originPath, result)
            _.set(o, _.pathname_fixer(result.outputPath), result.data )
            if(!_.isPlainObject(result.data)) {
                logger.debug(`save ${result.originPath} -> ${result.outputPath}`)
            }
        },
    }
    return store
}

export const createMemoryTree = (options: Partial<MemoryTree.Options>): MemoryTree.MemoryTree => {
    const _options: MemoryTree.Options = {
        ...defaultOptions,
        ...(options || {}),
    }
    const { onGet, namehash, watch } = _options
    const store = createStore({ onGet, namehash, watch })
    const build = inputProvider(_options, store)
    return {
        store,
        input: build,
        output: outputProvider(_options, store),
        watch: beginWatch(_options, store, build),
    }
}

export default createMemoryTree
