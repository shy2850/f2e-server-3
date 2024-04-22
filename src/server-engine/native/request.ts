import { IncomingMessage } from 'http'
import { HttpRequest, RecognizedString } from 'uWebSockets.js'

export class NativeRequest implements HttpRequest {
    req: IncomingMessage
    location: URL
    searchParams: URLSearchParams
    constructor (req: IncomingMessage) {
        this.req = req
        this.location = new URL(req.url || '/', 'http://localhost')
        this.searchParams = new URLSearchParams(this.location.search)
    }
    getHeader(lowerCaseKey: RecognizedString): string {
        return this.req.headers[lowerCaseKey.toString()]?.toString() || ''
    }
    getParameter(index: number): string {
        return [...this.searchParams][index]?.join('=')
    }
    getUrl(): string {
        return this.req.url || '/';
    }
    getMethod(): string {
        return this.getCaseSensitiveMethod().toLowerCase();
    }
    getCaseSensitiveMethod(): string {
        return this.req.method || 'GET';
    }
    getQuery(): string;
    getQuery(key: string): string | undefined;
    getQuery(key?: unknown): string | undefined {
        if (key) {
            return this.searchParams.get(key.toString()) || undefined
        } else {
            return this.location.search
        }
    }
    forEach(cb: (key: string, value: string) => void): void {
        Object.entries(this.req.headers).forEach(([key, value]) => {
            cb(key, value?.toString() || '')
        })
    }
    setYield(_yield: boolean): HttpRequest {
        throw new Error('Method not implemented.');
    }
    
}