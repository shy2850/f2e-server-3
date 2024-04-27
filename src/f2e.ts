import { createServer } from './index'
import logger from './utils/logger'
import * as _ from './utils/misc'

createServer({}).then(({conf}) => {
    logger.info(`server start on ${conf.ssl ? 'https://' : 'http://'}${_.ServerIP}:${conf.port}`, )
})