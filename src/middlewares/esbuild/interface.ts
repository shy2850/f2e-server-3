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
    /**
     * 匹配html文件, 注入脚本
     * @default /index\.html$/
     */
    reg_inject?: RegExp;
    /**
     * 如何替换脚本
     * @default {} /<script\s.*?src="(.*?)".*?>\s*<\/script\>/g
     */
    reg_replacer?: RegExp;
    /**
     * 缓存目录
     * @default '.f2e_cache'
     */
    cache_root?: string;
    /**
     * 注入全局变量名
     * @default '__f2e_esbuild_inject__'
     */
    inject_global_name?: string;
    /**
     * external bundle 文件名
     * @default 'external_lib_{{index}}.js'
     */
    external_lib_name?: (index: number) => string;
}