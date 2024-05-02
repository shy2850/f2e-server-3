import { HttpResponse } from "uWebSockets.js"
import { MiddlewareCreater } from "../interface"
import { Route } from "../../routes"
import * as _ from "../../utils/misc"

const SERVER_SENT_SCRIPT = `<script>
    (function () {
        if(window.EventSource) {
            var updateTime;
            var sse;
            function start_listen () {
                sse = new EventSource('/{{prefix}}');
                sse.addEventListener('message', function (e) {
                    if (!e.data.trim()) {return;}
                    if (updateTime != e.data) {
                        if (updateTime) {
                            location.reload();
                        }
                        updateTime = e.data;
                    }
                });
            }
            function visibilityChange () {
                if (document.hidden) {
                    if (!!sse) sse.close();
                } else  {
                    start_listen();
                }
            };
            document.addEventListener("visibilitychange", visibilityChange, false);
            visibilityChange();
        }
    })()
</script>`.replace(/[\r\n\s]+/g, ' ')

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
        route.on(prefix, async (_, { resp, store }) => {
            const updateTime = store?.last_build
            const lastTime = lastTimeMap.get(resp)
            if (updateTime && updateTime != lastTime) {
                lastTimeMap.set(resp, updateTime)
                return updateTime
            }
        }, { type: 'sse', interval: 100, interval_beat: heartBeatTimeout })
    
        return {
            onRoute: route.execute,
            onGet: async (pathname, html) => {
                /** 脚本注入 */
                if (reg_inject.test(pathname) && html) {
                    return html.toString() + _.template(SERVER_SENT_SCRIPT, { prefix })
                }
            },
        }
    }
}

export default middleware_livereload