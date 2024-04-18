import { ENGINE_TYPE } from "../server-engine"
import logger from "./logger"
import meta from '../../package.json'

export const REG_FILENAME = /[^\\/,\s\t\n]+/g
export const VERSION = `${meta.name} ${meta.version} [${ENGINE_TYPE}]`
export const pathname_arr = (str = ''): string[] => (str.match(REG_FILENAME) || [])
export const pathname_fixer = (str = '') => pathname_arr(str).join('/')
export const pathname_dirname = (str = '') => (str.match(REG_FILENAME) || []).slice(0, -1).join('/')
import mime from "mime"

export const getMimeType = (pathname: string, mimeTypes: { [key: string]: string }) => {
    const suffix = (pathname || '').split('.').pop()  || ''
    const type = (mimeTypes && mimeTypes[suffix]) || mime.getType(suffix) as string
    return type || 'application/octet-stream'
}
export const isText = (pathname: string, mimeTypes: { [key: string]: string }) => {
    const type = getMimeType(pathname, mimeTypes)
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
export const template = (tpl: string, data: any): string => {
    return tpl
        .replace(/\{\{(\w+)\s+(\w+)[^{}]*\}\}(.*?)\{\{\/\1\}\}/g, function (_: any, fn: any, item_key: any, line: any) {
            const items = data[item_key]
            switch (fn) {
                case 'each':
                    return items ? items.map((item: any) => template(line, item)).join('') : ''
                case 'if':
                    return items ? template(line, items) : ''
                default:
                    return template(line, items)
            } 
        })
        .replace(/\{\{(\w+)\}\}/g, (__, key) => {
            if (key === '@') {
                return data
            }
            return data[key] || ''
        })
}

export const renderHTML = (body: string, data: any) => {
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>{{title}}</title>
    </head>
    <body>${body}</body>
    </html>`
    if (!isPlainObject(data)) {
        return html
    }
    return template(html, data)
}