import { addRoute, createServer, logger, RouterDecorator, RouterContext, queryparams, ServerAPI } from "../src"
logger.setLevel('DEBUG')

const server_time = async (body: any, ctx: RouterContext) => {
    const data = queryparams(ctx.location.search)
    return {
        params: ctx.params,
        data, post: body,
        time: Date.now()
    }
}
/**
 * @demo /server_time.js?callback=jQuery123456789
 */
addRoute('/server_time.js', server_time, { type: 'jsonp' })

class App {
    /**
     * @demo /api/123/user?callback=jQuery123456789
     */
    @RouterDecorator('api/:id/:name', { type: 'jsonp' })
    api2(body: any, ctx: RouterContext) {
        return ctx.params
    }
    @RouterDecorator('/sse/time', { type: 'sse' })
    info() {
        return {
            time: new Date().toLocaleString()
        }
    }
    @RouterDecorator('/api/:id', { method: 'POST' })
    api(body: any, ctx: RouterContext) {
        return {
            time: new Date().toLocaleString(),
            params: ctx.params,
        }
    }
}

createServer({
    mode: 'prod',
    buildFilter: () => false,
    gzip: true,
})
