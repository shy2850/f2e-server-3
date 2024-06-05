import { NativeRequest } from "../../server-engine/native/request"
import { ENGINE_TYPE } from "../../utils/engine"
import { MiddlewareCreater } from "../interface"
import { ProxyItemRendered } from "./interface"
import * as http from 'node:http'
import * as https from 'node:https'
import { renderItem } from "./renderItem"
import { commonWriteHeaders, getHttpHeaders } from "../../utils/resp"
import { logger, toBuffer } from "../../utils"
import * as fs from 'fs'
import * as path from 'path'

const middleware_proxy: MiddlewareCreater = {
    name: 'proxy',
    mode: ['dev', 'prod'],
    execute: (conf) => {
        const { proxies = [] } = conf
        if (proxies.length === 0) {
            return
        }
        const items: ProxyItemRendered[] = proxies.map(renderItem)
        return {
            beforeRoute(pathname, ctx) {
                const {req, resp} = ctx
                const url = req.getUrl()
                const search = req.getQuery()
                const item = items.find(item => {
                    return item.match(url, search)
                })
                if (!item) {
                    return
                }
    
                const origin = item.getOrigin(url, ctx)
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
                
                const saver = item.saver
                let proxyHeadersMap: Record<string, any> = {}
                const _pathname = saver?.pathFixer ? saver.pathFixer(pathname, ctx) : pathname
                const dataPath = saver?.pathBodyDir ? path.join(saver.pathBodyDir, _pathname) : null
                if (saver && dataPath) {
                    if (!fs.existsSync(saver.pathBodyDir)) {
                        fs.mkdirSync(saver.pathBodyDir, { recursive: true })
                    }
                    if (!fs.existsSync(saver.pathHeaders)) {
                        fs.mkdirSync(path.dirname(saver.pathHeaders), { recursive: true })
                        fs.writeFileSync(saver.pathHeaders, JSON.stringify(proxyHeadersMap))
                    } else {
                        proxyHeadersMap = JSON.parse(fs.readFileSync(saver.pathHeaders, 'utf-8'))
                    }
                    if (fs.existsSync(dataPath)) {
                        resp.cork(() => {
                            resp.writeStatus('200 OK')
                            commonWriteHeaders(resp, proxyHeadersMap[_pathname] || {})
                            resp.write(fs.readFileSync(dataPath))
                            resp.end()
                        })
                        return false
                    }
                }

                try {
                    const creq = (/^https/i.test(newPath.protocol) ? https : http).request(newPath, {
                        method: req.getMethod(),
                        headers: {
                            ...requestHeaders(getHttpHeaders(req), ctx),
                            host: newPath.host,
                        },
                        timeout,
                        ...requestOptions,
                    }, function (res) {
                        const chunks: Buffer[] = []
                        res.on('data', function (data) {
                            chunks.push(data)
                        }).on('end', function () {
                            const result = responseRender(Buffer.concat(chunks), res, ctx)
                            const headers = responseHeaders(getHttpHeaders(res), res, ctx)
                            if (saver) {
                                const _pathname = saver.pathFixer ? saver.pathFixer(pathname, ctx) : pathname
                                const dataPath = path.join(saver.pathBodyDir, _pathname)
                                proxyHeadersMap[_pathname] = headers
                                fs.writeFileSync(saver.pathHeaders, JSON.stringify(proxyHeadersMap, null, 2))
                                if (!fs.existsSync(dataPath)) {
                                    fs.mkdirSync(path.dirname(dataPath), { recursive: true })
                                }
                                fs.writeFileSync(dataPath, result)
                            }
                            resp.cork(() => {
                                resp.writeStatus(res.statusCode + ' ' + res.statusMessage)
                                commonWriteHeaders(resp, headers)
                                resp.write(result)
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
                        logger.error(`[proxy error]`, newPath, err)
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
}
export default middleware_proxy