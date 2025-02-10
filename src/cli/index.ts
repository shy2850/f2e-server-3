#!/usr/bin/env node

import { createBuilder, createServer, ModeOptions } from '../index'
import { F2E_CONFIG, setConfigPath } from '../utils/config'
import logger, { LogLevelOptions } from '../utils/logger'
import * as _ from '../utils/misc'
import path from 'node:path'
import { Command } from '../utils/commander'
import { exec } from 'node:child_process'
import { readFileSync, unlink, writeFileSync } from 'node:fs'

const program = new Command('f2e3')
program.version(require('../../package.json').version);

program
    .command('create <appname>')
    .description(`下载项目模版`)
    .action((options) => {
        const { appname } = options
        exec(`git clone https://gitee.com/f2e-server/f2e-create-template.git ${appname}`, function (err) {
            if (err) {
                logger.error(`[f2e-create] create template error: ${err}`)
                process.exit(1)
            } else {
                unlink(path.join(process.cwd(), appname, '.git'), () => {})
                ;['README.md', 'index.html', 'package.json'].forEach(file => {
                    const filepath = path.join(process.cwd(), appname, file)
                    const content = readFileSync(filepath, 'utf-8')
                    writeFileSync(filepath, content.replaceAll('f2e-create-template', appname))
                })
            }
        })
    })

program.command('build')
    .description(`构建项目`)
    .option('-c, --config <cfg_path>', '修改配置文件地址', F2E_CONFIG)
    .option('-r, --root <root>', '设置工作目录', process.cwd())
    .option('-o, --output <dest>', '设置输出目录', path.join(process.cwd(), 'output'))
    .option('-l, --level <level>', '设置日志打印级别, 支持 DEBUG/INFO/WARN/ERROR,', 'INFO', LogLevelOptions)
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
    .description('启动开发服务器')
    .option('-c, --config <cfg_path>', '修改配置文件地址', F2E_CONFIG)
    .option('-r, --root <root>', '设置工作目录', process.cwd())
    .option('-p, --port <port>', '设置端口', 2850)
    .option('-m, --mode <mode>', '设置模式, 支持 dev/build/prod', 'prod', ModeOptions)
    .option('-l, --level <level>', '设置日志打印级别, 支持 DEBUG/INFO/WARN/ERROR,', 'INFO', LogLevelOptions)
    .action(async (options) => {
        const { cfg_path, root, port, mode, level } = options
        if (cfg_path) {
            setConfigPath(cfg_path)
        }
        if(level) {
            logger.setLevel(level)
        }
        createServer({ root, port, mode: mode })
    })

// 开始解析用户输入的命令
program.parse(process.argv)