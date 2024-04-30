import logger from "./logger"
import { networkInterfaces } from 'node:os'
import mime from "./mime"
import { page_layout } from "./templates"

export const REG_FILENAME = /[^\\/,\s\t\n]+/g
export const pathname_arr = (str = ''): string[] => (str.split(/[#?]+/)[0].replace(/^\.+\//, '').match(REG_FILENAME) || [])
export const pathname_fixer = (str = '') => pathname_arr(str).join('/')
export const pathname_dirname = (str = '') => (str.match(REG_FILENAME) || []).slice(0, -1).join('/')
export const createSessionId = () => 'xxxx-xxxx-xxxx-xxxx'.replace(/xxxx/g, () => Math.floor((1 << 16) + Math.random() * (1 << 24)).toString(16).substring(0, 4))
export const minimatch = (str = '', pattern = '') => {
    const reg = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/,/g, '|'))
    return reg.test(str)
}

export const getMimeType = (pathname: string) => {
    const suffix = (pathname || '').split('.').pop()  || ''
    return mime.getType(suffix) || 'application/octet-stream'
}
export const isText = (pathname: string) => {
    const type = getMimeType(pathname)
    return /\b(html?|txt|javascript|json)\b/.test(type || 'exe')
}

export const decode = (str: string) => {
    try {
        return decodeURIComponent(str)
    } catch (e) {
        logger.warn(e)
        return str
    }
}
export const toBuffer = function (arrayBuffer: ArrayBuffer) {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const arrayBufferView = new Uint8Array(arrayBuffer);
    for (let i = 0; i < arrayBufferView.length; i++) {
        buffer[i] = arrayBufferView[i];
    }
    return buffer
}

export const ServerIP = (Object.entries(networkInterfaces())
    .find(([__, info]) => info?.filter((t) => t.family === 'IPv4' && !t.internal)[0])?.[1]?.filter((t) => t.family === 'IPv4' && !t.internal)[0]
    || {address: '127.0.0.1'}).address

export const queryparams = (search: string) => {
    const searchParams = new URLSearchParams(search)
    const params: Record<string, string | string[]> = {}
    searchParams.forEach((v, k) => {
        if (params[k]) {
            params[k] = ([] as string[]).concat(params[k]).concat(v)
        } else {
            params[k] = v
        }
    })
    return params
}

export const get = function loopGet (obj: any, path: string | string[]): any {
    const [key, ...rest] = path.toString().match(REG_FILENAME) || []
    if (!key || !obj) {
        return obj
    }
    if (rest.length === 0) {
        return obj[key]
    }
    return loopGet(obj[key], rest)
}

export const set = function loopSet (obj: any, path: string | string[], value: any): any {
    const [key, ...rest] = path.toString().match(REG_FILENAME) || []
    if (!key) return
    if (rest.length === 0) {
        Object.assign(obj, {
            [key]: value
        })
    } else {
        if (!obj[key]) {
            obj[key] = {}
        }
        loopSet(obj[key], rest, value)
    }
}

export const isPlainObject = function (value: any) {
    if (!value || typeof value != 'object') {
        return false
    }
    return Object.prototype.toString.call(value) === '[object Object]'
}

/** 简单字符串模板，类似 handlebars */
export const template = function template (tpl: string, data: any, index?: number): string {
    return tpl
        .replace(/\{\{(\w+)\s+(\w+)[^{}]*\}\}([\s\S\t\r\n]*?)\{\{\/\1\}\}/g, function (_: any, fn: any, item_key: any, line: any) {
            const items = data[item_key]
            switch (fn) {
                case 'each':
                    return items ? items.map((item: any, index: number) => template(line, item, index)).join('') : ''
                case 'if':
                    return items ? template(line, items) : ''
                default:
                    return template(line, items)
            } 
        })
        .replace(/\{\{([@\$\.\w]+)\}\}/g, (__, key) => {
            switch (key) {
                case '@': return data;
                case '@index': return index;
                default: return typeof data[key] !== 'undefined' ? data[key] : ''
            }
        })
}

export const renderHTML = (body: string, data: any) => {
    if (!isPlainObject(data)) {
        return body
    }
    return template(page_layout, {
        title: data.title || 'F2E Page',
        body: template(body, data)
    })
}