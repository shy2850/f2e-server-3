export interface LessConfig {
    /**
     * 不编译哪些文件
     * 优先级低于 only
    */
    ignore?: string[];
    /** 
     * 仅编译哪些文件
     * 优先级高于 ignore
     */
    only?: string[];

    buildOptions?: Less.Options;
}