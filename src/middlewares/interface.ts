import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { MemoryTree } from "../memory-tree";
import { ConfigMode, F2EConfigResult } from "../interface";

export interface MiddlewareEvents extends Partial<MemoryTree.Events> {
    /** 请求解析前执行 */
    beforeRoute?: {
        (pathname: string, req: HttpRequest, resp: HttpResponse, conf?: F2EConfigResult): string | false | void | Promise<string | false | void>
    };
    /** 请求解析后执行 */
    onRoute?: {
        (pathname: string, req: HttpRequest, resp: HttpResponse, body?: Buffer, store?: MemoryTree.Store): string | false | void | Promise<string | false | void>
    };
}
export interface MiddlewareResult extends MiddlewareEvents {
    mode: ConfigMode[];
}
export interface MiddlewareCreater {
    (conf: F2EConfigResult): MiddlewareResult;
}

export interface MiddlewareReference {
    middleware: string;
    options?: any;
}