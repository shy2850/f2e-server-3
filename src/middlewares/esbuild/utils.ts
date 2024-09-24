import * as fs from 'node:fs';
import path from "node:path";
import * as _ from '../../utils/misc'
import { code_define, code_externals } from "../../utils/templates";
import { VERSION } from "../../utils/engine";
import { EsbuildConfig } from './interface';
import { BuildOptions } from 'esbuild';

export const default_config: Required<EsbuildConfig> = {
    esbuildrc: '.esbuildrc.js',
    build_external: true,
    with_metafile: false,
    reg_inject: /index\.html$/,
    reg_replacer: /<script\s.*?src="(.*?)".*?>\s*<\/script\>/g,
    cache_root: '.f2e_cache',
    inject_global_name: '__f2e_esbuild_inject__',
    external_lib_name: 'external_lib.js',
}
export const generate_global_name = (inject_global_name: string, i: number) => `window["${inject_global_name}${i ? `_${i}` : ''}"]`

export const generate_filename = (filename: string, index: number | string) => {
    const ext = path.extname(filename)
    return `${path.basename(filename, ext)}${index ? `_${index}` : ''}${ext}`
}

export const generate_inject_code = (inject_global_name: string, index: number) => {
    return _.template(code_define, { VERSION, GLOBAL_NAME: generate_global_name(inject_global_name, index) })
}
export const generate_externals_code = (inject_global_name: string, external: string[], index: number) => {
    return _.template(code_externals, { external, GLOBAL_NAME: generate_global_name(inject_global_name, index) })
}
export const generate_banner_code = (inject_global_name: string, index: number) => {
    const GLOBAL_NAME = generate_global_name(inject_global_name, index)
    return `\nrequire = ${GLOBAL_NAME} && ${GLOBAL_NAME}.require;`
}

export const write_cache_file = (cache_path: string, filename: string, code: string) => {
    if (!fs.existsSync(cache_path)) {
        fs.mkdirSync(cache_path, { recursive: true })
    }
    fs.writeFileSync(path.join(cache_path, filename), code)
}


export interface BuildExternalFileOptions {
    filename: string;
    conf: EsbuildConfig;
    modules: string[];
    index: number;
}
export const build_external_file = ({ filename, conf, modules, index }: BuildExternalFileOptions) => {
    const {
        cache_root = default_config.cache_root,
        inject_global_name = default_config.inject_global_name,
    } = conf
    const js_code = generate_externals_code(inject_global_name, modules, index)
    write_cache_file(cache_root, filename, js_code)
}

export const getEntryPaths = (entryPoints: BuildOptions['entryPoints']) => {
    const paths: string[] = []
    if (Array.isArray(entryPoints)) {
        for (const entry of entryPoints) {
            if (typeof entry === 'string') {
                paths.push(entry)
            } else {
                paths.push(entry.in)
            }
        }
    } else if (entryPoints) {
        Object.values(entryPoints).forEach(item => {
            paths.push(item)
        })
    }
    return paths
}