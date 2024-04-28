import * as UWS from 'uWebSockets.js'
import logger from './logger'
import meta from '../../package.json'
import { exit } from 'node:process'
import path from 'node:path'
import fs from 'node:fs'

/** 是否bunjs环境？ */
const isBun = 'bun' in process.versions

/** 是否支持 uWebSockets.js*/
export let uWS: typeof UWS = null as any
export const version = process.platform + '_' + process.arch + '_' + process.versions.modules
if (!isBun) {
    try {
        uWS = require('uWebSockets.js')
        logger.debug(
            'uWebsuckets.js version: ', version,
        );
    } catch (e) {
        logger.debug('uWebSockets.js not found, use default node:http(s) module instead')
    }
} else {
    logger.debug('bunjs environment, use default node:http(s)')
}

/**
 * 服务运行环境是 uWebSockets.js, bunjs, 还是原生node
 */
export const ENGINE_TYPE = isBun ? 'bun' : (uWS ? 'uws' : 'node')
export const VERSION = `${meta.name} ${meta.version} [${ENGINE_TYPE}]`

/**
 * 裁剪 uWebSockets.js node包node源文件，仅保留指定版本的 node 用于减少总包大小
 * @param varsions 需要保留的node版本
 */
export const filterBins = (versions = [version], basepath: string = 'node_modules/uWebSockets.js/') => {
    if (!uWS) {
        throw new Error('当前不是 uWebSockets.js 环境')
    }
    const usefuls = versions.map(version => `uws_${version}.node`)
    if (!basepath.startsWith('/')) {
        basepath = path.join(process.cwd(), basepath)
    }
    if (!fs.existsSync(basepath)) {
        logger.error(`uWs bin filter: ${basepath} not exists`)
        exit(1)
    }
    fs.readdirSync(basepath).forEach(file => {
        if (/^uws_(\w+)\.node$/.test(file) && !usefuls.includes(file)) {
            logger.info(`uWs bin delete: ${basepath}${file}`)
            fs.unlinkSync(path.join(basepath, file))
        }
    })
    return usefuls
}