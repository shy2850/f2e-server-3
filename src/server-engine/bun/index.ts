import type { Server } from 'bun';
import { AppOptions, HttpRequest, HttpResponse, ListenOptions, RecognizedString, TemplatedApp, WebSocketBehavior, us_listen_socket } from 'uWebSockets.js'
import { BunRequest } from './request';
import { BunResponse } from './response';
import { minimatch } from 'minimatch';

class BunTemplatedApp implements TemplatedApp {
    private tls?: AppOptions;
    private server?: Server;
    private listeners: { glob: string, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void> }[] = [];
    constructor(options?: AppOptions) {
        this.tls = options
    }
    listen(host: RecognizedString, port: number, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: number, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: number, options: ListenOptions, cb: (listenSocket: false | us_listen_socket) => void | Promise<void>): TemplatedApp;
    listen(port: unknown, options: unknown, cb?: unknown): TemplatedApp {
        const { tls, listeners } = this
        let host = '0.0.0.0'
        if (typeof port === 'string') {
            host = port
            port = options
        }
        this.server = Bun.serve({
            port: Number(port),
            hostname: host,
            tls: tls ? {
                key: tls.key_file_name?.toString(),
                cert: tls.cert_file_name?.toString(),
                passphrase: tls.passphrase?.toString(),
                dhParamsFile: tls.dh_params_file_name?.toString(),
                caFile: tls.ca_file_name?.toString(),
                lowMemoryMode: tls.ssl_prefer_low_memory_usage,
            } : undefined,
            async fetch (request) {
                const req = new BunRequest(request)
                const resp = new BunResponse()
                const location = new URL(request.url, 'http://localhost')
                for (let i = 0; i < listeners.length; i++) {
                    const { glob, handler } = listeners[i];
                    if (minimatch(location.pathname, glob)) {
                        await handler(resp, req)
                    }
                }
                return new Response(resp.body, {
                    status: resp.status,
                    statusText: resp.statusText,
                    headers: resp.headers,
                })
            },
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
        this.server?.stop();
        return this
    }
    
}

export const App = (): TemplatedApp => new BunTemplatedApp()
export const SSLApp = (options?: AppOptions): TemplatedApp => new BunTemplatedApp(options)
export const parseBody = async (req: HttpRequest, resp: HttpResponse) => {
    const result = await (req as BunRequest).req.arrayBuffer()
    return Buffer.from(result)
}