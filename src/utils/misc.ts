import mime from "mime"
import logger from "./logger"

export const pathname_arr = (str = '') => (str.match(/[^/\\]+/g) || [])
export const pathname_fixer = (str = '') => pathname_arr(str).join('/')
export const pathname_dirname = (str = '') => (str.match(/[^/\\]+/g) || []).slice(0, -1).join('/')

export const isText = (pathname: string) => {
    const type = mime.getType(pathname)
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
    const [key, ...rest] = path.toString().match(/[^\\/]+/g) || []
    if (!key) {
        return obj
    }
    if (rest.length === 0) {
        return obj[key]
    }
    return loopGet(obj[key], rest)
}

export const set = function loopSet (obj: any, path: string | string[], value: any): any {
    const [key, ...rest] = path.toString().match(/[^\\/]+/g) || []
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
