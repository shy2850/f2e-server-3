import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { MemoryTree } from "../memory-tree";
import { APIContext, ConfigMode, F2EConfigResult } from "../interface";

export interface MiddlewareEvents extends Partial<MemoryTree.Events> {
    /**
     * memory-tree首次加载前触发
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
     */
    beforeRoute?: {
        (pathname: string, ctx: APIContext): string | false | void | Promise<string | false | void>
    };
    /**
     * 路由解析后执行
     */
    onRoute?: {
        (pathname: string, ctx: APIContext): string | false | void | Promise<string | false | void>
    };
}
export interface MiddlewareCreater {
    /** 该中间件可以在哪些mode下运行
     * @default {} ['dev', 'build', 'prod']
    */
    mode?: ConfigMode[];
    /** 中间件名称，没有实际意义，方便调试 */
    name?: string;
    /**
     * 执行器，返回需要各环节操作的事件
     */
    execute: {(conf: F2EConfigResult): MiddlewareEvents | undefined | Promise<MiddlewareEvents | undefined>};

}

export interface MiddlewareReference {
    middleware: string;
    options?: any;
}