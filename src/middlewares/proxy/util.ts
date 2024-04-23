import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { ProxyHeaders } from "./interface";
import { IncomingMessage } from "node:http";

export const getProxyHeaders = (req: HttpRequest | IncomingMessage): ProxyHeaders => {
    const headers: ProxyHeaders = {}
    if (req instanceof IncomingMessage) {
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            headers[req.rawHeaders[i]] = req.rawHeaders[i + 1]
        }
    } else {
        req.forEach((key, value) => {
            headers[key.trim()] = value.trim()
        })
    }
    return headers
}

export const toBuffer = function (arrayBuffer: ArrayBuffer) {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const arrayBufferView = new Uint8Array(arrayBuffer);
    for (let i = 0; i < arrayBufferView.length; i++) {
        buffer[i] = arrayBufferView[i];
    }
    return buffer
}