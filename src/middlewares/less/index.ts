import { MemoryTree } from "../../memory-tree";
import { MiddlewareCreater } from "../interface";
import * as _ from '../../utils/misc'
import * as path from 'node:path'
import * as fs from 'node:fs'
import logger from "../../utils/logger";

const middleware_less: MiddlewareCreater = (conf) => {
    if (!conf.less) {
        return
    }
    const lessOptions = typeof conf.less === 'boolean' ? {} : conf.less
    const lessFilter = lessOptions.only ? (pathname: string) => {
        return !!lessOptions.only?.find(t => _.minimatch(pathname, t))
    } : (
        lessOptions.ignore ? (pathname: string) => {
            return !lessOptions.ignore?.find(t => _.minimatch(pathname, t))
        } : (pathname: string) => {
            return _.minimatch(pathname, '*.less$')
        }
    )
    const less: typeof import('less') = require('less')

    const deps_map = new Map<string, string>()
    return {
        name: 'less',
        mode: ['dev', 'build'],
        onSet: async (pathname, data, store) => {
            let result = {
                originPath: pathname,
                outputPath: pathname,
                data,
            }
            logger.log('less', pathname, '->', data?.toString())

            if (lessFilter(pathname)) {
                logger.log('less', pathname, '->', data?.toString())

                result = {
                    originPath: pathname,
                    outputPath: pathname.replace(/\.less$/, '.css'),
                    data,
                }
                const outputMapPath = pathname.replace(/\.less$/, '.css.map')
                const lessData = await less.render((data?.toString() || '').replace(/(@import.*)"(\S*\/)"/g, (impt, pre, dir) => {
                    let pkg = path.join(path.dirname(pathname), dir)
                    return fs.readdirSync(pkg).filter(d => /\.less$/.test(d)).map(d => `${pre}"${dir}${d}";`).join('\n')
                }), {
                    rootpath: conf.root,
                    filename: pathname,
                    javascriptEnabled: true,
                    sourceMap: {
                        sourceMapURL: outputMapPath.split('/').pop(),
                        outputSourceFiles: true
                    },
                    ...(lessOptions.buildOptions || {})
                })
                

                result.data = lessData.css
                store.save({
                    originPath: outputMapPath,
                    outputPath: outputMapPath,
                    data: lessData.map,
                })
                deps_map.set(pathname, pathname)
                lessData.imports.forEach(file => {
                    deps_map.set(_.pathname_fixer(file), pathname)
                })
            }
            return result
        },
        buildWatcher: (pathname, eventType, build, store) => {
            const main = deps_map.get(pathname)
            if (main) {
                build(main)
            }
        }
    }
}

export default middleware_less