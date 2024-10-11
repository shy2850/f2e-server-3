// @ts-check
const { createServer, UserStore, createResponseHelper, logger, Command, ModeOptions, LogLevelOptions } = require("../lib/index.js");
const { exit } = require("node:process");
const { server } = require("./apis.cjs");
const path = require("node:path")
const { marked } = require("marked");

const command = new Command('server')
    .option('-m, --mode <mode>', 'server mode: dev, build or prod', 'dev', ModeOptions)
    .option('-g, --gzip <gzip>', 'enable gzip', true)
    .option('-l, --level <level>', 'log level: DEBUG, INFO, LOG, WARN, ERROR', 'DEBUG', LogLevelOptions)
    .action(async (options) => {
        const { mode, gzip, level } = options
        logger.setLevel(level)
        logger.debug('options:', options)
        let i = 0;
        const context = await createServer({
            mode,
            gzip,
            livereload: {
                reg_inject: /\.(html|md)$/,
            },
            // ssl: {
            //     passphrase: 'x509',
            //     key_file_name: path.join(import.meta.dirname, './private.pem'),
            //     cert_file_name: path.join(import.meta.dirname, './csr.crt'),
            // },
            less: {
                entryPoints: ['test/app/app.less'],
            },
            alias: {
                // 'highlight/highlight.js': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
                // 'highlight/highlight.css': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css',
                'highlight/monokai-sublime.css': 'node_modules/highlight.js/styles/monokai-sublime.css',
            },
            mimeTypes: {
                'ts': 'text/plain',
                'hbs': 'text/plain',
            },
            buildFilter: (pathname) => {
                return /^(index|test($|\/index\.html|\/start)|README|package|$)/.test(pathname)
            },
            onRoute: (pathname, {resp}) => {
                if (/^src$/i.test(pathname)) {
                    resp.writeStatus('200 OK')
                    resp.end('hello: ' + i++)
                    return false
                }
            },
            onSet: async (pathname, data, store) => {
                if (/\.md$/.test(pathname)) {
                    return {
                        data: marked(data?.toString() || ""),
                        originPath: pathname,
                        outputPath: pathname.replace('.md', '.html'),
                    }
                }
                return { data, originPath: pathname, outputPath: pathname }
            },
            try_files: [
                { test: /redirect/, location: '/package.json' },
                { test: /^home/, index: 'test/index.html', }
            ],
            auth: {
                redirect: true,
                store: new UserStore(path.join(process.cwd(), '.f2e_cache/auth.db'), {
                    username: 'admin',
                    nickname: '管理员',
                }),
            },
            postcss: {
                entryPoints: './test/main.css',
                tailwindConfig: {
                    content: ['./test/**/*.{html,ts,tsx}'],
                },
            },
            middlewares: [
                server,
            ],
        })

        // logger.debug('run_get_config', context.conf)
        const { handleSuccess, handleError } = createResponseHelper(context.conf)
        if ('app' in context) {
            context.app?.get("/exit", (res, req) => {
                res.cork(() => {
                    logger.info("Exit Server!");
                    setTimeout(() => exit(0), 100);
                    handleSuccess({ resp: res, headers: {} }, 'html', "Exit Server!".big().bold());
                });
            });
        }
    })
command.parse(process.argv)