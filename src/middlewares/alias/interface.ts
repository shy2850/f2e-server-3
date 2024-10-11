import { RequestOptions } from "node:http";

/**
 * 索引资源配置
 * 将原始资源映射到指定路径out
 * 原始路径支持绝对路径和http(s)协议URL，不支持相对路径
 * 只在资源构建之前加载一次, 配置不当，可能被其他构建结果覆盖
*/
export type AliasConfig = {[out: string]: string | { url: string; options?: RequestOptions }}