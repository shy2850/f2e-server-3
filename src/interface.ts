import { AppOptions, HttpRequest, HttpResponse, TemplatedApp } from 'uWebSockets.js'
import { MiddlewareCreater, MiddlewareEvents, MiddlewareReference } from './middlewares/interface';
import { MemoryTree } from './memory-tree';

export type ConfigMode = "dev" | "build" | "prod";

/** 启动服务器相关配置 */
export interface ServerConfig {
    /** 项目根路径: 默认为process.cwd() */
    root?: string;
    /** 
     * 默认 2850,
     * 当配置端口为443的时候自动转化为 https 服务 并需要配置 app_options */
    port?: number;
    /**
     * 指定host访问生效
     * 未指定时，只要是访问端口符合就可以，相当于nginx的 servername: _
     */
    host?: string
    /**
     * 主动设置ssl 模式， 默认为 false，优先级高于 port：443
     * 配置 uWebSockets.js 的 app_options, ssl服务需要配置
     */
    ssl?: false | AppOptions;
    /**
     * 服务器 gzip 模式，默认为false
     */
    gzip?: boolean;
    /**
     * 运行时 是否对资源进行 gzip 压缩， gzip开启后生效
     * 可以根据文件路径、文件大小给出结果
     * @default function (pathname, size) { return isText(pathname) && size > 4096 }
     * @param  {string} pathname 资源路径名
     * @param  {number} size 资源大小
     * @return {boolean}
     */
    gzip_filter?: (pathname: string, size: number) => boolean;
    

    /**
     * 响应结束前执行： 可用于设置响应头等操作
    */
    beforeResponseEnd?: { (resp: HttpResponse, req?: HttpRequest): void };
    /**
     * 参考Nginx配置 `try_files` 而产生的功能 (`querystring`已经解析到`req.data`中)
     * 1. 类型为`string`时, 所有未能找到资源的情况都转发到这个 `pathname`
     * 2. 类型为`{test, exec}[]`, 依次循环匹配`test`, 进行转发
     * @default false
     * @suggest "index.html"
     */
    try_files?: false | string | string[] | TryFilesItem[];
    /**
     * 基础服务启动后执行
    */
    onServerCreate?: (app: TemplatedApp, conf: F2EConfigResult) => void;
    /** 映射文件后缀名到指定MIME */
    mimeTypes?: { [key: string]: string };
    /** 流数据分片大小 */
    range_size?: number;

    /** 默认404页面 */
    page_404?: string;
    /** 默认服务端错误页面 */
    page_50x?: string;
    /** 未设置try_files展示目录页面 */
    page_dir?: string | false;
}
export interface F2EConfig extends ServerConfig, Partial<MemoryTree.Options>, Partial<MiddlewareEvents> {
    /** 
     * dev模式下 开启服务器，开启资源动态编译，开启监听文件修改刷新页面 
     * build模式下 关闭服务器，开启资源动态编译并压缩
     * prod模式下 开启服务器，开启服务器资源缓存，关闭编译 【默认：prod模式】
    */
    mode?: ConfigMode;
    
    /** 中间件配置支持函数式或引用式 */
    middlewares?: (MiddlewareCreater | MiddlewareReference)[];

}

/**
 * 参考Nginx配置 `try_files` 而产生的功能 (`querystring`已经解析到`req.data`中)
 * 1. 类型为`string`时, 所有未能找到资源的情况都转发到这个 `pathname`
 * 2. 类型为`{test, exec}[]`, 依次循环匹配`test`, 进行转发
 * @suggest "index.html"
 */
export type TryFilesItem = {
    test: RegExp,
    replacer?: string | { (m: string, ...args: any[]): string },
} & (
    { index: string | { (pathname: string, req: HttpRequest, resp: HttpResponse, store: MemoryTree.Store): string } }
    | { location: string | { (pathname: string, req: HttpRequest, resp: HttpResponse, store: MemoryTree.Store): string } }
)

/** 通过计算得到配置 */
export type F2EConfigResult = Omit<Required<F2EConfig>, keyof MiddlewareEvents | 'middlewares'>