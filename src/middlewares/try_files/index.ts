import { MiddlewareCreater } from "../interface";
import * as _ from '../../utils/misc'
import { TryFilesItem } from "./interface";
import { commonWriteHeaders } from "../../utils/resp";

const middleware_tryfiles: MiddlewareCreater = {
    name: 'try_files',
    mode: ['dev', 'prod'],
    execute: (conf) => {
        const { try_files } = conf
        if (!try_files) {
            return
        }
    
        let tries: TryFilesItem[] = []
        if (Array.isArray(try_files)) {
            tries = try_files.map(item => {
                if (typeof item === 'string') {
                    return {
                        test: /.*/,
                        index: item
                    }
                } else {
                    return item
                }
            })
        } else if (typeof try_files === 'string') {
            tries.push({
                test: /.*/,
                index: try_files
            })
        } else {
            tries.push(try_files)
        }
    
        return {
            onRoute: async (pathname, ctx) => {
                const {req, resp, store} = ctx
                let data = store?._get(pathname)
                /** 没有数据才进行try_files */
                if (typeof data === 'string' || data instanceof Buffer) {
                    return pathname
                }
                for (let i = 0; i < tries.length; i++) {
                    const item = tries[i]
                    if (item.test.test(pathname)) {
                        let p = pathname
                        // 为了通过ts检查，这里分开写
                        if (typeof item.replacer === 'string') {
                            p = pathname.replace(item.test, item.replacer)
                        } else if (item.replacer instanceof Function) {
                            p = pathname.replace(item.test, item.replacer)
                        }
                        let data = store?._get(store.origin_map.get(p)?.outputPath || p)
                        if (_.isPlainObject(data) && 'index' in item) {
                            p = typeof item.index === 'string' ? item.index : item.index(p, ctx)
                            data = store?._get(store.origin_map.get(p)?.outputPath || p)
                        }
                        if (typeof data !== 'undefined') {
                            return p
                        } else if ('location' in item) {
                            let location = typeof item.location === 'string' ? item.location : item.location(pathname, ctx)
                            resp.cork(() => {
                                resp.writeStatus('302 Found')
                                commonWriteHeaders(resp, {
                                    'Location': location,
                                })
                                resp.end()
                            })
                            return false
                        } else {
                            return typeof item.index === 'string' ? item.index : item.index(pathname, ctx)
                        }
                    }
                }
            }
        }
    }
}

export default middleware_tryfiles