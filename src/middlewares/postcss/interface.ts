// import type { AcceptedPlugin, ProcessOptions } from 'postcss';

import { MemoryTree } from "../../memory-tree";

/** 为了减少默认依赖，这里使用 any 来代替 */
type AcceptedPlugin = any;
type ProcessOptions = any;

export interface PostCssConfig {
    /**
     * 入口文件, 必须提供所有需要的入口文件
     */
    entryPoints: string | { in: string; out: string };
    /**
     * 监控需要修改的文件，重新编译
     * @default {}  使用 f2e-server3 总配置 watchFilter
     */
    watchFilter?: MemoryTree.Events['watchFilter'];

    /**
     * postcss 编译参数
     */
    plugins?: AcceptedPlugin[];

    /**
     * postcss 编译参数
     */
    processOptions?: ProcessOptions;
}