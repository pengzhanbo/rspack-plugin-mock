import process from 'node:process'
import type http from 'node:http'
import type { RspackOptionsNormalized, RspackPluginInstance } from '@rspack/core'
import { isBoolean, toArray } from '@pengzhanbo/utils'
import cors, { type CorsOptions } from 'cors'
import { pathToRegexp } from 'path-to-regexp'
import type { MockServerPluginOptions } from '../types'
import { resolvePluginOptions } from './resolvePluginOptions'
import type { MockCompiler } from './mockCompiler'
import { createMockCompiler } from './mockCompiler'
import { doesProxyContextMatchUrl, urlParse } from './utils'
import { baseMiddleware } from './baseMiddleware'
import { createLogger } from './logger'

export interface MiddlewareOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: any) => boolean))[]
  context?: string
  plugins: RspackPluginInstance[]
}

export function createManuallyMockMiddleware(
  { alias, proxies, context = process.cwd(), plugins }: MiddlewareOptions,
  pluginOptions: MockServerPluginOptions,
) {
  const options = resolvePluginOptions(pluginOptions, context)
  const logger = createLogger(
    'rspack:mock',
    isBoolean(options.log) ? (options.log ? 'info' : 'error') : options.log,
  )

  const compiler = createMockCompiler({
    alias,
    plugins,
    cwd: options.cwd,
    include: toArray(options.include),
    exclude: toArray(options.exclude),
  })

  function mockMiddleware(middlewares: Middleware[]): Middleware[] {
    middlewares.unshift(baseMiddleware(compiler, {
      formidableOptions: options.formidableOptions,
      proxies,
      cookiesOptions: options.cookiesOptions,
      bodyParserOptions: options.bodyParserOptions,
      priority: options.priority,
      logger,
    }))

    const corsMiddleware = createCorsMiddleware(compiler, proxies, options)
    if (corsMiddleware) {
      middlewares.unshift(corsMiddleware)
    }

    return middlewares
  }

  return {
    mockMiddleware,
    run: () => compiler.run(),
    close: () => compiler.close(),
    updateAlias: compiler.updateAlias.bind(compiler),
  }
}

export function createMockMiddleware(
  middlewareOptions: MiddlewareOptions,
  pluginOptions: MockServerPluginOptions,
) {
  const { mockMiddleware, run, close } = createManuallyMockMiddleware(
    middlewareOptions,
    pluginOptions,
  )

  run()

  process.on('exit', () => close())

  return mockMiddleware
}

function createCorsMiddleware(
  compiler: MockCompiler,
  proxies: (string | ((pathname: string, req: any) => boolean))[],
  options: Required<MockServerPluginOptions>,
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
