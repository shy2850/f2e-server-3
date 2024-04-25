// @ts-check
/**
 * @type { import('esbuild').BuildOptions[] }
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
        external: [
            'react',
            'react-dom/client',
            'antd',
            'antd/locale/zh_CN',
            '@ant-design/icons',
            'dayjs',
            'dayjs/locale/zh-cn',
        ],
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts'
        },
        tsconfig: './tsconfig.json',
    },
];

module.exports = config