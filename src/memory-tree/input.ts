import { MemoryTree } from "./interface";
import path from "node:path"
import fs from "node:fs/promises"
import * as _ from "../utils/misc";
import logger from "../utils/logger";

const inputProvider: MemoryTree.BuildProvider = (options, store) => {
    const { buildFilter, onSet, root } = options
    return async function build (pathname: string) {
        
        // 路径被过滤，直接返回
        if (pathname && (!buildFilter || !buildFilter(pathname))) {
            return
        }

        const absolutePath = path.join(root, pathname)
        const stat = await fs.stat(absolutePath)

        if (stat.isDirectory()) {
            store._set(pathname, {})
            try {
                const files = await fs.readdir(absolutePath)
                await Promise.all(files.map(file => build(pathname ? (pathname + '/' + file) : file)))
            } catch (e) {
                logger.error(e)
            }
        }
        if (stat.isFile()) {
            try {
                const data = await fs.readFile(absolutePath, _.isText(pathname) ? 'utf-8' : undefined)
                const result = await onSet(pathname, data, store)
                store._set(result.outputPath, result.data)
            } catch (e) {
                logger.error(e)
            }
        }
    }
}

export const inputProviderWithWatcher: MemoryTree.BuildProvider = (options, store) => {
    const build = inputProvider(options, store)
    const { buildWatcher, watch, watchFilter, root } = options
    if (watch && watchFilter) {
        (async () => {
            const ac = new AbortController();
            try {
                const watcher = fs.watch(root, {
                    signal: ac.signal,
                    recursive: true,
                    persistent: true,
                });
                for await (const info of watcher) {
                    switch (info.eventType) {
                        case 'rename':
                            break;
                        case 'change':
                            if (info.filename) {
                                const pathname = _.pathname_fixer(info.filename)
                                if (watchFilter(pathname)) {
                                    await build(pathname)
                                    buildWatcher && buildWatcher(pathname, info.eventType, build, store)
                                }
                            }
                            break;
                    }
                }
            } catch (err) {
                logger.error(err)
            }
        })();
    } else {
        logger.error('watch 需要同时配置 watchFilter')
    }
    return build
}