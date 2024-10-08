import { MemoryTree } from "../../memory-tree";
import { MiddlewareCreater } from "../interface";
import * as fs from 'node:fs/promises'
import * as path from "node:path";
import * as http from 'node:http'
import * as https from 'node:https'

const http_get = (url: string, options?: https.RequestOptions) => {
    const _url = new URL(url);
    return new Promise<Buffer>((resolve, reject) => {
        (/^https/i.test(_url.protocol) ? https : http).get(_url, options || {}, (resp) => {
            const chunks: Buffer[] = []
            resp.on('data', function (data) {
                chunks.push(data)
            }).on('end', function () {
                resolve(Buffer.concat(chunks))
            }).on('error', reject)
        })
    })
}

const middleware_alias: MiddlewareCreater = {
    name: 'alias',
    mode: ['dev', 'build'],
    execute: (conf) => {
        const { alias } = conf;
        if (!alias) {
            return
        }
        const items = Object.entries(alias);
        return {
            async onMemoryInit(store) {
                for (let i = 0; i < items.length; i++) {
                    const [outputPath, originItem] = items[i];
                    const { url: originPath, options } = typeof originItem === 'string' ? {
                        url: originItem,
                        options: {},
                    } : originItem;

                    const result: MemoryTree.SetResult = {
                        originPath,
                        outputPath,
                        data: undefined,
                    }
                    if (/^https?:\/\//.test(originPath)) {
                        result.data = await http_get(originPath, options)
                    } else {
                        result.data = await fs.readFile(path.resolve(conf.root, originPath))
                    }
                    store.save(result)
                }
            },
        }
    }
}

export default middleware_alias