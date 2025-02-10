import fs from 'node:fs'
import path from 'node:path'
import { MiddlewareCreater } from "../interface";
import { MemoryTree } from "../../memory-tree";
import * as _ from '../../utils/misc'
import { dynamicImport, logger } from '../../utils';
import { exit } from 'node:process';

const middleware_postcss: MiddlewareCreater = {
    mode: ["dev", "build"],
    name: "postcss",
    execute: async (conf) => {
        if (!conf.postcss) {
            return
        }
        const postcss: typeof import('postcss') = await dynamicImport('postcss')
        const processer = postcss()
        const { entryPoints, plugins = [], processOptions = {}, watchFilter } = conf.postcss;
        plugins.forEach(plugin => {
            processer.use(plugin)
        })

        const [origin, output] = (typeof entryPoints === 'string' ? [entryPoints, entryPoints] : [entryPoints.in, entryPoints.out]).map(_.pathname_fixer);
        const realPath = path.join(conf.root, origin)
        if (!fs.existsSync(realPath)) {
            logger.error(`PostCss file ${realPath} not exists!`)
            exit(1)
        }

        const build = async function (store: MemoryTree.Store) {
            const data = fs.readFileSync(realPath, 'utf-8')
            try {
                const result = await processer.process(data, {
                    from: origin, map: { inline: false },
                    ...processOptions,
                })
                
                if (result.css) {
                    store.save({
                        originPath: origin,
                        outputPath: output,
                        data: result.css + '',
                    })
                }
    
                if (result.map) {
                    const map = result.map.toString()
                    const mapPath = output.replace(/\.css$/, '.css.map')
                    store.save({
                        originPath: mapPath,
                        outputPath: mapPath,
                        data: map + '',
                    })
                }
            } catch (e) {
                logger.error(e)
                if (conf.mode === 'build') {
                    exit(1)
                }
            }
        }

        return {
            onMemoryLoad: async (store) => {
                await build(store)
            },
            buildWatcher: (pathname, eventType, __build, store) => {
                if (pathname === origin || !watchFilter || watchFilter(pathname)) {
                    build(store)
                }
            }
        };
    }
}

export default middleware_postcss
