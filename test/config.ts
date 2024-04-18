import { getConfigResult } from '../src/utils/config'
import logger from '../src/utils/logger'
import * as _ from '../src/utils/misc'

export const run_get_config = function () {
    logger.log('run_get_config', getConfigResult())
    logger.log('VERISON', _.VERSION)
}
