// import type { AcceptedPlugin, ProcessOptions } from 'postcss';
// import type { Config as TailwindConfig } from 'tailwindcss';

/** 为了减少默认依赖，这里使用 any 来代替 */
type AcceptedPlugin = any;
type ProcessOptions = any;
type TailwindConfig = any;

export interface PostCssConfig {
    /**
     * 入口文件, 必须提供所有需要的入口文件
     */
    entryPoints: string | { in: string; out: string };

    /**
     * postcss 编译参数
     */
    plugins?: AcceptedPlugin[];

    /**
     * postcss 编译参数
     */
    processOptions?: ProcessOptions;
    /**
     * tailwind 配置文件路径，配置为对象时直接作为配置项传入
     * @default 默认值: 'tailwind.config.js'
     */
    tailwindConfig?: string | TailwindConfig & { content: string[] };
}