import { NativeRequest } from "../../server-engine/native/request"
import { ENGINE_TYPE } from "../../utils/engine"
import { MiddlewareCreater } from "../interface"
import { ProxyItemRendered } from "./interface"
import * as http from 'node:http'
import * as https from 'node:https'
import { renderItem } from "./renderItem"
import { getProxyHeaders, toBuffer } from "./util"
import { commonWriteHeaders } from "../../utils/resp"

const middleware_proxy: MiddlewareCreater = (conf) => {
    const { proxies = [] } = conf
    if (proxies.length === 0) {
        return
    }
    const items: ProxyItemRendered[] = proxies.map(renderItem)
    return {
        name: 'proxy',
        mode: ['dev', 'prod'],
        beforeRoute(pathname, req, resp) {
            const url = req.getUrl()
            const search = req.getQuery()
            const item = items.find(item => {
                return item.match(url, search)
            })
            if (!item) {
                return
            }

            const origin = item.getOrigin()
            const {
                timeout = 5000,
                requestOptions = {},
                requestHeaders = h => h,
                responseHeaders = h => h,
                responseRender = h => h,
            } = item
            const newPath = new URL(
                typeof item.pathname === 'function'
                ? url.replace(item.location, item.pathname)
                : url.replace(item.location, item.pathname || (typeof item.location === 'string' ? item.location : '')),
                origin)
            if (search) {
                newPath.search = search
            }
            
            try {
                const creq = (/^https/i.test(newPath.protocol) ? https : http).request(newPath, {
                    method: req.getMethod(),
                    headers: {
                        ...requestHeaders(getProxyHeaders(req)),
                        host: newPath.host,
                    },
                    timeout,
                    ...requestOptions,
                }, function (res) {
                    const chunks: Buffer[] = []
                    res.on('data', function (data) {
                        chunks.push(data)
                    }).on('end', function () {
                        const result = Buffer.concat(chunks)
                        resp.cork(() => {
                            resp.writeStatus(res.statusCode + ' ' + res.statusMessage)
                            commonWriteHeaders(resp, responseHeaders(getProxyHeaders(res)))
                            resp.write(responseRender(result))
                            resp.end()
                        })
                    })
                }).on('timeout', function () {
                    resp.cork(() => {
                        resp.writeStatus('504 Gateway Timeout')
                        commonWriteHeaders(resp, {})
                        resp.end('504 Gateway Timeout')
                    })
                }).on('error', function (err) {
                    resp.cork(() => {
                        resp.writeStatus('502 Bad Gateway')
                        commonWriteHeaders(resp, {})
                        resp.end(err.stack || err.message)
                    })
                })
                switch (ENGINE_TYPE) {
                    case "node":
                    case "bun":
                        (req as NativeRequest).req.pipe(creq)
                        break;
                    case "uws":
                        resp.onData(function (data, finished) {
                            data && data.byteLength > 0 && creq.write(toBuffer(data))
                            if (finished) {
                                creq.end()
                            }
                        })
                        resp.onAborted(() => {
                            creq.destroy()
                            resp.end()
                        })
                }
            } catch (e) {
                resp.cork(() => {
                    resp.writeStatus('502 Bad Gateway')
                    commonWriteHeaders(resp, {})
                    resp.end(e + '')
                })
            }
            return false
        },
    }
}
export default middleware_proxy