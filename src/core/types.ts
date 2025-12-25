import type { RspackOptionsNormalized } from '@rspack/core'

type SetupMiddlewaresFn = NonNullable<
  NonNullable<RspackOptionsNormalized['devServer']>['setupMiddlewares']
>

export type Middleware = SetupMiddlewaresFn extends
(middlewares: (infer T)[], devServer: any) => void ? T : never

export type Server = SetupMiddlewaresFn extends
(middlewares: any, devServer: infer T) => void ? T : never
