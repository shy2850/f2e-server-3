import { HttpRequest, RecognizedString } from 'uWebSockets.js'

export class BunRequest implements HttpRequest {
    req: Request
    location: URL
    searchParams: URLSearchParams
    constructor (req: Request) {
        this.req = req
        this.location = new URL(req.url, 'http://localhost')
        this.searchParams = new URLSearchParams(this.location.search)
    }
    getHeader(lowerCaseKey: RecognizedString): string {
        return this.req.headers.get(lowerCaseKey.toString()) || ''
    }
    getParameter(index: number): string {
        return [...this.searchParams][index]?.join('=')
    }
    getUrl(): string {
        return new URL(this.req.url, 'http://localhost').pathname;
    }
    getMethod(): string {
        return this.getCaseSensitiveMethod().toUpperCase();
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
        this.req.headers.forEach((value, key) => {
            cb(key, value)
        });
    }
    setYield(_yield: boolean): HttpRequest {
        throw new Error('Method not implemented.');
    }
    
}