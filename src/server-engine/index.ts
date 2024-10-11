import * as engine_node from './native'
import * as engine_uws from './uws'
import { ENGINE_TYPE } from '../utils/engine'

export { ENGINE_TYPE }

const engine = {
    node: engine_node,
    deno: engine_node,
    bun: engine_node,
    uws: engine_uws,
}[ENGINE_TYPE]

export default engine