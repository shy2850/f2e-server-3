import * as UWS from 'uWebSockets.js'
import logger from './logger'

const meta = require('../../package.json')

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
