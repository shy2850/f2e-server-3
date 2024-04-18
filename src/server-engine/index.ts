import * as engine_bun from './bun'
import * as engine_node from './native'
import * as engine_uws from './uws'
import { ENGINE_TYPE } from '../utils/engine'
import logger from '../utils/logger'

export { ENGINE_TYPE }
logger.debug(`app run in [${ENGINE_TYPE}] environment.\n`)

const engine = {
    bun: engine_bun,
    node: engine_node,
    uws: engine_uws,
}[ENGINE_TYPE]

export default engine