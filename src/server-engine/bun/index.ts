import { AppOptions, HttpRequest, HttpResponse, TemplatedApp } from 'uWebSockets.js'
import { BunRequest } from './request';
import { BunTemplatedApp } from './app';

export const App = (): TemplatedApp => new BunTemplatedApp()
export const SSLApp = (options?: AppOptions): TemplatedApp => new BunTemplatedApp(options)
export const parseBody = async (req: HttpRequest, resp: HttpResponse) => {
    const result = await (req as BunRequest).req.arrayBuffer()
    return Buffer.from(result)
}
export const getHeader = (name: string, req: HttpRequest) => {
    const request = (req as BunRequest).req
    return request.headers.get(name)
}