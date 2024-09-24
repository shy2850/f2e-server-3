# f2e-server-3

## 介绍
前端服务器[f2e-server](https://gitee.com/f2e-server/f2e-server-3)是基于node.js(bunjs 或 uWebSockets.js) 开发的HTTP服务器。
集成了livereload 热更新、less编译、postcss编译、http(s)代理等常用前端开发工具, 同时还提供了简单的服务端开发框架工具，如：路由、鉴权、权限管理等。

## 快速开始
快速启动一个静态服务器
```bash
npm install f2e-server-3 --save-dev
```
创建启动文件 start.mjs
```js
// @ts-check
import { createServer, logger } from 'f2e-server3'
logger.setLevel('DEBUG')
createServer({})
```
执行 `node start.mjs` 或者 `bun start.mjs`
```sh
$ node start.mjs
Server start on http://localhost:2850
```
> 如果使用[uWebsockets.js](https://github.com/uNetworking/uWebSockets.js), 请从[github](https://github.com/uNetworking/uWebSockets.js/)安装，安装好后，重启即可。

## mode 配置
f2e-server 提供了三种运行模式，分别为：`prod`，`build` 和 `dev`。
1. `prod` 模式：生产环境，作为正式web服务器使用，通常需要对资源进行编译的功能不会开启。
2. `build` 模式：构建环境，不开启服务器功能，仅对资源进行编译功能开启，并且内置编译工具默认对资源进行压缩。
3. `dev` 模式：开发环境，同时开启服务器功能和资源编译功能，例如热更新仅在 `dev` 环境开启。
配置参考如下：
```js
createServer({ mode: 'dev' })
```

## http 服务器
f2e-server 基础功能为WEB服务器，支持使用 [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) 作为http服务器，如果未安装，则会自动降级为nodejs运行环境。  
作为WEB服务器，f2e-server 支持http服务器常用配置如下表：[ServerConfig](src/interface.ts#L32)  

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| root | string | 执行目录 | 服务器资源根目录 |
| port | number | `2850` | 监听端口 |
| host | string | `0.0.0.0` | 监听地址 |
| ssl | [AppOptions](src/types/uWebSockets.js.ts#L268) | `false` | 是否启用ssl并提供配置 |
| gzip | boolean | `false` | 是否启用gzip |
| gzip_filter | `(string, number) => boolean` | `(pathname, size) => isText(pathname) && size > 4096` | 过滤哪些资源启用gzip |
| cache_filter | `(string, number) => boolean` | `(pathname) => !/\.html?$/.test(pathname)` | 过滤哪些资源响应缓存cache-control |
| mimeTypes | `{ [key: string]: string }` | `{}` | 映射文件后缀名到指定MIME, 如:`{'less': 'text/css'}` |
| range_size | number | `1024 * 1024 * 10` | 流数据分片大小，用于大文件下载，如：视频文件播放 |
| page_404 | string | [page_404.hbs](templates/page_404.hbs) | 404页面模板 |
| page_50x | string | [page_500.hbs](templates/page_500.hbs) | 500页面模板 |
| page_dir | string | [page_dir.hbs](templates/page_dir.hbs) | 展示目录页面模板 |
| onServerCreate | ([TemplatedApp](src/types/uWebSockets.js.ts#L287), [F2EConfigResult](src/interface.ts#L125)) => void | `null` | 基础服务启动后执行, 可以用来添加websocket支持


## livereload 热更新
热更新在浏览器端通过 [EventSource](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource) 进行监听，在配置中添加`mode`为`"dev"`，即可开启热更新
```js
createServer({ mode: 'dev' })
```
默认对所有后缀为 `.html` 的资源文件开启热更新监听（插入监听脚本）
如需修改：添加配置参数
```js
{
    livereload: {
        reg_inject: /\.(html|md)$/,
    },
}
```
更多配置参考: [livereload](src/middlewares/livereload/interface.ts)

## try_files 默认首页
try_files 是Nginx中配置的默认首页，f2e-server 提供了类似支持的配置
```js
{
    // 默认首页为项目根路径的 index.html
    try_files: "index.html",
}
```
如果有更复杂的需求，可自定义try_files配置，参考：[try_files](src/middlewares/try_files/interface.ts)，例如：
```js
{
    try_files: [
        // 支持正则匹配路径进行 重定向跳转新路径
        { test: /redirect/, location: '/package.json' },
        // 支持正则匹配路径，并默认其他首页文件
        { test: /^home/, index: 'test/index.html', },
        // 支持通过 search 参数进行判断是否默认首页
        { test: /^profile/, match(pathname, ctx) {
            return /^profile/.test(pathname) && ctx.location.searchParams.get('toindex') != 'false'
        }, index: 'profile.html', },
        // 前置匹配失败后，默认首页为index.html
        "index.html"
    ]
}
``` 

## esbuild 构建
f2e-server 提供了esbuild构建支持，开启条件：
1. mode = `dev` or `build` 
2. 需要安装 `npm install esbuild`
3. 存在配置文件 [`.esbuildrc.js`](.esbuildrc.js)
4. 启动配置参考：[EsbuildConfig](src/middlewares/esbuild/interface.ts)
```js
{
    esbuild: {
        // esbuild配置文件路径，默认：./.esbuildrc.js
        esbuildrc: "./.esbuildrc.js",
        // 特色功能，esbuild构建 externals 会生成一个前置文件，自动引入所有依赖的资源，如果不需要此功能，可关闭
        build_external: true,
    }
}
```

## LESS 构建
f2e-server 提供了[less](https://lesscss.org/)构建支持，开启条件：
1. mode = `dev` or `build` 
2. 需要安装 `npm install less`
3. 启动配置参考：[LessConfig](src/middlewares/less/interface.ts)
```js
{
    less: {
        entryPoints: [
            // 构建原路径和输出路径相同，仅修改后缀名为css
            'css/style.less',
            // 构建原路径和输出路径不同
            { in: 'css/style2.less', out: 'static/bundle.css' },
        ],
    },
}
```


## PostCSS 构建
f2e-server 提供了[postcss](https://postcss.org/)构建支持，开启条件：
1. mode = `dev` or `build` 
2. 需要安装 `npm install postcss`
3. 启动配置参考：[PostCssConfig](src/middlewares/postcss/interface.ts#L9)
```js
{
    postcss: {
        entryPoints: 'css/main.css',
        plugins: [require('autoprefixer')],
    },
}
```

### tailwindcss 支持
f2e-server 通过集成postcss编译 [tailwindcss](https://tailwindcss.com/)，开启条件：
1. PostCSS 构建配置完成
2. 需要安装 `npm install tailwindcss`
3. 修改入口文件为 `css/main.css`，添加tailwind配置
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
4. 修改启动配置参数
```js
{
    postcss: {
        /** tailwindcss 主文件 */
        entryPoints: 'css/main.css',
        tailwindConfig: {
            // 配置所有 HTML 模板、JS 组件和任何其他包含 Tailwind 类名称的文件的路径的地方
            content: ['./src/**/*.{html,ts,tsx}'],
        },
    },
}
```
>  或者 启动目录下创建 [tailwind.config.js](https://tailwind.nodejs.cn/docs/configuration)  

## proxy 代理http(s)
f2e-server 提供了代理http(s)支持，开启条件：
1. mode = `dev` or `prod` 
2. 添加启动配置参数：
```js
{
    proxies: [
        // 如果需要将 localhost/api 转发到 api.server.com/api
        { location: '/api', origin: 'http://api.server.com/' },
        // 如果需要将 localhost/api1 转发到 api1.server.com/api/v1
        { location: /^\/?api1/, origin: 'http://api1.server.com/', pathname: '/api/v1' },
    ],
}
```
详细配置参考：[ProxyItem](src/middlewares/proxy/interface.ts#L6)
### webdownload 站点下载
f2e-server 通过代理http(s)可以协助实现站点下载，参考配置 [ProxyItem.saver](src/middlewares/proxy/interface.ts#L34)
```js
{
    proxies: [
        {
            location: '/', origin: 'https://www.runoob.com/', timeout: 120000,
            // 添加下载保存配置后，重复请求资源将从本地已存储的资源读取
            saver: {
                pathBodyDir: '/tmp/path/body',
                pathHeaders: '/tmp/path/headers',
            }
        },
    ],
}
```  

## pipeline 构建流程  
f2e-server 核心来自于[MiddlewareEvents](src/middlewares/interface.ts#L5)所有环节事件的定义、组织和执行，所有编译构建http请求处理工作均通过事件处理构建完成。**整体流程**包括：
1. 开启服务器
2. 开启编译流程
3. 开启监听流程（如果需要的话）
4. 执行请求处理并返回结果

### build 编译流程
1. `onMemoryInit` 执行后开启资源编译，先递归的检索目录下所有资源
2. `buildFilter` 过滤需要构建的文件或目录，减少不必要的资源编译
3. `onSet` 根据文件路径和内容生成编译结果信息存入内存，主要编译工作在这里完成
4. `onMemoryLoad` 资源编译完成后执行
5. 执行输出资源到指定目录
6. `outputFilter` 根据过滤条件进行过滤输出
7. `onGet` 正式输出前执行
### watch 监听流程
1. 开启资源监听
2. `watchFilter` 过滤需要监听的文件或目录，如果监听到有效修改触发一套编译流程
3. `buildWatcher` 一套编译流程完成后触发
### request 请求处理流程
1. `beforeRoute` 请求到达后最开始执行
2. `onRoute` 处理完成前置操作(如：POST请求数据接收完成)后执行
3. `onGet` 如果 `onRoute` 执行完成匹配对应资源，则将执行 `onGet` 通过http响应输出资源


## middleware 中间件开发
f2e-server 根据以上 pipeline 构建流程提供中间件开发接口规范，详细参考：[MiddlewareCreater](src/middlewares/interface.ts#L29)

```js
{
    middlewares: [
        // MiddlewareCreater
        {
            // 支持的模式
            mode: ['dev', 'build', 'prod'],
            // 自定义名称
            name: 'myapp',
            execute: async (conf: F2EConfigResult) => {
                return {
                    // pipeline构建流程处理函数
                    onSet, onGet, onRoute, ...
                }
            }
        },
    ]
}
```

## route 服务端开发
f2e-server 通过中间件开发方式，可以提供简单的服务端接口开发，只需要中间件定义支持的模式和返回 `onRoute` 函数，简单参考样例 [apis.mjs](./test/apis.mjs)
```js
// @ts-check
import { queryparams, Route } from "f2e-server3";

/**
 * @type {import('f2e-server3').ServerAPI}
 */
const server_time = async (body, ctx) => {
    const data = queryparams(ctx.location.search)
    return {
        data, post: body,
        time: Date.now()
    }
}

/**
 * @type {import('f2e-server3').MiddlewareCreater}
 */
export const server = {
    name: 'apis',
    mode: ['dev', 'prod'],
    execute: (conf) => {
        const route = new Route(conf)
    
        /** 返回普通JSON格式 */
        route.on('api/time', server_time)
        /** 返回普通jsonp格式, 支持callback参数 */
        route.on('api/time.js', server_time, { type: 'jsonp' })
        /** 返回 sse, 支持配置轮询时间 */
        route.on('sse/time', server_time, { type: 'sse' })
    
        return {
            onRoute: route.execute
        }
    }
}
```

## auth 登录鉴权
f2e-server 提供了登录鉴权支持，开启条件：
1. mode = `dev` or `prod`
2. 创建用户密码存储文件，`.f2e_cache/auth.db`, 格式如下: 用户登录名:密码Md5:用户展示名， 每行一个用户
```
admin:e10adc3949ba59abbe56e057f20f883e:管理员
user:e10adc3949ba59abbe56e057f20f883e:用户
user2:e10adc3949ba59abbe56e057f20f883e:用户2
```
3. 添加启动配置参数： 详细配置参考：[AuthConfig](src/middlewares/auth/interface.ts#L35)
```js
import { UserStore } from "f2e-server3";
{
    auth: {
        // 登录成功是否跳转原路径 设置为 true 跳转原路径 设置为 字符串 表示直接跳转的路径
        redirect: true,
        store: new UserStore(
            // 配置 用户存储文件路径
            path.join(process.cwd(), '.f2e_cache/auth.db'),
        ),
    },
}
```
配置完成后，
- 访问 `http://127.0.0.1:2850/login`(如未登录也会自动跳转) 即可登录，默认用户名密码：admin/123456。
- 访问 `http://127.0.0.1:2850/logout` 即可退出登录

### rbac 用户角色权限管理
用户角色权限管理，通过第三方库支持，详细参考：[f2e-middle-rbac](https://gitee.com/f2e-server/f2e-middle-rbac)



## alias 路径别名
alias 路径别名配置，参考：[alias](src/middlewares/alias/interface.ts)  
开启条件： mode = `dev` or `prod`  

```js
{
    alias: {
        // key表示最终构建资源路径，value表示实际资源来源路径
        'css/reset.css': 'node_modules/antd/dist/reset.css',
        // alias还支持直接引入远程资源，如：cdn资源
        'highlight/highlight.js': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
        // 有的资源引入需要修改请求头参数，如：修改请求头Referer参数
        'highlight/highlight.css': {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
            options: {
                headers: { Referer: 'https://cdnjs.cloudflare.com' },
            },
        },
    }
}
```
> 注1：alias配置的资源，在构建时，会直接输出，不会经过中间件处理。


## demos 示例
其他参考
### [f2e-react-app](https://gitee.com/f2e-server/f2e-react-app) 
基于esbuild构建的react单页应用，支持大部分功能展示。
### [f2e-app-vue3](https://gitee.com/f2e-server/f2e-app-vue3) 
基于esbuild构建的vue3的template简单模板。