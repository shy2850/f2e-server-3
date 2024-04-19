import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { MiddlewareCreater } from "../interface"

const SERVER_SENT_SCRIPT = `<script>
    (function () {
        if(window.EventSource) {
            var updateTime;
            var sse;
            function start_listen () {
                sse = new EventSource('/{{prefix}}');
                sse.addEventListener('message', function (e) {
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
</script>`

const middleware_livereload: MiddlewareCreater = (conf) => {
    const { livereload } = conf

    if (!livereload) {
        return
    }

    const responseSet = new Set<HttpResponse>([])
    let updateTime = Date.now()

    return {
        mode: ['dev']
    }
}