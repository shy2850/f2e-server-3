import { MemoryTree } from "./interface"
import * as _ from '../utils/misc'
import { defaultOptions } from './defaults'
import { inputProviderWithWatcher } from "./input"
import { outputProvider } from "./output"

export * from "./interface"
export * from "./defaults"

export const createStore = function (onGet: MemoryTree.Options['onGet']): MemoryTree.Store {
    let o = {}
    const store: MemoryTree.Store = {
        hashmap: new Map(),
        _get(path) {
            const arr = _.pathname_arr(path)
            return arr.length ? _.get(o, arr) : o
        },
        load(path) {
            return onGet(path, store._get(path), store)
        },
        _set(path, value) {
            const arr = _.pathname_arr(path)
            if (arr.length) {
                _.set(o, _.pathname_fixer(path), value)
            }
        },
        _reset() {
            o = {}
        }
    }
    return store
}

export const createMemoryTree = (options: Partial<MemoryTree.Options>): MemoryTree.MemoryTree => {
    const _options: MemoryTree.Options = {
        ...defaultOptions,
        ...(options || {}),
    }
    const store = createStore(_options.onGet)
    return {
        store,
        input: inputProviderWithWatcher(_options, store),
        output: outputProvider(_options, store)
    }
}

export default createMemoryTree
