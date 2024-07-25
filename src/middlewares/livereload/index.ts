import { HttpResponse } from "uWebSockets.js"
import { MiddlewareCreater } from "../interface"
import { Route } from "../../routes"
import * as _ from "../../utils/misc"
import { code_livereload } from "../../utils/templates"

const SERVER_SENT_SCRIPT = code_livereload

const middleware_livereload: MiddlewareCreater = {
    name: 'livereload',
    mode: ['dev'],
    execute: (conf) => {
        const { livereload } = conf
        if (!livereload) {
            return
        }
    
        const {
            prefix = 'server-sent-bit',
            heartBeatTimeout = 30000,
            reg_inject = /\.html$/,
        } = livereload
        const route = new Route(conf)
    
        let lastTimeMap = new WeakMap<HttpResponse, number>()
        /** SSE 接口 */
        route.on(prefix, async (_, { resp, location, store }) => {
            const referer = location.searchParams.get('referer')
            if (!referer) {
                return
            }
            const expire = location.searchParams.get('expire')
            if (expire) {
                lastTimeMap.set(resp, Number(expire))
            }
            const entry = store?.origin_map.get(referer)
            if (entry && entry.updateTime) {
                const { updateTime, deps = [] } = entry
                const lastTime = lastTimeMap.get(resp)
                if (!lastTime) {
                    // 新开监听
                    lastTimeMap.set(resp, updateTime)
                    return {
                        update: false,
                    }
                }
                if (lastTime && lastTime < updateTime) {
                    lastTimeMap.set(resp, updateTime)
                    // 需要页面更新啦
                    return {
                        update: true,
                    }
                }
                const updateDeps: {
                    origin: string;
                    output: string;
                    hash?: string;
                }[] = []

                let expire = updateTime
                for (let i = 0; lastTime && i < deps.length; i++) {
                    const item = store?.origin_map.get(deps[i]);
                    if (item && item.updateTime && item.updateTime > lastTime) {
                        expire = expire < item.updateTime ? item.updateTime : expire
                        updateDeps.push({
                            origin: item.originPath,
                            output: item.outputPath,
                            hash: item.hash,
                        })
                    }
                }
                if (updateDeps.length) {
                    lastTimeMap.set(resp, expire)
                    // 依赖文件有更新
                    return {
                        update: false,
                        updateDeps,
                    }
                }
            }
        }, { type: 'sse', interval: 100, interval_beat: heartBeatTimeout })
    
        const inject_script = _.template(SERVER_SENT_SCRIPT, {
            prefix,
        }, false)
        return {
            onRoute: route.execute,
            onGet: async (pathname, html) => {
                /** 脚本注入 */
                if (reg_inject.test(pathname) && html) {
                    return html.toString() + inject_script.replaceAll('{{referer}}', pathname)
                }
            },
        }
    }
}

export default middleware_livereload