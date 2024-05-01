import { createHash } from "node:crypto";
import { logger } from "../../utils";
import { IUserStore, LoginUser } from "./interface";
import * as fs from 'node:fs'

export class UserStore implements IUserStore {
    private user_map = new Map<string, LoginUser>();
    private deleteCallbacks: {(username: string): void}[] = []
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
        this.init_user_map(db_path)
        fs.watchFile(db_path, (curr, prev) => {
            if (curr.mtimeMs !== prev.mtimeMs) {
                logger.info('user db changed, reload user map')
                this.init_user_map(db_path)
            }
        })
    }
    private init_user_map(db_path: string) {
        const lines = fs.readFileSync(db_path, 'utf8').split(/[\r\n]+/)
        const user_map_old = this.user_map
        this.user_map = new Map()
        for (const line of lines) {
            const [username, password, nickname] = line.split(':')
            this.user_map.set(`${username}:${password}`, { username, nickname })
        }
        this.deleteCallbacks.forEach(callback => {
            for (const [key] of user_map_old) {
                if (!this.user_map.has(key)) {
                    const username = key.split(':')[0]
                    logger.info(`user: "${username}" deleted`)
                    callback(username)
                }
            }
        })
    }
    async getUser(username: string, password: string): Promise<LoginUser | undefined> {
        const pwd = createHash('md5').update(password).digest('hex')
        return this.user_map.get(`${username}:${pwd}`)
    }
    onDeleteUser(callback: (username: string) => void): void {
        this.deleteCallbacks.push(callback)
    }
}