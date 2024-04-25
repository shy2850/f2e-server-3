import { MemoryTree } from "./interface"
import * as _ from '../utils/misc'
import { defaultOptions } from './defaults'
import { inputProvider, beginWatch } from "./input"
import { outputProvider } from "./output"
import path from 'node:path'
import { createHash } from "node:crypto"
import logger from "../utils/logger"

export * from "./interface"
export * from "./defaults"


const inEntries = (entries: string[] = [], pathname: string) => {
    return entries.find(item => new RegExp(item).test(pathname))
}
export const createStore = function (options: Pick<MemoryTree.Options, 'onGet'|'namehash'>): MemoryTree.Store {
    const { onGet, namehash } = options
    let o = {}
    const origin_map = new Map<string, MemoryTree.SetResult>()
    const output_map = new Map<string, MemoryTree.SetResult>()
    const store: MemoryTree.Store = {
        origin_map,
        output_map,
        _get(pathname) {
            const arr = _.pathname_arr(pathname)
            return arr.length ? _.get(o, arr) : o
        },
        async load (pathname) {
            let result = await onGet(pathname, store._get(pathname), store)
            if (result && namehash && namehash.entries && namehash.searchValue && namehash.replacer) {
                const o = output_map.get(pathname)
                if (o && inEntries(namehash.entries, o.originPath)) {
                    const searchValues = namehash.searchValue.map(t => new RegExp(t, 'g'))
                    result = result.toString()
                    for (let i = 0; i < searchValues.length; i++) {
                        const searchValue = searchValues[i]
                        const replacer = (mat: string, src: string) => {
                            const key = _.pathname_fixer('/' === src.charAt(0) ? src : path.join(path.dirname(pathname), src))
                            const out = origin_map.get(key)
                            return out ? mat.replace(src, out.outputPath) : mat
                        }
                        result = result.replace(searchValue, replacer)
                    }
                }
            }
            return result
        },
        save(result) {
            // outputPath 需要携带根路径 /
            let outputPath = _.pathname_fixer(result.outputPath || result.originPath)
            result.outputPath = '/' + outputPath
            if (namehash && (Buffer.isBuffer(result.data) || typeof result.data === 'string')) {
                const hash = createHash('md5').update(result.data).digest('hex').slice(0, 8)
                result.hash = hash
                if (namehash.replacer && !inEntries(namehash?.entries, result.originPath)) {
                    result.outputPath = namehash.replacer(outputPath, hash) || result.outputPath
                    outputPath = _.pathname_fixer(result.outputPath.split(/[!#*?=]+/)[0])
                }
            }
            origin_map.set(result.originPath, result)
            output_map.set(outputPath, result)

            if (outputPath) {
                _.set(o, outputPath, result.data)
            }
        },
        _reset() {
            o = {}
            origin_map.clear()
            output_map.clear()
        }
    }
    return store
}

export const createMemoryTree = (options: Partial<MemoryTree.Options>): MemoryTree.MemoryTree => {
    const _options: MemoryTree.Options = {
        ...defaultOptions,
        ...(options || {}),
    }
    const { onGet, namehash } = _options
    const store = createStore({ onGet, namehash })
    const build = inputProvider(_options, store)
    return {
        store,
        input: build,
        output: outputProvider(_options, store),
        watch: beginWatch(_options, store, build),
    }
}

export default createMemoryTree
