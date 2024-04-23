import { MiddlewareEvents } from "../middlewares/interface";
import { APIContext } from "../interface";

type Execute = Required<MiddlewareEvents>['onRoute']

export interface ServerAPI<T extends object = object, F = any, R extends object = object> {
    (body: null | T, ctx: APIContext & R ): F | Promise<F>
}
export interface RouteItem<T extends object = object, F = any> {
    path: string | RegExp
    handler: ServerAPI<T, F>
    method?: '*' | string
    /**
     * 响应类型
     * @default 'json'
     * 除去默认类型外，还可以是自定义的响应类型，接口根据后缀返回对应的MIME类型字符串
     */
    type?: 'json' | 'jsonp' | 'sse' | 'raw'
    /** 响应类型为raw时 表示资源后缀，根据后缀自动填充mime
     * @default 'json'
     */
    sourceType?: string
    /** 一般将path为string的加入cache，正则的不加入 */
    cache?: boolean
    
    /**
     * type = 'sse'时，interval为轮询间隔, 设置为false时，只触发心跳，需要自己主动触发 resp.write 信息进行推送
     * @default 1000
     */
    interval?: false | number;
    /**
     * type = 'sse'时，interval_beat为心跳间隔
     * @default 30000
     */
    interval_beat?: false | number;
    /** type = 'sse'时，心跳数据
     * @default ''
     */
    default_content?: string;
}
export interface IRoute {
    routes: RouteItem[];
    /** 设置路由 */
    on: (path: RouteItem['path'], handler: RouteItem['handler'], ext?: Omit<RouteItem, 'path' | 'handler'>) => void;
    /** 获取匹配路由 */
    match: (path: string, method?: string) => RouteItem | undefined;
    /** 执行函数 */
    execute: Execute;
}