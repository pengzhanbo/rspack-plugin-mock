import type http from 'node:http'
import type { RspackOptionsNormalized, RspackPluginInstance } from '@rspack/core'
import cors, { type CorsOptions } from 'cors'
import { pathToRegexp } from 'path-to-regexp'
import type { ResolvePluginOptions } from './resolvePluginOptions'
import type { MockCompiler } from './mockCompiler'
import { doesProxyContextMatchUrl, urlParse } from './utils'
import { baseMiddleware } from './baseMiddleware'

export interface MiddlewareOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: any) => boolean))[]
  context?: string
  plugins: RspackPluginInstance[]
}

export function createMockMiddleware(
  compiler: MockCompiler,
  options: ResolvePluginOptions,
) {
  function mockMiddleware(middlewares: Middleware[], reload?: () => void): Middleware[] {
    middlewares.unshift(baseMiddleware(compiler, options))

    const corsMiddleware = createCorsMiddleware(compiler, options)
    if (corsMiddleware) {
      middlewares.unshift(corsMiddleware)
    }
    if (options.reload) {
      compiler.on('update', () => reload?.())
    }

    return middlewares
  }

  return mockMiddleware
}

function createCorsMiddleware(
  compiler: MockCompiler,
  options: ResolvePluginOptions,
): Middleware | undefined {
  let corsOptions: CorsOptions = {}

  // enable cors by default
  const enabled = options.cors !== false

  if (enabled) {
    corsOptions = {
      ...corsOptions,
      ...(typeof options.cors === 'boolean' ? {} : options.cors),
    }
  }

  const proxies = options.proxies

  return !enabled
    ? undefined
    : function (req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void) {
      const { pathname } = urlParse(req.url!)
      if (
        !pathname
        || proxies.length === 0
        || !proxies.some(context =>
          doesProxyContextMatchUrl(context, req.url!, req),
        )
      ) {
        return next()
      }

      const mockData = compiler.mockData

      const mockUrl = Object.keys(mockData).find(key =>
        pathToRegexp(key).test(pathname),
      )

      if (!mockUrl)
        return next()

      cors(corsOptions)(req, res, next)
    }
}

type SetupMiddlewaresFn = NonNullable<
  NonNullable<RspackOptionsNormalized['devServer']>['setupMiddlewares']
>

export type Middleware = SetupMiddlewaresFn extends
(middlewares: (infer T)[], devServer: any) => void ? T : never

export type Server = SetupMiddlewaresFn extends
(middlewares: any, devServer: infer T) => void ? T : never
