// @ts-check
import { createServer, UserStore, createResponseHelper, logger } from "../lib/index.js"
import { exit } from "node:process";
import { server } from "./apis.mjs";
import path from "node:path";
import { marked } from "marked";

const { argv } = process
const mode = process.env['F2E_MODE'] || argv[argv.length - 1]

let i = 0;
createServer({
    mode: mode === 'dev' || mode === 'build' ? mode : 'prod',
    // host: "server.local",
    gzip: true,
    ssl: {
        passphrase: 'x509',
        key_file_name: path.join(import.meta.dirname, './private.pem'),
        cert_file_name: path.join(import.meta.dirname, './csr.crt'),
    },
    less: {
        entryPoints: ['test/app/app.less', 'test/app/highlight.less'],
    },
    mimeTypes: {
        'ts': 'text/plain',
        'hbs': 'text/plain',
    },
    buildFilter: (pathname) => {
        return /^(src|templates|index|test($|\/index\.html)|README|package|$)/.test(pathname)
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
        store: new UserStore(path.join(process.cwd(), '.f2e_cache/auth.db')),
    },
    middlewares: [
        server,
    ],
}).then((context) => {
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

