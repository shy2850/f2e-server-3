import { IncomingMessage } from "node:http";
import { HttpHeaders } from "../../utils/resp";
import { APIContext } from "../../interface";
import { RequestOptions } from "node:https";

export interface ProxyItem {
    /** 需要代理的路径 */
    location: string | RegExp;
    /** 优先匹配规则，忽略location匹配，但是仍然通过location和pathname进行路径修改，可以用于相同路径不同的query、headers等分别处理 */
    match?: (url: string, ctx: APIContext) => boolean;
    /** 代理服务的origin，形如: http://127.0.0.1:3000 */
    origin: string | [string, ...string[]] | {(url: string, req: APIContext): string};
    /** 代理服务的pathname，形如: /api，用于原始请求pathname的replacer */
    pathname?: string | {
        (s: string, ...args: any[]): string;
    };
    /** 超时时间，超时后返回504 */
    timeout?: number;
    
    /**
     * 代理请求发起前执行： 可用于设置请求头等操作
    */
    requestHeaders?: { (headers: HttpHeaders, ctx: APIContext): HttpHeaders };
    /**
     * 响应结束前执行： 可用于设置响应头等操作
    */
    responseHeaders?: { (headers: HttpHeaders, resp: IncomingMessage, ctx: APIContext): HttpHeaders };
    /** 代理请求参数统一设置 */
    requestOptions?: RequestOptions;
    /** 代理响应结果修改后输出 */
    responseRender?: (buffer: Buffer, resp: IncomingMessage, ctx: APIContext) => string | Buffer;

    /** 存储代理请求结果 */
    saver?: {
        /** 矫正存储请求路径 */
        pathFixer?: {(pathname: string, ctx: APIContext): string};
        /** 存储请求体目录 */
        pathBodyDir: string;
        /** 存储响应头文件 */
        pathHeaders: string;
    };
}

export interface ProxyItemRendered extends ProxyItem {
    /** 处理后的 match */
    match: (url: string, ctx: APIContext) => boolean;
    /** url 均以 / 开头 */
    getOrigin: (url: string, ctx: APIContext) => string;
}