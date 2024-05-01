export interface Cookie {
    name: string;
    value: string;
    expires?: number;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    secureCookie?: boolean;
    signed?: boolean;
    signedCookie?: boolean;
}

export const createCookie = (cookie: Cookie) => {
    const { name, value, expires, domain, path, secure, httpOnly, sameSite, maxAge } = cookie;
    return [
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        expires ? `Expires=${expires}` : '',
        domain ? `Domain=${domain}` : '',
        path ? `Path=${path}` : '',
        secure ? 'Secure' : '',
        httpOnly ? 'HttpOnly' : '',
        sameSite ? `SameSite=${sameSite}` : '',
        maxAge ? `Max-Age=${maxAge}` : '',
    ].filter(a => !!a).join('; ')
}
export const getCookie = (name: string, cookie = '') => {
    if (!cookie) {
        return ''
    }
    const cookies = cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
        const [key, value] = cookies[i].split('=')
        if (key.trim() === name) {
            return decodeURIComponent(value)
        }
    }
}
