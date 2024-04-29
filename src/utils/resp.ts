import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { APIContext, F2EConfigResult } from "../interface"
import { createHash } from "node:crypto"
import * as _ from './misc'
import * as zlib from "node:zlib"
import logger from "./logger"
import engine, { ENGINE_TYPE } from "../server-engine"
import { VERSION } from "./engine"
import { RouteItem } from "../routes/interface"
import { OutgoingHttpHeaders } from "node:http"

const gzipSync = ENGINE_TYPE === 'bun' ? Bun.gzipSync : zlib.gzipSync

export const etag = (entity: Buffer | string) => {
    if (entity.length === 0) {
      return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'
    }
    const hash = createHash('sha1')
      .update(entity)
      .digest('base64')
      .substring(0, 27)
  
    const len = Buffer.byteLength(entity)
    return '"' + len.toString(16) + '-' + hash + '"'
}

const gzipStore = new Map<string, {
    etag: string;
    data: Buffer | Uint8Array;
}>()

export const commonWriteHeaders = (resp: HttpResponse, headers?: OutgoingHttpHeaders) => {
    for (const key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) {
            const value = headers[key]
            if (typeof value != 'undefined') {
                resp.writeHeader(key, value.toString())
            }
        }
    }
    resp.writeHeader('X-Powered-By', VERSION)
}


export const createResponseHelper = (conf: F2EConfigResult) => {
    const {
        gzip, gzip_filter, range_size,
        page_404, page_50x, page_dir,
        cache_filter,
    } = conf

    const handleNotFound = (resp: HttpResponse, pathname: string) => {
        const body = _.renderHTML(page_404, { title: 'Page Not Found!', pathname })
        resp.cork(() => {
            resp.writeStatus('404 Not Found')
            commonWriteHeaders(resp, {'Content-Type': 'text/html; charset=utf-8'})
            resp.end(body)
        })
    }
    const handleError = (resp: HttpResponse, error: string) => {
        const error_body = _.renderHTML(page_50x, { error, title: 'Server Error!' })
        logger.error(error)
        resp.cork(() => {
            resp.writeStatus('500 Internal Server Error')
            commonWriteHeaders(resp, {'Content-Type': 'text/html; charset=utf-8'})
            resp.end(error_body)
        })
    }
    const handleSuccess = (req: HttpRequest, resp: HttpResponse, pathname: string, data: string | Buffer ) => {
        const tag = engine.getHeader('if-none-match', req)
        const newTag = data && etag(data)
        const txt = _.isText(pathname)
        const gz = txt && gzip && gzip_filter(pathname, data?.length)
        const type = _.getMimeType(pathname) + (txt ? '; charset=utf-8' : '')
        const range = engine.getHeader('range', req)

        if (tag && data && tag === newTag) {
            resp.cork(() => {
                resp.writeStatus("304 Not Modified")
                commonWriteHeaders(resp, {})
                resp.endWithoutBody()
            })
            return
        }
        if (range && data instanceof Buffer) {
            let [start = 0, end = 0] = range.replace(/[^\-\d]+/g, '').split('-').map(Number)
            end = end || (start + range_size)
            const d = Uint8Array.prototype.slice.call(data, start, end)
            end = Math.min(end, start + d.length)
            resp.cork(() => {
                resp.writeStatus('206 Partial Content')
                commonWriteHeaders(resp, {
                    'Content-Type': type,
                    'Content-Range': `bytes ${start}-${end - 1}/${data.length}`,
                    'Content-Length': d.length,
                    'Accept-Ranges': 'bytes',
                })
                resp.end(d)
            })
            return
        }

        resp.cork(() => {
            resp.writeStatus('200 OK')
            const headers: OutgoingHttpHeaders = {
                'Content-Type': type,
                'Content-Encoding': gz ? 'gzip' : 'utf-8',
                'Etag': newTag,
            }
            if (cache_filter(pathname, data?.length)) {
                headers['Cache-Control'] = 'public, max-age=3600'
                headers['Last-Modified'] = new Date().toUTCString()
            }
            commonWriteHeaders(resp, headers)
            if (gz) {
                const temp = gzipStore.get(pathname)
                if (temp && temp.etag === newTag) {
                    resp.end(temp.data)
                } else {
                    const res = gzipSync(data)
                    gzipStore.set(pathname, { data: res, etag: newTag })
                    resp.end(res)
                }
            } else {
                resp.end(data)
            }
        })
    }

    /**
     * 处理目录响应
     * @param resp 响应对象
     * @param pathname 当前路径
     * @param obj 当前路径映射内存对象
     */
    const handleDirectory = (resp: HttpResponse, pathname: string, obj: any) => {
        if (page_dir === false) {
            return handleNotFound(resp, pathname)
        }
        const files = []
        if (_.isPlainObject(obj)) {
            for (let key in obj) {
                const isDir = _.isPlainObject(obj[key])
                files.push({
                    name: key,
                    path: _.pathname_arr(pathname).concat(key).join('/'),
                    isDir,
                    size: isDir ? 0 : (obj[key] && obj[key].length)
                })
            }
        }
        const dir_body = _.renderHTML(page_dir, { title: '/' + pathname, pathname: _.pathname_dirname(pathname), files })
        resp.cork(() => {
            resp.writeStatus('200 OK')
            commonWriteHeaders(resp, {
                'Content-Type': 'text/html; charset=utf-8'
            })
            resp.end(dir_body)
        })
    }

    const handleSSE = (req: HttpRequest, resp: HttpResponse, item: RouteItem, body: any, ctx: APIContext) => {
        const {
            interval = 1000,
            interval_beat = 30000,
            default_content = '',
        } = item
        resp.cork(() => {
            resp.writeStatus('200 OK')
            commonWriteHeaders(resp, {
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
            })
        })
        let interval1: Timer
        const heartBeat = function heartBeat () {
            resp.cork(() => {
                resp.write(`data:${default_content}\n\n`)
            })
            if (interval_beat) {
                interval1 = setTimeout(heartBeat, interval_beat)
            }
        }
        let interval2: Timer
        const loop = function loop () {
            item.handler(body, ctx).then((res: any) => {
                if (res) {
                    resp.cork(() => {
                        resp.write(`data:${JSON.stringify(res)}\n\n`)
                    })
                }
            }).catch(function (e: any) {
                logger.error('SSE LOOP:', e)
            })
            if (interval) {
                interval2 = setTimeout(loop, interval)
            }
        }
        resp.onAborted(() => {
            clearTimeout(interval1)
            clearTimeout(interval2)
        })
        loop()
        heartBeat()
        return false
    }
    return {
        handleSuccess, handleError, handleNotFound, handleDirectory, handleSSE
    }
}