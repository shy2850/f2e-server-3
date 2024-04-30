import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { uWS } from '../../utils/engine'

export const App = uWS?.App
export const SSLApp = uWS?.SSLApp

const headers_map = new WeakMap<HttpRequest, Record<string, string>>()
export const parseBody = async (req: HttpRequest, resp: HttpResponse) => {
    let headers: Record<string, string> = {}
    req.forEach(function (name, value) {
        headers[name] = value
    })
    headers_map.set(req, headers)
    return new Promise<Buffer>(function (resolve, reject) {
        const buffers: Buffer[] = []
        resp.onData(function (chunk, isLast) {
            buffers.push(Buffer.from(chunk))
            if (isLast) {
                resolve(Buffer.concat(buffers))
            }
        })
        resp.onAborted(function () {
            reject(new Error('Request aborted'))
        })
    })
}
