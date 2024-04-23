import { APIContext } from "../../interface";

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
    { index: string | { (pathname: string, ctx: APIContext): string } }
    | { location: string | { (pathname: string, ctx: APIContext): string } }
)