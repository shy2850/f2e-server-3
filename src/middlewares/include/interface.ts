export interface IncludeItem {
    src: string;
    data: string;
}
export interface IncludeResult {
    items: IncludeItem[];
    result: string;
}

export interface IncludeLoaders {
    [suffix: string]: {
        /** 解析入口文件, replace字符串结果，并输出过程依赖信息 */
        (content: string, root: string, recursive: boolean): IncludeResult | Promise<IncludeResult>;
    };
}
export interface IncludeConfig {
    /** 入口文件 */
    entryPoints: (string | {
        in: string;
        out: string;
    })[];
    /** 是否递归执行
     * @default false
     */
    recursive?: boolean;
    /** 可以根据入口文件后缀名，配置不同的解析方式 */
    loaders?: IncludeLoaders;
}