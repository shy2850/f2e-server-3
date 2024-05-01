# f2e-server-3

## 介绍
简化[f2e-server](https://f2e-server.gitbook.io/f2e-server)的配置，支持esbuild、less等编译模块，支持代理、热更新等常用开发功能。

## 特性
- 集成uWebSockets.js，并支持bunjs运行环境
    - 提供较为一致的API
    - uWebsockets.js 未安装时，自动降级为nodejs运行环境
- 集成esbuild
    - 支持多套配置
    - 支持热更新
    - **external 配置直接编译成lib-bundle，提高开发效率，减少重复编译**
- 集成less
    - 提供entry配置，类似esbuild的entry配置
    - 支持目录级 include
- 支持http(s)代理
- 支持热更新（基于fs.watch以及serverSentEvents实现）
- 支持类似nginx的try_files配置功能，提供更复杂的配置
- 支持自定义中间件（esbuild、less、热更新、http代理等均是通过该方式内置实现）
- 提供接口快速开发的[Route](src/routes/Route.ts)工具，并支持了[登录鉴权](src/middlewares/auth/index.ts)认证机制，方便快速开发

## 安装
```bash
npm install f2e-server-3 --save-dev
```
如果使用[uWebsockets.js](https://github.com/uNetworking/uWebSockets.js), 请从[github](https://github.com/uNetworking/uWebSockets.js/)安装

## 快速开始
start.mjs
```js
import { createServer, UserStore } from 'f2e-server3'
createServer({})
```
执行 `node start.mjs` 或者 `bun start.mjs`
```sh
$ node start.mjs
server start on http://127.0.0.1:2850
```

## 功能以及参数配置
### 基础环境配置  [server config](src/interface.ts#L28)
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| mode | `"dev","build","prod"` | `"prod"` | 全局模式设置，根据环境设置多个配置，中间件启用也是根据mode进行 |

### 基础服务配置  [server config](src/interface.ts#L28)
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
| range_size | number | `1024 * 1024 * 10` | 流数据分片大小 |
| page_404 | string | [page_404.hbs](templates/page_404.hbs) | 404页面模板 |
| page_50x | string | [page_500.hbs](templates/page_500.hbs) | 500页面模板 |
| page_dir | string | [page_dir.hbs](templates/page_dir.hbs) | 展示目录页面模板 |
| onServerCreate | ([TemplatedApp](src/types/uWebSockets.js.ts#L287), [F2EConfigResult](src/interface.ts#L125)) => void | `null` | 基础服务启动后执行 |

### esbuild配置
mode = `prod` 时，esbuild配置无效

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| esbuild | [EsbuildConfig](src/middlewares/esbuild/interface.ts) | `{esbuildrc: "./esbuildrc.js", build_external: true}` | esbuild配置 |
| esbuild.esbuildrc | string | `"./esbuildrc.js"` | esbuild配置文件路径,相对执行目录，参考: [.esbuildrc.js](.esbuildrc.js) |
| esbuild.build_external | boolean | `true` | 是否编译成lib-bundle，启用后，esbuild会直接编译成lib-bundle，减少重复编译 |

### try_files配置
mode = `build` 时，try_files配置无效
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| try_files | [TryFilesConfig](src/interface.ts#L94) | `"index.html"` | 配置try_files规则 |

### less配置
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| less | [LessConfig](src/middlewares/less/interface.ts) | `false` | less配置 |

### http代理配置
mode = `build` 时，http代理配置无效
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| proxies | [ProxyConfig](src/middlewares/proxy/interface.ts)[] | [] | http代理配置 |
| proxy.location | string |  | 代理路径,如: `/api` |
| proxy.origin | string |  | 代理目标origin,如: `http://127.0.0.1:8080` |
| proxy.pathname | string or `(pathname) => string` |  | 代理路径重写，String.prototype.replacer |
| proxy.timeout | number | `5000` | 单位ms,代理请求超时 |
| proxy.requestHeaders | `{ (headers: HttpHeaders): HttpHeaders }` | | 代理请求前执行 |
| proxy.responseHeaders | `{ (headers: HttpHeaders): HttpHeaders }` |  | 代理响应前执行 |
| proxy.requestOptions | `http.RequestOptions` |  | 设置代理请求选项 |
| proxy.responseRender | `(buffer: Buffer) => string` |  | 代理响应结果修改后输出 |

### livereload配置
仅当 mode = `dev` 时，livereload配置生效
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| livereload | [LivereloadConfig](src/middlewares/livereload/interface.ts) | `false` | livereload配置 |
| livereload.prefix | string | `"server-sent-bit"` | sse接口路径 |
| livereload.heartBeatTimeout | number | `30000` | sse心跳超时时间(ms), 如果一直没有触发livereload，发送心跳防止断开连接 |
| livereload.reg_inject | RegExp | `/index\.html$/` | 匹配html文件注入sse脚本 |

### auth 配置
支持简单的登录验证
参考： [test/index.ts](test/index.ts) 
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| auth | [AuthConfig](src/middlewares/auth/interface.ts) | `false` | auth配置 |
| auth.login_path | string | `"/login"` | 登录页面路径 |
| auth.login_page | string | [page_login.hbs](templates/page_login.hbs) | 登录页面模板 |
| auth.max_login_count | number | `1` | 同一个账户最多登录客户端个数,超出后最早登录的客户端会被退出登录 |
| auth.max_error_count | number | `5` | 登录出错次数达到限制后，禁止登录一段时间 |
| auth.cookie | [Cookie](src/utils/cookie.ts) | `{ name: 'f2e_auth', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: true, sameSite: 'strict' }` | cookie配置修改客户端登录超时时间等 |
| auth.store | [UserStore](src/middlewares/auth/interface.ts#L26) | | 用户存储引擎 |
| auth.store.getUser | `(username: string, password: string): Promise<LoginUser>` | | 判断账户密码是否匹配 |



## 其他参考示例
[https://gitee.com/f2e-server/f2e-react-app/tree/f2e-server3/](https://gitee.com/f2e-server/f2e-react-app/tree/f2e-server3/)
