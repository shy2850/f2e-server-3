export interface LessConfig {
    /**
     * 入口文件, 必须提供所有需要的入口文件
     */
    entryPoints: (string | { in: string; out: string })[];

    /**
     * 构建选项
     */
    buildOptions?: Less.Options;
}