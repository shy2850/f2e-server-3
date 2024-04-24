// @ts-check

const { marked } = require('marked');

let i = 1;
/**
 * @type {import('.').F2EConfig}
 */
const config = {
    port: 2850,
    mode: 'dev',
    gzip: true,
    mimeTypes: {
        'ts': 'text/plain'
    },
    try_files: [
        { test: /redirect/, location: '/package.json' },
        { test: /^test/, index: 'test/index.html', }
    ],
    gzip_filter: () => true,
    buildFilter: (pathname) => {
        return /^(src|index|test|README|package|$)/.test(pathname)
    },
    onRoute: (pathname, req, resp, body) => {
        if (/src/i.test(pathname)) {
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
        replacer (output, hash) {
            /** sourcemap文件不改名 */
            if (/\.(map|js\.json)$/.test(output)) {
                return '/' + output + '?' + hash
            }
            return '/' + output.replace(/\.(\w+)$/, `-${hash}.$1`)
        }
    },
    proxies: ['/uniadmin', '/api', '/uni-auth'].map(location => {
        return {
            location,
            origin: 'http://172.16.128.207:18588',
            requestHeaders: headers => {
                return {
                    ...headers,
                    cookie: 'AUTH_SESSION_ID=uniAuth:session:32212d8c76e49b30f24b1bc670620c11'
                }
            },
            responseRender: a => a,
        }
    }),
}

module.exports = config