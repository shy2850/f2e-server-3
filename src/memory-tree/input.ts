import { MemoryTree } from "./interface";
import path from "node:path"
import fs from "node:fs/promises"
import * as _ from "../utils/misc";
import logger from "../utils/logger";
import { createHash } from "node:crypto";

const inputProvider: MemoryTree.BuildProvider = (options, store) => {
    const { buildFilter, onSet, root, namehash, mimeTypes = {} } = options
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
            if (buildFilter && !buildFilter(pathname, stat.size)) {
                return
            }
            try {
                const data = await fs.readFile(absolutePath, _.isText(pathname, mimeTypes) ? 'utf-8' : undefined)
                const result = await onSet(pathname, data, store)
                let outputPath = _.pathname_fixer(result.outputPath || pathname)
                result.outputPath = outputPath
                if (namehash && (Buffer.isBuffer(result.data) || typeof result.data === 'string')) {
                    const hash = createHash('md5').update(result.data).digest('hex')
                    result.hash = hash
                    if (namehash.replacer) {
                        outputPath = namehash.replacer(outputPath, hash) || outputPath
                        result.outputPath = outputPath
                        outputPath = _.pathname_fixer(outputPath.split(/[!#*?=]+/)[0])
                    }
                }
                store.origin_map.set(result.originPath, result)
                store.output_map.set(outputPath, result)
                store._set(outputPath, result.data)
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