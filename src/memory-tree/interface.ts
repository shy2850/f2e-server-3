export namespace MemoryTree {
    export type DataBuffer = Buffer | string | object | undefined
    export interface Build {
        (pathname: string): Promise<void>
    }
    export interface BuildProvider {
        (options: Options, store: Store): Build
    }
    export interface Store {
        _set: {
            (path: string, data: DataBuffer): void
        }
        _get: {
            (path: string): DataBuffer
        }
        load: {
            (path: string): Promise<DataBuffer>
        }
        _reset: {
            (): void
        }
    }

    /** onSet函数链式返回对象 */
    export interface SetResult {
        /** 数据 */
        data: DataBuffer;
        /** 资源输出路径，资源原始根路径的相对路径： a/b/c */
        outputPath: string;
        /** 资源原始路径，资源输出根路径的相对路径： a/b/c */
        originPath: string;
    }
    /** 构建配置 */
    export interface Options {
        /** 资源原始根路径 */
        root: string;
        /** 资源输出根路径 */
        dest?: string
        /** 监听文件修改并输出 */
        watch?: boolean
        /** 过滤需要构建的文件或目录 */
        buildFilter?: {
            (pathname: string): boolean
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
    export interface MemoryTree {
        store: MemoryTree.Store,
        input: MemoryTree.Build,
        output: MemoryTree.Build
    }
}