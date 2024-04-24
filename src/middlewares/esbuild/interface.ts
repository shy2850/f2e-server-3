/**
 * esbuild配置
 */
export interface EsbuildConfig {
    /** esbuild配置文件地址
     */
    esbuildrc: string;
    /**
     * 是否构建外部依赖
     */
    build_external: boolean;
    /**
     * 是否生成metafile
     */
    with_metafile: boolean;
}