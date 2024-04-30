import { ServerAPI, queryparams, MiddlewareCreater, Route } from "../src";
import { createAuthHelper } from "../src/middlewares/auth";

export interface ServerTimeResp {
    time: number;
    [k:string]: any;
}
const server_time: ServerAPI = async (body, ctx) => {
    const data = queryparams(ctx.location.search)
    const post = body && JSON.parse(body.toString())
    return {
        data, post, body,
        time: Date.now()
    }
}

export const server: MiddlewareCreater = (conf) => {
    const route = new Route(conf)
    const { getLoginUser } = createAuthHelper(conf)

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
        name: 'base_app',
        mode: ['dev', 'prod'],
        onRoute: route.execute
    }
}