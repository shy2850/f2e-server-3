const PluginPostCSS = require('esbuild-plugin-postcss').default;
// @ts-check
/**
 * @type { (import('esbuild').BuildOptions & {hot_modules: string[]})[] }
 */
let config = [
    {
        entryPoints: {
            index: 'test/app/index.tsx'
        },
        outdir: 'static',
        bundle: true,
        format: 'iife',
        target: 'chrome70',
        plugins: [
            PluginPostCSS({
                declaration: true,
            })
        ],
        external: [
            'react',
            'react-dom/client',
            'antd',
            'antd/locale/zh_CN',
            '@ant-design/icons',
            'dayjs',
            'dayjs/locale/zh-cn',
        ],
        hot_modules: [
            "@/Hello",
        ],
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts'
        },
        tsconfig: './tsconfig.json',
    },
];

module.exports = config