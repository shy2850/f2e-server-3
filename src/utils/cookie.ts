export interface Cookie {
    name: string;
    value: string;
    options?: {
        expires?: number;
        domain?: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        maxAge?: number;
        signed?: boolean;
        signedCookie?: boolean;
    };
}

/**
 * 创建一个Cookie字符串。
 * @param cookie Cookie对象
 * @returns 构造的Cookie字符串
 */
export const createCookie = (cookie: Cookie) => {
    const base = `${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}; `
    const cookieOptions = Object.entries(cookie.options || {})
        .filter(([_, value]) => value !== undefined) // 过滤未定义的值
        .map(([key, value]) => {
            if (key === 'secure' || key === 'httpOnly') {
                // 对于布尔值直接返回键名
                return value ? key : '';
            }
            if (key === 'expires') {
                // 对于expires，确保其为有效的时间戳
                if (typeof value === "number" && value <= Date.now()) {
                    return `Expires=${value}`;
                }
            }
            return `${key}=${value}`;
        })
        .join('; ');

    return base + cookieOptions;
}
/**
 * 从cookie字符串中获取指定名称的cookie值。
 * @param name 需要获取的cookie的名称
 * @param cookieString 可选，cookie字符串，默认为空字符串
 * @returns 指定名称的cookie值，若未找到则返回空字符串
 */
export const getCookie = (name: string, cookieString: string = '') => {
    if (!cookieString) {
        return '';
    }

    try {
        const decodedCookie = decodeURIComponent(cookieString);
        const cookies = decodedCookie.split('; ');
        for (let i = 0; i < cookies.length; i++) {
            const [key, value] = cookies[i].split('=');
            if (key.trim() === name) {
                return value;
            }
        }
    } catch (error) {
        console.error("Error parsing cookie:", error);
        return '';
    }
    
    return '';
}
