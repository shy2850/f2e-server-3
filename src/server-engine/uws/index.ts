import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { uWS } from '../../utils/engine'

export const App = uWS?.App
export const SSLApp = uWS?.SSLApp
export const parseBody = async (req: HttpRequest, resp: HttpResponse) => {
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