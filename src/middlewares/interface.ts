import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { MemoryTree } from "../memory-tree";
import { ConfigMode, F2EConfigResult } from "../interface";

export interface MiddlewareEvents extends Partial<MemoryTree.Events> {
    /**
     * memory-tree首次加载完成时触发
     * @param store memory-tree实例
     */
    onMemoryInit?(store: MemoryTree.Store): void | Promise<void>
    /**
     * memory-tree首次加载完成时触发
     * @param store memory-tree实例
     */
    onMemoryLoad?(store: MemoryTree.Store): void | Promise<void>
    /**
     * 路由解析前执行
     * @param pathname 格式化之后的路径，形如: api/user/list
     * @param req      请求对象
     * @param resp     响应对象
     */
    beforeRoute?: {
        (pathname: string, req: HttpRequest, resp: HttpResponse): string | false | void | Promise<string | false | void>
    };
    /**
     * 路由解析后执行
     * @param pathname 格式化之后的路径，形如: api/user/list
     * @param req      请求对象
     * @param resp     响应对象
     * @param store    memory-tree实例
     * @param body     POST请求完成的body
     */
    onRoute?: {
        (pathname: string, req: HttpRequest, resp: HttpResponse, store?: MemoryTree.Store, body?: Buffer): string | false | void | Promise<string | false | void>
    };
}
export interface MiddlewareResult extends MiddlewareEvents {
    /** 该中间件可以在哪些mode下运行 */
    mode: ConfigMode[];
    /** 中间件名称，没有实际意义，方便调试 */
    name: string;
}
export interface MiddlewareCreater {
    (conf: F2EConfigResult): MiddlewareResult | undefined;
}

export interface MiddlewareReference {
    middleware: string;
    options?: any;
}