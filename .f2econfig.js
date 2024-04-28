// @ts-check

const { marked } = require('marked');

let i = 1;
/**
 * @type {import('./src/interface').F2EConfig}
 */
const config = {
    port: 2850,
    mode: 'dev',
    gzip: true,
    less: {
        entryPoints: ['test/app/app.less'],
    },
    mimeTypes: {
        'ts': 'text/plain'
    },
    try_files: [
        { test: /redirect/, location: '/package.json' },
        { test: /^home/, index: 'test/index.html', }
    ],
    gzip_filter: () => true,
    buildFilter: (pathname) => {
        return /^(src|index|test($|\/index\.html)|README|package|$)/.test(pathname)
    },
    onRoute: (pathname, req, resp, body) => {
        if (/^src$/i.test(pathname)) {
            resp.writeStatus('200 OK')
            resp.end('hello: ' + i++)
            return false
        }
    },
    onSet: async (pathname, data, store) => {
        if (/\.md$/.test(pathname)) {
            return {
                data: marked(data?.toString() || ""),
                originPath: pathname,
                outputPath: pathname.replace('.md', '.html'),
            }
        }
        return { data, originPath: pathname, outputPath: pathname }
    },
    namehash: {
        // publicPath: 'http://localhost:2850/',
        replacer (output, hash) {
            /** sourcemap文件不改名 */
            if (/\.(map|js\.json)$/.test(output)) {
                return '/' + output + '?' + hash
            }
            return '/' + output.replace(/\.(\w+)$/, `.${hash}.$1`)
        }
    },
    proxies: ['/uniadmin', '/api', '/uni-auth'].map(location => {
        return {
            location,
            origin: 'http://uni.auth:18588',
            requestHeaders: headers => {
                return {
                    ...headers,
                    cookie: 'AUTH_SESSION_ID=uniAuth:session:834dd56e330e80d61f7d6f24cb784f4c'
                }
            },
            responseRender: a => a,
        }
    }),
}

module.exports = config