import { createHash } from "node:crypto";
import { logger } from "../../utils";
import { IUserStore, LoginUser } from "./interface";
import * as fs from 'node:fs'

export class UserStore implements IUserStore {
    private user_map = new Map<string, LoginUser>();
    /**
     * @param db_path 用户密码存储文件路径
     * 用户密码文件格式（密码为md5密文）: 每行一个用户
     * ```
     *      username1:password1:nickname1
     *      username2:password2:nickname2
     *      username3:password3:nickname3
     * ```
     */
    constructor (db_path: string) {
        if (!fs.existsSync(db_path)) {
            throw new Error(`db_path: ${db_path} not exists`)
        }
        const lines = fs.readFileSync(db_path, 'utf8').split(/[\r\n]+/)
        for (const line of lines) {
            const [username, password, nickname] = line.split(':')
            this.user_map.set(`${username}:${password}`, { username, nickname })
        }
    }
    async getUser(username: string, password: string): Promise<LoginUser | undefined> {
        const pwd = createHash('md5').update(password).digest('hex')
        return this.user_map.get(`${username}:${pwd}`)
    }
}