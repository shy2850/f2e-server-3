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
        return this.location.pathname || '/';
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
            return this.location.search || undefined
        }
    }
    forEach(cb: (key: string, value: string) => void): void {
        const headers = this.req.rawHeaders
        for (let i = 0; i < headers.length; i += 2) {
            cb?.(headers[i], headers[i + 1])
        }
    }
    setYield(_yield: boolean): HttpRequest {
        throw new Error('Method not implemented.');
    }
    
}