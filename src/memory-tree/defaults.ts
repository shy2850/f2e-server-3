import logger from "../utils/logger";
import { MemoryTree } from "./interface";

/** 默认过滤掉 node_modules 目录 和 output 目录以及 .开头的隐藏文件 */
export const DefaultFilter = (path: string) => {
    return !/(node_modules|(^|[\\\/])\.\w+|output)/.test(path);
};
/** 默认监听文件变化打印日志 */
export const DefaultWatcher = (path: string) => {
    return logger.debug(path);
};
/** 默认设置资源的输入输出路径相同 */
export const DefaultOnSet: MemoryTree.Options['onSet'] = async (pathname, data) => {
    return {
        data,
        originPath: pathname,
        outputPath: pathname,
    };
};
/** 默认设置资源直接输出 */
export const DefaultOnGet: MemoryTree.Options['onGet'] = async (_pathname, data) => {
    return data;
};

/** 默认参数 */
export const defaultOptions: MemoryTree.Options = {
    root: process.cwd(),
    watch: false,
    buildFilter: DefaultFilter,
    watchFilter: DefaultFilter,
    buildWatcher: DefaultWatcher,
    onSet: DefaultOnSet,
    onGet: DefaultOnGet,
    outputFilter: DefaultFilter,
}
