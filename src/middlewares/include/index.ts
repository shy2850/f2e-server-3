import { MemoryTree } from "../../memory-tree";
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MiddlewareCreater } from "../interface";
import { IncludeItem, IncludeLoaders, IncludeResult } from "./interface";
import logger from "../../utils/logger";
import * as _ from '../../utils/misc'
import { exit } from "node:process";

const htmlReplacer: IncludeLoaders[string] = function replace (content, root, recursive): IncludeResult {
    const items: IncludeItem[] = []
    let result = content
    if (/<f2e:include\s+src="([^"]+)"\s*\/>/.test(content)) {
        result = content.replace(/<f2e:include\s+src="([^"]+)"\s*\/>/g, (_, src) => {
            const realpath = path.join(path.dirname(root), src)
            const data = fs.readFileSync(realpath, 'utf-8')
            items.push({ src: realpath, data })
            if (recursive && /<f2e:include\s+src="([^"]+)"\s*\/>/.test(data)) {
                const { items: subItems, result: subResult } = replace(data, realpath, recursive)
                items.push(...subItems)
                return subResult
            } else {
                return data
            }
        })
    }
    return {
        items,
        result
    }
}
const defaultLoaders: IncludeLoaders = {
    '.html': htmlReplacer,
    '.htm': htmlReplacer,
    '.shtml': htmlReplacer,
}

const middleware_include: MiddlewareCreater = {
    name: 'include',
    mode: ['dev', 'build'],
    execute: async (conf) => {
        const { root, include } = conf
        if (!include) {
            return
        }
        const {
            recursive = false,
            entryPoints = [],
            loaders = defaultLoaders,
        } = include
        if (entryPoints.length === 0) {
            logger.error('Include entryPoints is empty!')
            exit(1)
        }
        const entry_map = new Map<string, string>(entryPoints.map(p => {
            if (typeof p === 'string') {
                const origin = _.pathname_fixer(p)
                return [origin, origin]
            }
            return [_.pathname_fixer(p.in), _.pathname_fixer(p.out)]
        }))
    
        const deps_map = new Map<string, string>()

        const build = async function (origin: string, store: MemoryTree.Store) {
            const output = entry_map.get(origin)
            if (!output) {
                logger.error(`Include entry ${origin} not exists!`)
                return
            }
            const realPath = path.join(conf.root, origin)
            if (!fs.existsSync(realPath)) {
                logger.error(`Include file ${realPath} not exists!`)
                exit(1)
            }
            const data = fs.readFileSync(realPath, 'utf-8')
            const ext = path.extname(origin)
            const loader = loaders[ext]
            if (!loader) {
                logger.error(`Include loader ${ext} not exists!`)
                exit(1)
            }

            const { items, result } = await loader(data, realPath, recursive)
            
            if (result) {
                store.save({
                    originPath: origin,
                    outputPath: output,
                    data: result,
                })
            }
            deps_map.set(origin, origin)
            store.ignores.add(origin)
            items.forEach(item => {
                const p = _.pathname_fixer(path.relative(root, item.src))
                store.ignores.add(p)
                deps_map.set(_.pathname_fixer(p), origin)
            })
        }

        return {
            onMemoryLoad: async (store) => {
                const entries = [...entry_map.keys()]
                await Promise.all(entries.map(origin => build(origin, store)))
            },
            buildWatcher: (pathname, eventType, __build, store) => {
                const main = deps_map.get(pathname)
                if (main) {
                    try {
                        build(main, store)
                    } catch (e) {
                        logger.error(e)
                    }
                }
            },
        }
    }
}

export default middleware_include;
