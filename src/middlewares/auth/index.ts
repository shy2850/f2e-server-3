import { Route, RouteFilter } from "../../routes";
import { MiddlewareCreater } from "../interface";
import { Cookie, createCookie, getCookie } from "../../utils/cookie";
import { createResponseHelper, logger } from "../../utils";
import * as _ from '../../utils/misc'
import { page_layout, page_login } from "../../utils/templates";
import { AuthConfig, LoginInfo } from "./interface";
import { getIpAddress } from "../../utils/resp";
import { APIContext, F2EConfigResult } from "../../interface";
export * from "./interface"
export * from "./user_store"
import * as path from "node:path"
import * as fs from "node:fs"

const login_user_map = new Map<string, LoginInfo[]>()
const token_map = new Map<string, LoginInfo>()
const ip_error_count_map = new Map<string, number>()
const append_error = (ip: string) => {
    const times = ip_error_count_map.get(ip) || 0
    ip_error_count_map.set(ip, times + 1)
}

/** 登录信息缓存 */
const saveMap = function (filename: string | false, map: Map<string, any>) {
    if (!filename) return
    const mapstring = JSON.stringify([...map], null, 2)
    fs.writeFileSync(filename, mapstring)
    logger.debug('save auth cache:', filename)
}
/** 登录信息从缓存加载 */
const loadMap = function (filename: string | false, map: Map<string, any>) {
    if (!filename) return
    if (!fs.existsSync(filename)) return
    const mapstring = fs.readFileSync(filename, 'utf-8')
    try {
        const data: [string, any][] = JSON.parse(mapstring)
        data.forEach(([key, value]) => map.set(key, value))
    } catch (e) {
        logger.error('load auth cache wrong:', e)
    }
}


