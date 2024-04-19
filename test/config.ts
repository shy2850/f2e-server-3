import { getConfigResult } from '../src/utils/config'
import { VERSION } from '../src/utils/engine'
import logger from '../src/utils/logger'
import * as _ from '../src/utils/misc'

export const run_get_config = function () {
    logger.log('run_get_config', getConfigResult())
    logger.log('VERISON', VERSION)
}
