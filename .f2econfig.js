// @ts-check

let i = 1;
/**
 * @type {import('.').F2EConfig}
 */
const config = {
    mode: 'dev',
    onRoute: (pathname, req, resp, body) => {
        if (/hello/i.test(pathname))
        resp.cork(() => {
            resp.end('hello: ' + i++)
        })
        return false
    }
}

module.exports = config