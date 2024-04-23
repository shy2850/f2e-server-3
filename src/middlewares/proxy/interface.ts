import { RequestOptions } from "node:http";

export interface ProxyHeaders {
    [k: string]: string | string[];
}
export interface ProxyItem {
    /** 需要代理的路径 */
    location: string | RegExp;
    /** 代理服务的origin，形如: http://127.0.0.1:3000 */
    origin: string | [string, ...string[]];
    /** 代理服务的pathname，形如: /api，用于原始请求pathname的replacer */
    pathname?: string | {
        (s: string, ...args: any[]): string;
    };
    /** 超时时间，超时后返回504 */
    timeout?: number;
    
    /**
     * 代理请求发起前执行： 可用于设置请求头等操作
    */
    requestHeaders?: { (headers: ProxyHeaders): ProxyHeaders };
    /**
     * 响应结束前执行： 可用于设置响应头等操作
    */
    responseHeaders?: { (headers: ProxyHeaders): ProxyHeaders };
    /** 代理请求参数统一设置 */
    requestOptions?: RequestOptions;
    /** 代理响应结果修改后输出 */
    responseRender?: (buffer: Buffer) => string | Buffer
}

export interface ProxyItemRendered extends ProxyItem {
    /** url 均以 / 开头 */
    match: (url: string, search?: string) => boolean;
    getOrigin: () => string;
}