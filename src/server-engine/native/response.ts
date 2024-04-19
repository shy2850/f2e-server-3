import { ServerResponse } from 'http'
import { HttpResponse, RecognizedString, us_socket_context_t } from 'uWebSockets.js'

export class NativeResponse implements HttpResponse {
    response: ServerResponse
    constructor (response: ServerResponse) {
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
        this.response.writeHead(Number(statusCode), statusText.join(' '))
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
        this.response.addListener('close', handler)
        return this
    }
    onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): HttpResponse {
        throw new Error('Method not implemented.')
    }
    getRemoteAddress(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    getRemoteAddressAsText(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    getProxiedRemoteAddress(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    getProxiedRemoteAddressAsText(): ArrayBuffer {
        throw new Error('Method not implemented.');
    }
    cork(cb: () => void): HttpResponse {
        cb && cb();
        return this
    }
    upgrade<UserData>(userData: UserData, secWebSocketKey: RecognizedString, secWebSocketProtocol: RecognizedString, secWebSocketExtensions: RecognizedString, context: us_socket_context_t): void {
        throw new Error('Method not implemented.');
    }
    
}
