import { IncomingMessage, ServerResponse } from 'node:http'
import { HttpResponse, RecognizedString, us_socket_context_t } from 'uWebSockets.js'

export class NativeResponse implements HttpResponse {
    request: IncomingMessage
    response: ServerResponse
    constructor (request: IncomingMessage, response: ServerResponse) {
        this.request = request
        this.response = response
    }
    pause(): void {
        throw new Error('Method not implemented.');
    }
    resume(): void {
        throw new Error('Method not implemented.');
    }
    writeStatus(status: RecognizedString): HttpResponse {
        const [statusCode, ...statusText] = status.toString().split(/\s+/);
        this.response.statusCode = Number(statusCode)
        this.response.statusMessage = statusText.join(' ')
        return this;
    }
    writeHeader(key: RecognizedString, value: RecognizedString): HttpResponse {
        this.response.setHeader(key.toString(), value.toString())
        return this
    }
    write(chunk: RecognizedString): boolean {
        return this.response.write(chunk)
    }
    end(body?: RecognizedString | undefined, closeConnection?: boolean | undefined): HttpResponse {
        this.response.end(body)
        return this
    }
    endWithoutBody(reportedContentLength?: number | undefined, closeConnection?: boolean | undefined): HttpResponse {
        return this.end(undefined, closeConnection)
    }
    tryEnd(fullBodyOrChunk: RecognizedString, totalSize: number): [boolean, boolean] {
        throw new Error('Method not implemented.');
    }
    close(): HttpResponse {
        this.response.destroy();
        return this
    }
    getWriteOffset(): number {
        throw new Error('Method not implemented.');
    }
    onWritable(handler: (offset: number) => boolean): HttpResponse {
        throw new Error('Method not implemented.');
    }
    onAborted(handler: () => void): HttpResponse {
        this.request.socket.addListener('close', handler)
        return this
    }
    onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): HttpResponse {
        throw new Error('Method not implemented.')
    }
    getRemoteAddress(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    getRemoteAddressAsText(): ArrayBuffer {
        const buffer = Buffer.from((this.request.socket.remoteAddress || '').split(',')[0], 'utf-8')
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteLength) as ArrayBuffer;
    }
    getProxiedRemoteAddress(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    getProxiedRemoteAddressAsText(): ArrayBuffer {
        const ip = this.request.headers['x-forwarded-for'];
        const buffer = Buffer.from((ip ? ip.toString() : '').split(',')[0], 'utf-8')
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteLength) as ArrayBuffer;
    }
    cork(cb: () => void): HttpResponse {
        const resp = this.response
        if (resp.writable && !resp.writableEnded) {
            cb && cb();
        }
        return this
    }
    upgrade<UserData>(userData: UserData, secWebSocketKey: RecognizedString, secWebSocketProtocol: RecognizedString, secWebSocketExtensions: RecognizedString, context: us_socket_context_t): void {
        throw new Error('Method not implemented.');
    }
    
}
