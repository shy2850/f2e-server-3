// @ts-check
const { queryparams, Route, createAuthHelper } = require("../lib/index.js");

/**
 * @type {import("../lib/index.js").ServerAPI}
 */
const server_time = async (body, ctx) => {
    const data = queryparams(ctx.location.search)
    const post = body && JSON.parse(body.toString())
    return {
        data, post, body,
        time: Date.now()
    }
}

/**
 * @type {import("../lib/index.js").MiddlewareCreater}
 */
exports.server = {
    name: 'base_app',
    mode: ['dev', 'prod'],
    execute: (conf) => {
        const route = new Route(conf)
        const { getLoginUser } = createAuthHelper(conf.auth || {})

        /** 返回 sse, 支持配置轮询时间 */
        route.on('sse/time', server_time, { type: 'sse' })
        /** 返回普通JSON格式 */
        route.on('server/time', server_time)
        /** 返回普通jsonp格式, 支持callback参数 */
        route.on('server/time.js', server_time, { type: 'jsonp' })

        route.on('auth/loginUser', (body, ctx) => {
            return {
                user: getLoginUser(ctx),
            }
        })
        return {
            onRoute: route.execute
        }
    }
}