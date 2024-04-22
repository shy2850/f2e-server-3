import { MiddlewareCreater } from "../interface";
import * as _ from '../../utils/misc'
import { TryFilesItem } from "./interface";

const middleware_tryfiles: MiddlewareCreater = (conf) => {
    const { try_files } = conf

    if (!try_files) {
        return
    }

    let tries: TryFilesItem[] = []
    if (typeof try_files === 'string') {
        tries.push({
            test: /.*/,
            index: try_files
        })
    } else if (Array.isArray(try_files)) {
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
    }
    return {
        name: 'try_files',
        mode: ['dev', 'prod'],
        onRoute: async (pathname, req, resp, store) => {
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
                    let data = store?._get(p)
                    if (_.isPlainObject(data) && 'index' in item) {
                        p += '/' + item.index
                        data = store?._get(p)
                    }
                    if (typeof data !== 'undefined') {
                        return p
                    } else if ('location' in item) {
                        let location = typeof item.location === 'string' ? item.location : item.location(pathname, req, resp, store)
                        resp.cork(() => {
                            resp.writeStatus('302 Found')
                            resp.writeHeader('Location', location)
                            resp.end()
                        })
                        return false
                    } else {
                        return typeof item.index === 'string' ? item.index : item.index(pathname, req, resp, store)
                    }
                }
            }
        }
    }
}

export default middleware_tryfiles