export type RouterParamKeys<T extends string, S extends string = '/', M extends string = ':'> = T extends `${infer A}${S}${infer B}` ? (
    A extends `${M}${infer R}` ? (R | RouterParamKeys<B, S, M>) : RouterParamKeys<B, S, M>
) : (T extends `${M}${infer R}` ? R : never)

export type RouterParam<T extends string> = RouterParamKeys<T> extends never ? never : { [k in RouterParamKeys<T>]: string }
