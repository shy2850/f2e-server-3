import { AppOptions, HttpRequest, HttpResponse, ListenOptions, RecognizedString, TemplatedApp, WebSocketBehavior, us_listen_socket } from 'uWebSockets.js'
import { NativeRequest } from './request';
import { NativeResponse } from './response';
import * as http from 'node:http'
import * as https from 'node:https'
import { minimatch } from '../../utils/misc';

export class NativeTemplatedApp implements TemplatedApp {
    private listeners: { glob: string, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void> }[] = [];
    server: https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    constructor(options?: AppOptions) {
        const listeners = this.listeners;
        this.server = options ? https.createServer() : http.createServer(async (request, response) => {
            const req = new NativeRequest(request)
            const resp = new NativeResponse(response)
            const location = new URL(request.url || '/', 'http://localhost')
            for (let i = 0; i < listeners.length; i++) {
                const { glob, handler } = listeners[i];
                if (minimatch(location.pathname, glob)) {
                    await handler(resp, req)
                }
            }
        })
    }
    listen(host: RecognizedString, port: number, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: number, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: number, options: ListenOptions, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: unknown, options: unknown, cb?: unknown): TemplatedApp {
        let host = '0.0.0.0'
        if (typeof port === 'string') {
            host = port
            port = options
        }
        this.server.listen(Number(port), host, function () {
            if (typeof cb === 'function') cb()
        })
        return this
    }
    listen_unix(cb: (listenSocket: us_listen_socket) => void | Promise<void>, path: RecognizedString): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    get(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    post(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    options(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    del(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    patch(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    put(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    head(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        return this.any(pattern, handler)
    }
    connect(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    trace(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    any(pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>): TemplatedApp {
        this.listeners.push({
            glob: pattern.toString(),
            handler,
        })
        return this
    }
    ws<UserData>(pattern: RecognizedString, behavior: WebSocketBehavior<UserData>): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    publish(topic: RecognizedString, message: RecognizedString, isBinary?: boolean | undefined, compress?: boolean | undefined): boolean {
        throw new Error('Method not implemented.');
    }
    numSubscribers(topic: RecognizedString): number {
        throw new Error('Method not implemented.');
    }
    addServerName(hostname: string, options: AppOptions): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    domain(domain: string): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    removeServerName(hostname: string): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    missingServerName(cb: (hostname: string) => void): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    filter(cb: (res: HttpResponse, count: Number) => void | Promise<void>): TemplatedApp {
        throw new Error('Method not implemented.');
    }
    close(): TemplatedApp {
        this.server?.close();
        return this
    }
    
}