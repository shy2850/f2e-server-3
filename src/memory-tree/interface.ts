export namespace MemoryTree {
    export type DataBuffer = Buffer | string | object | undefined
    export interface Build {
        (pathname: string): Promise<void>
    }
    export interface Watch {
        (): void
    }
    export interface BuildProvider {
        (options: Options, store: Store): Build
    }
    export interface Store {
        /** 原始资源映射 */
        origin_map: Map<string, SetResult>
        /** 结果资源映射 */
        output_map: Map<string, SetResult>
        /** 保存资源，同时处理路径变更 */
        save: {
            (result: SetResult): void
        }
        /** 直接从内存获取资源 */
        _get: {
            (path: string): DataBuffer
        }
        /** 加载资源，从内存获取后执行 onGet 返回结果 */
        load: {
            (path: string): Promise<DataBuffer>
        }
        /** 清空所有数据 */
        _reset: {
            (): void
        }
    }

    export interface Events {
        /** 过滤需要构建的文件或目录, 默认不编译超过100M的文件 */
        buildFilter?: {
            (pathname: string, size?: number): boolean
        }
        /** 过滤需要监听的文件或目录 */
        watchFilter?: {
            (pathname: string): boolean
        }
        /** 监听文件或目录发生变更后执行 */
        buildWatcher?: {
            (pathname: string, eventType: string, build: Build, store: Store): void
        }
        /** 保存资源到内存时，对资源进行处理 */
        onSet: {
            (pathname: string, data: DataBuffer, store: Store): Promise<SetResult>
        }
        /** 内存资源输出时，对资源进行处理 */
        onGet: {
            (pathname: string, data: DataBuffer, store: Store): Promise<DataBuffer>
        }
        /** 过滤需要输出的资源 */
        outputFilter?: {
            (pathname: string, data?: DataBuffer): boolean
        }
    }

    /** onSet函数链式返回对象 */
    export interface SetResult {
        /** 数据 */
        data: DataBuffer;
        /** 数据MD5摘要 */
        hash?: string;
        /** 资源原始路径，资源输出根路径的相对路径： a/b/c */
        originPath: string;
        /** 资源输出路径，资源原始根路径的相对路径： a/b/c, 根据namehash 配置可能携带hash信息如： static/index.js?123456 */
        outputPath: string;
    }
    /** 构建配置 */
    export interface Options extends Events {
        /** 资源原始根路径 */
        root: string;
        /** 资源输出根路径 */
        dest?: string
        /** 监听文件修改并输出 */
        watch?: boolean
        /** 是否计算资源hash并修改文件名 */
        namehash?: HashReplacerOptions
        /** 映射文件后缀名到指定MIME */
        mimeTypes?: { [key: string]: string }
    }
    export interface MemoryTree {
        store: MemoryTree.Store;
        input: MemoryTree.Build;
        output: MemoryTree.Build;
        /** watch 和 input 分开，确保各个事件执行顺序正常 */
        watch: MemoryTree.Watch;
    }
}

/**
 * 资源引用修改名称
 * @default 
     {
        entries: ['*index\\.html$'],
        searchValue: ['\\s(?:src)="([^"]*?)"', '\\s(?:href)="([^"]*?)"'],
        replacer: (output, hash) => `/${output}?${hash}`
    }
 */
export interface HashReplacerOptions {
    /**
     * 要处理的入口文件 正则字符串
     * @default ["index\\.html$"]
    */
    entries?: string[]
    /**
     * 替换src的正则
     * @default ['\\s(?:=href|src)="([^"]*?)"']
     */
    searchValue?: string[]
    /**
     * 默认返回 `${output}?${hash}`
     * @param output 替换后的文件名
     * @param hash 文件摘要md5
     * @returns 字符串
     *
     */
    replacer?: (output: string, hash?: string) => string
}