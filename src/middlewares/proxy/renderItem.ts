import { ProxyItem, ProxyItemRendered } from "./interface";
import { APIContext } from "../../interface";

export const renderItem = (item: ProxyItem): ProxyItemRendered => {
    let getOrigin: (url: string, req: APIContext) => string;
    let i = 0
    if (typeof item.origin === 'string') {
        if (/^https?:\/\//.test(item.origin)) {
            getOrigin = () => item.origin.toString()
        } else {
            throw new Error('代理配置origin错误')
        }
    } else if (Array.isArray(item.origin)) {
        const origins = item.origin.filter(item => /^https?:\/\//.test(item))
        const len = origins.length
        switch (len) {
            case 0:
                throw new Error('代理配置origin错误')
            case 1:
                getOrigin = () => origins[0]
                break
            default:
                getOrigin = () => origins[i++ % len]
                break
        }
    } else {
        getOrigin = item.origin
    }

    let match = item.match || (
        item.location instanceof RegExp ? function (url: string) {
            return (item.location as RegExp).test(url)
        } : function (url: string = '/') {
            return url.startsWith(item.location as string | '/')
        }
    )
    return {
        ...item,
        match,
        getOrigin,
    }
}