import { BuildOptions } from "esbuild"
import { MemoryTree } from "../../memory-tree/interface"
import { F2EConfigResult } from "../../interface";
import * as _ from '../../utils/misc'
import path from "node:path";
import fs from "node:fs";
import { VERSION } from "../../utils/engine";
import { save } from "./store";

export const GLOBAL_NAME = `window["f2e-server.esbuild"]`
export const LIB_FILE_NAME = 'libs_{{index}}.js'
const GLOBAL_DEFINE = `// create by ${VERSION}
${GLOBAL_NAME} = ${GLOBAL_NAME} || (function () {
    var modules = {};
    return {
        define: function (moduleId, moduleResult) {
            if (modules[moduleId]) {
                throw new Error("module already defined: " + moduleId);
            }
            if ('default' in moduleResult) {
                moduleResult = Object.assign(moduleResult.default, moduleResult);
            }
            modules[moduleId] = moduleResult;
        },
        require: function (moduleId) {
            var moduleResult = modules[moduleId];
            if (!moduleResult && '.' != moduleId.charAt(0)) {
                throw new Error("module not found: " + moduleId);
            }
            return moduleResult;
        }
    }
})();`
const LIB_CODE = `{{each external}}import * as item{{@index}} from '{{@}}';\n{{/each}}
const define = ${GLOBAL_NAME}.define;
{{each external}}define('{{@}}', item{{@index}});\n{{/each}}
`

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
    const cache_path = conf.esbuild.cache_root || '.f2e_cache'
    const cache_root = path.join(conf.root, cache_path)
    if (!fs.existsSync(cache_root)) {
        fs.mkdirSync(cache_root, { recursive: true })
    }
    const builder: typeof import('esbuild') = require('esbuild')
    const sourcefile = _.template(LIB_FILE_NAME, { index: index + '' })
    const js_code = _.template(LIB_CODE, { external })
    fs.writeFileSync(path.join(cache_root, sourcefile), js_code)
    const result = await builder.build({
        ..._option,
        entryPoints: [cache_path + '/' + sourcefile],
        banner: {
            'js': GLOBAL_DEFINE
        },
    })
    await save({ store, result, conf })
}

