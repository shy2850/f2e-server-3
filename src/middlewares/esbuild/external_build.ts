import { BuildOptions } from "esbuild"
import { MemoryTree } from "../../memory-tree/interface"
import { F2EConfigResult } from "../../interface";
import * as _ from '../../utils/misc'
import path from "node:path";
import fs from "node:fs";
import { save } from "./store";
import { code_define, code_externals } from "../../utils/templates";
import { VERSION } from "../../utils/engine";

interface BuildExternalOptions {
    conf: F2EConfigResult;
    store: MemoryTree.Store;
    option: BuildOptions;
    index: number;
}
export const external_build = async function ({
    conf,
    store,
    option,
    index,
}: BuildExternalOptions) {
    const { external = [], ..._option } = option
    if (external.length === 0 || !conf.esbuild || !conf.esbuild.build_external) {
        return
    }
    const {
        cache_root = '.f2e_cache',
        inject_global_name = '__f2e_esbuild_inject__',
        external_lib_name = 'external_lib_{{index}}.js',
    } = conf.esbuild
    const GLOBAL_NAME = `window["${inject_global_name}"]`
    const LIB_FILE_NAME = typeof external_lib_name === 'function' ? external_lib_name : (index: number) => external_lib_name.replace('{{index}}', index + '')
    const cache_path = path.join(conf.root, cache_root)
    if (!fs.existsSync(cache_path)) {
        fs.mkdirSync(cache_path, { recursive: true })
    }
    const builder: typeof import('esbuild') = require('esbuild')
    const sourcefile = LIB_FILE_NAME(index)
    const js_code = _.template(code_externals, { external, GLOBAL_NAME })
    fs.writeFileSync(path.join(cache_path, sourcefile), js_code)
    const result = await builder.build({
        ..._option,
        entryPoints: [cache_path + '/' + sourcefile],
        banner: {
            'js': _.template(code_define, { VERSION, GLOBAL_NAME })
        },
    })
    await save({ store, result, conf })
}

