import { join } from 'node:path'
import { MemoryTree, createMemoryTree } from '../src/memory-tree'
import logger from '../src/utils/logger'
import { marked } from 'marked'

export const run_memory_tree = () => {
    const config: Partial<MemoryTree.Options> = {
        watch: true,
        dest: join(process.cwd(), './output'),
        root: process.cwd(),
        watchFilter (pathname) {
            return /README\.md/.test(pathname)
        },
        buildFilter (pathname) {
            return /\.(md|json)$/.test(pathname)
        },
        buildWatcher (pathname, eventType, build, store) {
            logger.log(pathname, eventType)
            memory.output("")
        },
        async onSet (pathname, data, store) {
            if (/\.md$/.test(pathname)) {
                return {
                    data: marked(data?.toString() || ""),
                    originPath: pathname,
                    outputPath: pathname.replace('.md', '.html'),
                }
            }
            return { data, originPath: pathname, outputPath: pathname }
        },
    }
    logger.debug('config:', config)
    const memory = createMemoryTree(config)
    
    memory.input('').then(function () {
        memory.output('')
    })
}