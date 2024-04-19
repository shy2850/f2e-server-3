/**
 * livereload中间件参数
 * @default {
 *          prefix: 'server-sent-bit',
            heartBeatTimeout: 100000
        }
 */
export interface LiveReloadConfig {
    prefix: string;
    heartBeatTimeout: number;
}
