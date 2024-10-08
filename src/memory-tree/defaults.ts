import { isArrayBufferView } from "node:util/types";
import logger from "../utils/logger";
import { MemoryTree } from "./interface";

/** 默认过滤掉 node_modules 目录 和 output 目录以及 .开头的隐藏文件 */
const DefaultWatchFilter = (path: string) => {
    return !/(node_modules|(^|[\\\/])\.\w+|output)/.test(path);
};
const DefaultBuildFilter = (path: string, size = 0) => {
    if (size > 100 * 1024 * 1024) {
        return false
    }
    return DefaultWatchFilter(path);
};
const DefaultOutputFilter = (path: string, data: MemoryTree.DataBuffer) => {
    if (typeof data === 'string') {
        return DefaultBuildFilter(path, data.length);
    }
    if (!data) {
        return false
    }
    return DefaultBuildFilter(path, isArrayBufferView(data) ? data.byteLength : 0);
};
/** 默认监听文件变化打印日志 */
const DefaultWatcher = (path: string, event: string) => {
    return logger.debug(path, event);
};
/** 默认设置资源的输入输出路径相同 */
const DefaultOnSet: MemoryTree.Options['onSet'] = async (pathname, data) => {
    return {
        data,
        originPath: pathname,
        outputPath: pathname,
    };
};
/** 默认设置资源直接输出 */
const DefaultOnGet: MemoryTree.Options['onGet'] = async (_pathname, data) => {
    return data;
};

/** 默认参数 */
export const defaultOptions: MemoryTree.Options = {
    root: process.cwd(),
    watch: false,
    buildFilter: DefaultBuildFilter,
    watchFilter: DefaultWatchFilter,
    buildWatcher: DefaultWatcher,
    onSet: DefaultOnSet,
    onGet: DefaultOnGet,
    outputFilter: DefaultOutputFilter,
}
