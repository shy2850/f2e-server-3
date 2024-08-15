import fs from 'node:fs'
import path from 'node:path'
import { MiddlewareCreater } from "../interface";
import { MemoryTree } from "../../memory-tree";
import * as _ from '../../utils/misc'
import { logger } from '../../utils';
import { exit } from 'node:process';

const middleware_postcss: MiddlewareCreater = {
    mode: ["dev", "build"],
    name: "postcss",
    execute: (conf) => {
        if (!conf.postcss) {
            return
        }
        const postcss: typeof import('postcss') = require('postcss')
        const processer = postcss()
        const { entryPoints, plugins = [], tailwindConfig = 'tailwind.config.js', processOptions = {} } = conf.postcss;
        let match_content: string[] = [];
        if (typeof tailwindConfig === 'object' ) {
            const tailwind: typeof import('tailwindcss') = require('tailwindcss');
            plugins.push( tailwind(tailwindConfig) )
            match_content = tailwindConfig.content
        } else {
            const tailwindPath = path.join(process.cwd(), tailwindConfig)
            if (fs.existsSync(tailwindPath)) {
                const tailwind: typeof import('tailwindcss') = require('tailwindcss');
                plugins.push( tailwind(tailwindConfig) )
                match_content = require(tailwindPath).content
            }
        }
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
        }

        return {
            onMemoryLoad: async (store) => {
                await build(store)
            },
            buildWatcher: (pathname, eventType, __build, store) => {
                if (pathname === origin || require('micromatch').isMatch(pathname, match_content)) {
                    build(store)
                }
            }
        };
    }
}

export default middleware_postcss