const defaultConfig: Required<Omit<AuthConfig, 'store'>> = {
    max_login_count: 1,
    max_error_count: 5,
    redirect: '/',
    login_path: 'login',
    logout_path: 'logout',
    login_page: page_layout.replace('{{body}}', page_login),
    white_list: [],
    cookie: { name: 'f2e_auth', options: { maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: false, sameSite: 'strict' } },
    messages: {
        crsf_token_invalid: 'token不合法',
        crsf_token_not_found: 'token失效',
        account_not_found: '用户名密码错误',
        ip_error_count_exceed: '错误次数过的，请稍后再试',
    },
    cache_root: path.resolve(process.cwd(), '.f2e_cache'),
    decrypt_account: (account: string, token: string) => {
        if (!account || !token) return null
        var bits = new Set(token.substring(4, 12).split('').map(n => parseInt(n, 16)));
        const chars = []
        for (let i = 0; i < account.length; i++) {
            if (!bits.has(i)) {
                chars.push(account[i])
            }
        }
        try {
            const { username, password = '' } = JSON.parse(atob(chars.join('')))
            return { username, password }
        } catch (e) {
            return null
        }
    },
} 
const middleware_auth: MiddlewareCreater = {
    mode: ['dev', 'prod'],
    name: 'auth',
    execute: (conf) => {
        if (!conf.auth || !conf.auth.store) {
            return
        }
        /** 每隔5分钟清除错误次数 */
        setInterval(() => {
            ip_error_count_map.clear()
        }, 1000 * 60 * 5)
    
        const {
            max_login_count = defaultConfig.max_login_count,
            max_error_count = defaultConfig.max_error_count,
            redirect = defaultConfig.redirect,
            store,
            login_path = defaultConfig.login_path,
            logout_path = defaultConfig.logout_path,
            login_page = defaultConfig.login_page,
            white_list = defaultConfig.white_list,
            cookie = defaultConfig.cookie,
            messages = defaultConfig.messages,
            decrypt_account = defaultConfig.decrypt_account,
            cache_root = defaultConfig.cache_root,
        } = conf.auth
        const {
            crsf_token_invalid,
            crsf_token_not_found,
            account_not_found,
            ip_error_count_exceed,
        } = {...defaultConfig.messages, ...messages}

        if (cache_root != false) {
            if (!fs.existsSync(cache_root)) {
                fs.mkdirSync(cache_root, {recursive: true})
            }
        }
        const path_login_user_map = cache_root && path.resolve(cache_root, 'login_user_map.json')
        const path_token_map = cache_root && path.resolve(cache_root, 'token_map.json')
        loadMap(path_login_user_map, login_user_map)
        loadMap(path_token_map, token_map)

        const { handleSuccess, handleRedirect } = createResponseHelper(conf)
        
        const filter: RouteFilter  = async (pathname, ctx) => {
            const { resp, headers = {}, method = 'GET', responseHeaders = {}, location } = ctx
            const crsf_token = getCookie(cookie.name, headers.cookie as string) || _.createSessionId()
            let loginInfo: LoginInfo = token_map.get(crsf_token) || {
                token: crsf_token,
                last_url: '',
                ip: getIpAddress(resp),
                ua: headers['user-agent'] as string,
                expire: Date.now() + 1000 * 60 * 60 * 24,
            }
            token_map.set(crsf_token, loginInfo)
            /** 登出页面操作完成跳转登录页 */
            if (pathname === logout_path) {
                const loginInfo = token_map.get(crsf_token)
                if (loginInfo) {
                    token_map.delete(crsf_token)
                    if (loginInfo.user) {
                        const login_clients = login_user_map.get(loginInfo.user.username)
                        if (login_clients) {
                            login_user_map.set(loginInfo.user.username, login_clients.filter(c => c.token !== crsf_token))
                        }
                    }
                    loginInfo.user = undefined
                    saveMap(path_login_user_map, login_user_map)
                    saveMap(path_token_map, token_map)
                }
                handleRedirect(resp, '/' + login_path)
                return false
            }
            /** 登录页面直接跳过 */
            if (pathname === login_path && method.toUpperCase() === 'GET') {
                responseHeaders['Set-Cookie'] = createCookie({ ...cookie, value: crsf_token, })
                ctx.responseHeaders = responseHeaders
                handleSuccess(ctx, '.html', _.template(login_page, {
                    title: '登录',
                    redirect: redirect === true ? (loginInfo.last_url || '/') : redirect,
                    crsf_token,
                }))
                return false
            }
            /** 白名单页面直接跳过 */
            if (white_list.length > 0 && white_list.some(p => new RegExp(p).test(pathname))) {
                return pathname
            }
            if (pathname != login_path) {
                if (!/\.(js|css|svg|ico|png|gif|jpe?g)$/.test(pathname)) {
                    loginInfo.last_url = location.pathname + (location.search ? '?' + location.search : '')
                }
                /** 未登录，跳转登录页，并记录跳转前访问地址 */
                if (!loginInfo.user) {
                    handleRedirect(ctx.resp, '/' + login_path)
                    return false
                }
        
                /** 验证登录成功, 续签 */
                loginInfo.expire = Date.now() + 1000 * 60 * 60 * 24

                if (pathname === login_path + '/info') {
                    handleSuccess(ctx, '.json', JSON.stringify(loginInfo))
                    return false
                }
            }
    
        }
        const route = new Route(conf, filter)
        route.on(login_path, async (body, ctx) => {
            const { headers = {} } = ctx
            const crsf_token = getCookie(cookie.name, headers.cookie as string)
            if (!crsf_token) {
                return {
                    error: crsf_token_not_found
                }
            }
            let loginInfo = token_map.get(crsf_token)
            if (!loginInfo) {
                return {
                    error: crsf_token_invalid
                }
            }
            const errors = ip_error_count_map.get(loginInfo.ip) || 0
            if (errors > max_error_count) {
                return {
                    error: ip_error_count_exceed
                }
            }
            const decrypt_result = decrypt_account(body.account, crsf_token)
            if (!decrypt_result) {
                append_error(loginInfo.ip)
                return {
                    error: crsf_token_invalid
                }
            }
            const { username, password } = decrypt_result
            const user = await store.getUser(username, password)
            if (!user) {
                append_error(loginInfo.ip)
                return {
                    error: account_not_found
                }
            }
            loginInfo.user = user
            const login_clients = login_user_map.get(user.username) || []
            login_clients.push(loginInfo)
            login_user_map.set(user.username, login_clients)
            while (login_clients.length > max_login_count) {
                const deleted = login_clients.shift()
                if (deleted) {
                    token_map.delete(deleted.token)
                }
            }
            saveMap(path_login_user_map, login_user_map)
            saveMap(path_token_map, token_map)
            return {
                success: true,
            }
        })
    
        /** 存储引擎删除用户，需要清除登录信息 */
        store.onDeleteUser?.(username => {
            login_user_map.get(username)?.forEach(c => {
                token_map.delete(c.token)
            })
            login_user_map.delete(username)
        })
        return {
            onRoute: route.execute
        }
    }
}

export const createAuthHelper = (config: Omit<AuthConfig, 'store'> = defaultConfig) => {
    const { cookie } = {...defaultConfig, ...config}
    const getLoginUser = (ctx: APIContext) => {
        const { headers = {} } = ctx
        const crsf_token = getCookie(cookie.name, headers.cookie as string)
        if (crsf_token) {
            return token_map.get(crsf_token)
        }
    }
    return {
        getLoginUser,
    }
}

export default middleware_auth