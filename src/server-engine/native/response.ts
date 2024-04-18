import { HttpResponse, RecognizedString, us_socket_context_t } from 'uWebSockets.js'

export class NativeResponse implements HttpResponse {
    [key: string]: any
    status = 200
    statusText = 'OK'
    headers: Record<string, string> = {}
    body: RecognizedString = ''
    pause(): void {
        throw new Error('Method not implemented.');
    }
    resume(): void {
        throw new Error('Method not implemented.');
    }
    writeStatus(status: RecognizedString): HttpResponse {
        const [statusCode, ...statusText] = status.toString().split(/\s+/);
        this.status = Number(statusCode)
        this.statusText = statusText?.join('')
        return this;
    }
    writeHeader(key: RecognizedString, value: RecognizedString): HttpResponse {
        this.headers[key.toString()] = value.toString()
        return this
    }
    write(chunk: RecognizedString): boolean {
        if (Buffer.isBuffer(chunk)) {
            this.body = Buffer.concat([Buffer.from(this.body?.toString()), chunk])
        } else {
            this.body += chunk.toString()
        }
        return true
    }
    end(body?: RecognizedString | undefined, closeConnection?: boolean | undefined): HttpResponse {
        if (body) {
            this.body = body;
        }
        return this
    }
    endWithoutBody(reportedContentLength?: number | undefined, closeConnection?: boolean | undefined): HttpResponse {
        this.body = '';
        return this
    }
    tryEnd(fullBodyOrChunk: RecognizedString, totalSize: number): [boolean, boolean] {
        throw new Error('Method not implemented.');
    }
    close(): HttpResponse {
        throw new Error('Method not implemented.');
    }
    getWriteOffset(): number {
        throw new Error('Method not implemented.');
    }
    onWritable(handler: (offset: number) => boolean): HttpResponse {
        throw new Error('Method not implemented.');
    }
    onAborted(handler: () => void): HttpResponse {
        throw new Error('Method not implemented.');
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
