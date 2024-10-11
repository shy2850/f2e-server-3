import { MemoryTree } from "../../memory-tree";
import { MiddlewareCreater } from "../interface";
import * as _ from '../../utils/misc'
import { exit } from "node:process";
import * as path from 'node:path'
import * as fs from 'node:fs'
import logger from "../../utils/logger";
import { dynamicImport } from "../../utils";

const middleware_less: MiddlewareCreater = {
    name: 'less',
    mode: ['dev', 'build'],
    execute: async (conf) => {
        if (!conf.less) {
            return
        }
        const { entryPoints = [], buildOptions = {} } = conf.less
        const entry_map = new Map<string, string>(entryPoints.map(p => {
            if (typeof p === 'string') {
                return [_.pathname_fixer(p), _.pathname_fixer(p.replace(/\.less$/, '.css'))]
            }
            return [_.pathname_fixer(p.in), _.pathname_fixer(p.out)]
        }))
    
        const deps_map = new Map<string, string>()
        const less: typeof import('less') = await dynamicImport('less')
        const build = async function (origin: string, store: MemoryTree.Store) {
            const output = entry_map.get(origin)
            if (!output) {
                logger.error(`Less entry ${origin} not exists!`)
                return
            }
            const realPath = path.join(conf.root, origin)
            if (!fs.existsSync(realPath)) {
                logger.error(`Less file ${realPath} not exists!`)
                exit(1)
            }
            const data = fs.readFileSync(realPath, 'utf-8')
            const input = data.replace(/(@import.*)"(\S*\/)"/g, (impt, pre, dir) => {
                let pkg = path.join(path.dirname(realPath), dir)
                return fs.readdirSync(pkg).filter(d => /\.less$/.test(d)).map(d => `${pre}"${dir}${d}";`).join('\n')
            })
            const lessData = await less.render(input, {
                rootpath: conf.root,
                filename: origin,
                javascriptEnabled: true,
                sourceMap: {
                    sourceMapURL: output.split('/').pop(),
                    outputSourceFiles: true
                },
                ...buildOptions
            })
    
            if (lessData.css) {
                store.save({
                    originPath: origin,
                    outputPath: output,
                    data: lessData.css + '',
                })
            }
    
            if (lessData.map) {
                const map = lessData.map.toString()
                const mapPath = output.replace(/\.css$/, '.css.map')
                store.save({
                    originPath: mapPath,
                    outputPath: mapPath,
                    data: map + '',
                })
            }
    
            deps_map.set(origin, origin)
            store.ignores.add(origin)
            lessData.imports.forEach(file => {
                store.ignores.add(file)
                deps_map.set(_.pathname_fixer(file), origin)
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
            }
        }
    }
}

export default middleware_less