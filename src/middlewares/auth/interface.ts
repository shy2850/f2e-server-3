import { Cookie } from "../../utils/cookie";

/** 登录用户信息 */
export interface LoginUser {
    /** 登录用户名 */
    username: string;
    /** 用户展示名称 */
    nickname?: string;
}

/** 登录用户信息 */
export interface LoginInfo {
    /** 登录用户完成设置token */
    token: string,
    user?: LoginUser,
    /** 最后访问url */
    last_url: string,
    /** token 在服务端的失效日期 */
    expire: number,
    /** 当前登录的ip */
    ip: string,
    /** 当前登录的ua */
    ua: string,
}

export interface IUserStore {
    /** 查询登录用户信息 */
    getUser(username: string, password: string): Promise<LoginUser | undefined>,
    /** 删除用户时，同步清空已经登录的用户信息 */
    onDeleteUser(callback: (username: string) => void): void,
}

export interface AuthConfig {
    /** 登录路径
     * @default 'login'
    */
    login_path?: string;
    /** 登出路径
     * @default 'logout'
    */
    logout_path?: string;
    /** 
     * 登录页面内容
     * 可参考 [page_login.hbs](../../../templates/page_login.hbs)
     * */
    login_page?: string;
    /**
     * 登录成功是否跳转原路径
     * 设置为 true 跳转原路径
     * 设置为 字符串 表示直接跳转的路径
     * @default '/'
     */
    redirect?: true | string;
    

    /**
     * 允许最多登录客户端数量
     * 新登录客户端会把最早登录挤掉
     * @default 1
    */
    max_login_count?: number;
    /**
     * 允许最大错误次数
     * @default 5
     */
    max_error_count?: number;
    /**
     * 用户存储引擎
     */
    store: IUserStore;

    messages?: {
        crsf_token_not_found?: string;
        crsf_token_invalid?: string;
        account_not_found?: string;
        ip_error_count_exceed?: string;
    }

    /**
     * cookie设置配置
     * @default { name: 'f2e_auth', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: true, sameSite: 'strict' }
     */
    cookie?: Omit<Cookie, 'value'>;
}
