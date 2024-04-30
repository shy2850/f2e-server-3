import { Route, RouteFilter } from "../../routes";
import { MiddlewareCreater } from "../interface";
import { createCookie, getCookie } from "../../utils/cookie";
import { createResponseHelper } from "../../utils";
import * as _ from '../../utils/misc'
import { page_layout, page_login } from "../../utils/templates";
import { AuthConfig, LoginInfo } from "./interface";
import { getIpAddress } from "../../utils/resp";
import { HttpResponse } from "uWebSockets.js";
import { APIContext, F2EConfigResult } from "../../interface";

const login_user_map = new Map<string, LoginInfo[]>()
const token_map = new Map<string, LoginInfo>()
const ip_error_count_map = new Map<string, number>()
const append_error = (ip: string) => {
    const times = ip_error_count_map.get(ip) || 0
    ip_error_count_map.set(ip, times + 1)
}
/** 每隔5分钟清除错误次数 */
setInterval(() => {
    ip_error_count_map.clear()
}, 1000 * 60 * 5)

/**
 * 账户提交加密算法
 * @param account 
 * @param token 
 */
const decrypt_account = (account: string, token: string) => {
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
}


const defaultConfig: Required<Omit<AuthConfig, 'store'>> = {
    max_login_count: 1,
    max_error_count: 5,
    redirect: '/',
    login_path: 'login',
    login_page: page_layout.replace('{{body}}', page_login),
    cookie: { name: 'f2e_auth', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: false, sameSite: 'strict' },
    messages: {
        crsf_token_invalid: 'token不合法',
        crsf_token_not_found: 'token失效',
        account_not_found: '用户名密码错误',
        ip_error_count_exceed: '错误次数过的，请稍后再试',
    },
} 
const middleware_auth: MiddlewareCreater = (conf) => {
    if (!conf.auth || !conf.auth.store) {
        return
    }
    const {
        max_login_count = defaultConfig.max_login_count,
        max_error_count = defaultConfig.max_error_count,
        redirect = defaultConfig.redirect,
        store,
        login_path = defaultConfig.login_path,
        login_page = defaultConfig.login_page,
        cookie = defaultConfig.cookie,
        messages = defaultConfig.messages,
    } = conf.auth
    const {
        crsf_token_invalid,
        crsf_token_not_found,
        account_not_found,
        ip_error_count_exceed,
    } = {...defaultConfig.messages, ...messages}

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
        /** 登录页面直接跳过 */
        if (pathname === login_path && method.toUpperCase() === 'GET') {
            loginInfo.last_url = ''
            responseHeaders['Set-Cookie'] = createCookie({ ...cookie, value: crsf_token, })
            ctx.responseHeaders = responseHeaders
            handleSuccess(ctx, '.html', _.template(login_page, {
                title: '登录',
                redirect: redirect === true ? (loginInfo.last_url || '/') : redirect,
                crsf_token,
            }))
            return false
        }
        if (pathname != login_path) {
            /** 未登录，跳转登录页，并记录跳转前访问地址 */
            if (!loginInfo.user) {
                if (!/\.(js|css|svg|ico|png|gif|jpe?g)$/.test(pathname)) {
                    loginInfo.last_url = location.pathname + (location.search ? '?' + location.search : '')
                }
                handleRedirect(ctx.resp, '/' + login_path)
                return false
            }
    
            /** 验证登录成功, 续签 */
            loginInfo.expire = Date.now() + 1000 * 60 * 60 * 24
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
        while (login_clients.length > max_login_count) {
            const deleted = login_clients.shift()
            if (deleted) {
                token_map.delete(deleted.token)
            }
        }
        return {
            success: true,
        }
    })

    return {
        name: 'auth',
        mode: ['dev', 'prod'],
        onRoute: route.execute
    }
}

export const createAuthHelper = (conf: F2EConfigResult) => {
    const {
        cookie = defaultConfig.cookie,
    } = conf.auth || {}
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