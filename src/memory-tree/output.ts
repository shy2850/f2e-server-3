import { MemoryTree } from "./interface";
import path from "node:path"
import fs from "node:fs"
import * as _ from "../utils/misc";
import logger from "../utils/logger";
import { writeFile } from "node:fs/promises";
import { isArrayBufferView } from "node:util/types";


export const outputProvider: MemoryTree.BuildProvider = (options, store) => {
    const { outputFilter, dest } = options
    return async function build (pathname: string) {
        // 符合过滤条件且有输出目录执行
        if (outputFilter && dest) {
            // 根目录默认符合条件
            if (!pathname || outputFilter(pathname)) {
                const data = await store.load(pathname)

                if (typeof data === "undefined" || !outputFilter(pathname, data)) {
                    return
                }
                const absolutePathname = path.join(dest, pathname)
                if (typeof data === "string" || isArrayBufferView(data)) {
                    try {
                        await writeFile(absolutePathname, data)
                    } catch (e) {
                        logger.error(e)
                    }
                } else {
                    if (!fs.existsSync(absolutePathname)) {
                        fs.mkdirSync(absolutePathname, { recursive: true })
                    }
                    await Promise.all(Object.keys(data).map(key => {
                        return build(pathname ? (pathname + '/' + key) : key)
                    }))
                }
            }
        }
    }
}