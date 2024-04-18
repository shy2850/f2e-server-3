// @ts-check

const { marked } = require('marked');

let i = 1;
/**
 * @type {import('.').F2EConfig}
 */
const config = {
    mode: 'dev',
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
            console.log(pathname, data?.toString())
            return {
                data: marked(data?.toString() || ""),
                originPath: pathname,
                outputPath: pathname.replace('.md', '.html'),
            }
        }
        return { data, originPath: pathname, outputPath: pathname }
    },
}

module.exports = config