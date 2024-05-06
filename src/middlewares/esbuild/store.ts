import { BuildResult } from "esbuild"
import { MemoryTree } from "../../memory-tree/interface"
import { F2EConfigResult } from "../../interface"
import * as path from 'node:path'
import * as _ from '../../utils/misc'

export interface SaveParams {
    store: MemoryTree.Store
    result: BuildResult
    conf: F2EConfigResult
}

export const save = async function (params: SaveParams) {
    const { store, result, conf } = params
    const { root, esbuild } = conf
    if (!esbuild) return
    const with_metafile = esbuild.with_metafile
    const { outputFiles = [], metafile } = result
    
    for (const outputFile of outputFiles) {
        const outputPath = _.pathname_fixer(path.relative(root, outputFile.path))
        const meta = metafile?.outputs?.[outputPath]
        const originPath = meta?.entryPoint || outputPath
        store.save({
            data: outputFile.text,
            originPath,
            outputPath,
        })
        /** js文件索引meta信息 */
        if ( with_metafile && metafile && /\.js$/.test(outputPath)) {
            store.save({
                originPath: outputPath + '.json',
                outputPath: outputPath + '.json',
                data: JSON.stringify(metafile, null, 2)
            })
        }
    }
}
