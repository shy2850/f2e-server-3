import { AppOptions, HttpRequest, HttpResponse, TemplatedApp } from 'uWebSockets.js'
import { NativeRequest } from './request';
import { NativeTemplatedApp } from './app';

export const App = (): TemplatedApp => new NativeTemplatedApp()
export const SSLApp = (options?: AppOptions): TemplatedApp => new NativeTemplatedApp(options)
export const parseBody = async (req: HttpRequest, resp: HttpResponse) => {
    const request = (req as NativeRequest).req
    return new Promise<Buffer>(function (resolve, reject) {
        request.on('error', reject)
        const buffers: Buffer[] = []
        request.on('data', function (data) {
            buffers.push(data)
        }).on('end', function () {
            resolve(Buffer.concat(buffers))
        })
    })
}