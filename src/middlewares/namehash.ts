import { MemoryTree } from "../memory-tree";

/** 有过改写路径的编译资源 */
const input_output_map = new Map<string, MemoryTree.SetResult & { hash: string }>()

export const setResult = (hash: string, item: MemoryTree.SetResult) => input_output_map.set(item.originPath, { ...item, hash })

export const getResult = (pathname: string) => input_output_map.get(pathname)