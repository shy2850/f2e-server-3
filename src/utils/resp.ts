import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { F2EConfigResult } from "../interface"
import { createHash } from "node:crypto"
import * as _ from './misc'
import { gzipSync } from "node:zlib"
import logger from "./logger"

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


export const createResponseHelper = (conf: F2EConfigResult) => {
    const {
        gzip, gzip_filter, mimeTypes, range_size, beforeResponseEnd,
        page_404, page_50x, page_dir,
    } = conf

    const handleNotFound = (resp: HttpResponse, pathname: string) => {
        const body = _.renderHTML(page_404, { title: 'Page Not Found!', pathname })
        resp.cork(() => {
            resp.writeStatus('404 Not Found')
            resp.writeHeader('Content-Type', 'text/html; charset=utf-8')
            resp.end(body)
        })
    }
    const handleError = (resp: HttpResponse, error: string) => {
        const error_body = _.renderHTML(page_50x, { error, title: 'Server Error!' })
        logger.error(error)
        resp.cork(() => {
            resp.writeStatus('500 Internal Server Error')
            resp.writeHeader('Content-Type', 'text/html; charset=utf-8')
            resp.writeHeader('Content-Length', error_body.length + '')
            resp.end(error_body)
        })
    }
    const handleSuccess = (req: HttpRequest, resp: HttpResponse, pathname: string, data: string | Buffer ) => {
        const tag = req.getHeader('if-none-match')
        const newTag = data && etag(data)
        const txt = _.isText(pathname, mimeTypes)
        const gz = txt && gzip && gzip_filter(pathname, data?.length)
        const type = _.getMimeType(pathname, mimeTypes) + (txt ? '; charset=utf-8' : '')
        const range = req.getHeader('range')

        if (tag && data && tag === newTag) {
            resp.cork(() => {
                resp.writeStatus("304 Not Modified")
                resp.writeHeader("Content-Type", type)
                resp.writeHeader("Content-Encoding", gz ? 'gzip' : 'utf-8')
                beforeResponseEnd(resp, req)
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
                resp.writeHeader('Content-Type', type)
                resp.writeHeader('Content-Range', `bytes ${start}-${end - 1}/${data.length}`)
                resp.writeHeader('Content-Length', d.length + '')
                resp.writeHeader('Accept-Ranges', 'bytes')
                beforeResponseEnd(resp, req)
                resp.end(d)
            })
            return
        }

        resp.cork(() => {
            resp.writeStatus('200 OK')
            resp.writeHeader("Content-Type", type)
            resp.writeHeader("Content-Encoding", gz ? 'gzip' : 'utf-8')
            resp.writeHeader("ETag", newTag)
            beforeResponseEnd(resp, req)
            resp.end(gz ? gzipSync(data) : data)
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
            resp.writeHeader('Content-Type', 'text/html; charset=utf-8')
            resp.writeHeader('Content-Length', dir_body.length + '')
            resp.end(dir_body)
        })
    }

    return {
        handleSuccess, handleError, handleNotFound, handleDirectory,
    }
}