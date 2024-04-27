import { createBuilder, createServer } from './index'
import { F2E_CONFIG, setConfigPath } from './utils/config'
import logger, { LogLevel } from './utils/logger'
import * as _ from './utils/misc'
import { program } from 'commander'
import path from 'node:path'
import fs from 'node:fs'

program.version(require('../package.json').version);

program
    .command('conf')
    .description(`生成 ${F2E_CONFIG} 配置文件模板`)
    .action(() => {
        const filepath = path.resolve(process.cwd(), F2E_CONFIG)
        if (fs.existsSync(filepath)) {
            console.log(`${F2E_CONFIG} 文件已存在`)
        } else {
            fs.writeFileSync(filepath, `// @ts-check
/**
 * @type {import('f2e-server3').F2EConfig}
 */
const conf = {
    try_files: 'index.html',
    buildFilter: (pathname) => /^(src|css|favicon|index)/.test(pathname),
}
`)
            console.log(`${F2E_CONFIG} 文件已生成`)
        }
    })

program.command('build')
    .option('-c, --config <cfg_path>', '修改配置文件地址', F2E_CONFIG)
    .option('-r, --root <root>', '设置工作目录', process.cwd())
    .option('-o, --output <dest>', '设置输出目录', path.join(process.cwd(), 'output'))
    .option('-l, --level <level>', '设置日志打印级别, 支持 DEBUG/INFO/WARN/ERROR,', 'INFO')
    .action(async (options) => {
        const { cfg_path, root, dest, level } = options
        if (cfg_path) {
            setConfigPath(cfg_path)
        }
        if (level) {
            logger.setLevel(level)
        }
        const beginTime = Date.now()
        createBuilder({ root, dest, mode: 'build' }).then(async () => {
            const during = Date.now() - beginTime
            logger.info(`build success in: ${during}ms`)
        })
    })

program.command('start')
    .option('-c, --config <cfg_path>', '修改配置文件地址', F2E_CONFIG)
    .option('-r, --root <root>', '设置工作目录', process.cwd())
    .option('-p, --port <port>', '设置端口', '2850')
    .option('-m, --mode <mode>', '设置模式, 支持 dev/prod', 'dev')
    .option('-l, --level <level>', '设置日志打印级别, 支持 DEBUG/INFO/WARN/ERROR,', 'INFO')
    .action(async (options) => {
        const { cfg_path, root, port, mode = 'dev', level } = options
        if (cfg_path) {
            setConfigPath(cfg_path)
        }
        if(level) {
            logger.setLevel(level)
        }
        const beginTime = Date.now()
        createServer({ root, port, mode }).then(async ({conf}) => {
            const during = Date.now() - beginTime
            logger.info(`server start in: ${during}ms,  on ${conf.ssl ? 'https://' : 'http://'}${_.ServerIP}:${conf.port}`)
        })
    })

// 开始解析用户输入的命令
program.parse(process.argv)