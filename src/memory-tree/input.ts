import { MemoryTree } from "./interface";
import path from "node:path"
import fs from "node:fs/promises"
import * as _ from "../utils/misc";
import logger from "../utils/logger";
import { dynamicImport, ENGINE_TYPE } from "../utils";
import { exit } from "node:process";

export const inputProvider: MemoryTree.BuildProvider = (options, store) => {
    const { buildFilter, onSet, root } = options
    return async function build (pathname: string) {
        // 路径被过滤，直接返回
        if (pathname && (store.ignores.has(pathname) || !buildFilter || !buildFilter(pathname))) {
            return
        }

        const absolutePath = path.join(root, pathname)
        const stat = await fs.stat(absolutePath)

        if (stat.isDirectory()) {
            store.save({
                originPath: pathname, outputPath: pathname, data: store._get(pathname) || {},
            })
            try {
                const files = await fs.readdir(absolutePath)
                await Promise.all(files.map(file => build(pathname ? (pathname + '/' + file) : file)))
            } catch (e) {
                logger.error(e)
            }
        }
        if (stat.isFile()) {
            if (buildFilter && !buildFilter(pathname, stat.size)) {
                return
            }
            try {
                const data = await fs.readFile(absolutePath, _.isText(pathname) ? 'utf-8' : undefined)
                const result = await onSet(pathname, data, store)
                store.save(result)
            } catch (e) {
                logger.error(e)
            }
        }
    }
}

export const beginWatch = (options: MemoryTree.Options, store: MemoryTree.Store, build: MemoryTree.Build) => async () => {
    const { buildWatcher, watch, watch_timeout = 100, watchFilter, root } = options
    if (watch && watchFilter) {
        let chokidar: typeof import('chokidar') | undefined = undefined
        if (ENGINE_TYPE === 'deno') {
            logger.debug(`Deno 环境下 chokidar 不可用, 使用 Deno.watchFs 监听文件变化`)
        } else {
            try {
                chokidar = await dynamicImport('chokidar')
            } catch (e) {
                if (process.platform === 'win32') {
                    logger.debug('chokidar 未安装, 使用 fs.watch 监听文件变化')
                } else {
                    logger.error('chokidar 未安装, 请安装: `npm i chokidar -D`')
                    exit(1)
                }
            }
        }

        const watcher_map = new Map<string, {
            ready?: boolean,
            excute: {(): Promise<void>}
        }>();
        const loop_watcher = function loop () {
            watcher_map.forEach((item, pathname) => {
                if (item.ready) {
                    watcher_map.delete(pathname)
                    item.excute()
                } else {
                    item.ready = true
                }
            })
            setTimeout(loop, watch_timeout);
        }
        loop_watcher()

        if (chokidar) {
            chokidar.watch(root, {
                ignoreInitial: true,
                ignored: [(filename: string) => {
                    const p = _.pathname_fixer(path.relative(root, filename))
                    return !!p && !watchFilter(p)
                }]
            }).on('all', async (eventType, filename) => {
                const p = _.pathname_fixer(path.relative(root, filename))
                if (p && watchFilter(p)) {
                    watcher_map.set(p, {
                        ready: false,
                        excute: async () => {
                            await build(p)
                            buildWatcher && buildWatcher(p, eventType, build, store)
                        }
                    })
                }
            })
        } else {
            const doWatcher = async (filename: string, eventType: string) => {
                if (filename) {
                    const pathname = _.pathname_fixer(filename)
                    if (watchFilter(pathname)) {
                        watcher_map.set(pathname, {
                            ready: false,
                            excute: async () => {
                                await build(pathname)
                                buildWatcher && buildWatcher(pathname, eventType, build, store)
                            }
                        })
                    }
                }
            }
            switch (ENGINE_TYPE) {
                case 'deno':
                    (async () => {
                        try {
                            const watcher = Deno.watchFs(root, { recursive: true });
                            for await (const info of watcher) {
                                if (info.kind === 'modify') {
                                    info.paths.forEach(p => doWatcher(path.relative(root, p), info.kind))
                                }
                            }
                        } catch (err) {
                            logger.error(err)
                        }
                    })();
                    break;
                default:
                    (async () => {
                        try {
                            const watcher = fs.watch(root, {
                                recursive: true,
                                persistent: true,
                            });
                            for await (const info of watcher) {
                                switch (info.eventType) {
                                    case 'rename':
                                        break;
                                    case 'change':
                                        info.filename && doWatcher(info.filename, info.eventType)
                                        break;
                                }
                            }
                        } catch (err) {
                            logger.error(err)
                        }
                    })();
            }
        }
    } else {
        logger.error('watch 需要同时配置 watchFilter')
    }
}