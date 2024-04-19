import { MemoryTree } from "./interface"
import * as _ from '../utils/misc'
import { defaultOptions } from './defaults'
import { inputProviderWithWatcher } from "./input"
import { outputProvider } from "./output"
import path from 'node:path'

export * from "./interface"
export * from "./defaults"

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
                if (o && namehash.entries.find(item => new RegExp(item).test(o.originPath))) {
                    const searchValues = namehash.searchValue.map(t => new RegExp(t, 'g'))
                    result = result.toString()
                    for (let i = 0; i < searchValues.length; i++) {
                        const searchValue = searchValues[i]
                        const replacer = (mat: string, a: string) => {
                            const p = _.pathname_fixer(path.join(path.dirname(pathname), a))
                            const out = origin_map.get(p)
                            return out ? mat.replace(a, out.outputPath) : mat
                        }
                        result = result.replace(searchValue, replacer)
                    }
                }
            }
            return result
        },
        _set(pathname, value) {
            const arr = _.pathname_arr(pathname)
            if (arr.length) {
                _.set(o, _.pathname_fixer(pathname), value)
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
    return {
        store,
        input: inputProviderWithWatcher(_options, store),
        output: outputProvider(_options, store)
    }
}

export default createMemoryTree
