import type * as http from 'node:http'
import process from 'node:process'
import type { RsbuildPlugin } from '@rsbuild/core'
import { isArray, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import type { MockServerPluginOptions } from './types'
import { rewriteRequest } from './core/requestRecovery'
import { createManuallyMockMiddleware } from './core/mockMiddleware'

export function pluginMockServer(options: MockServerPluginOptions = {}): RsbuildPlugin {
  return {
    name: 'plugin-mock-server',

    setup(api) {
      if (process.env.NODE_ENV === 'production')
        return

      api.modifyRsbuildConfig((config) => {
        if (!config.server?.proxy)
          return

        const onProxyError = (err: Error, req: http.IncomingMessage, res: http.ServerResponse) => {
          console.error(err?.stack || err)
          res.statusCode = 500
          res.end()
        }

        if (isArray(config.server.proxy)) {
          config.server.proxy = config.server.proxy.map((item) => {
            if (typeof item !== 'function' && !item.ws) {
              const onProxyReq = item.onProxyReq
              const onError = item.onError
              return {
                ...item,
                onError: onError || onProxyError,
                onProxyReq: (proxyReq, req, ...args) => {
                  onProxyReq?.(proxyReq, req, ...args)
                  rewriteRequest(proxyReq, req)
                },
              }
            }
            return item
          })
        }
        else if ('target' in config.server.proxy) {
          const onProxyReq = config.server.proxy.onProxyReq as (...args: any[]) => void
          config.server.proxy.onProxyReq = (proxyReq, req, ...args) => {
            onProxyReq?.(proxyReq, req, ...args)
            rewriteRequest(proxyReq, req)
          }
          config.server.proxy.onError ??= onProxyError
        }
        else if (config.server.proxy) {
          const proxy = config.server.proxy as Record<string, any>
          Object.keys(proxy).forEach((key) => {
            const target = proxy[key]
            const options = typeof target === 'string' ? { target } : target
            if (options.ws)
              return

            const { onProxyReq, onError, ...rest } = options

            proxy[key] = {
              ...rest,
              onProxyReq: (proxyReq: http.ClientRequest, req: http.IncomingMessage, ...args: any[]) => {
                onProxyReq?.(proxyReq, req, ...args)
                rewriteRequest(proxyReq, req)
              },
              onError: onError || onProxyError,
            }
          })
        }
      })
      let compilerRun: (() => void) | undefined
      let compilerClose: (() => void) | undefined
      let compilerUpdateAlias: ((alias: Record<string, false | string | (string | false)[]>) => void) | undefined

      api.modifyRsbuildConfig((config) => {
        const proxy = config.server?.proxy || []
        const proxies: (string | ((pathname: string, req: any) => boolean))[] = []
        if (isArray(proxy)) {
          for (const item of proxy) {
            if (typeof item !== 'function' && !item.ws && item.context) {
              proxies.push(...toArray(item.context))
            }
          }
        }
        else if ('target' in proxy) {
          proxies.push(...toArray(proxy.context as any))
        }
        else {
          Object.entries(proxy).forEach(([context, opt]) => {
            if (typeof opt === 'string' || !opt.ws) {
              proxies.push(context)
            }
          })
        }
        const { mockMiddleware, run, close, updateAlias } = createManuallyMockMiddleware({
          plugins: [new rspack.DefinePlugin(config.source?.define || {})],
          alias: {},
          proxies,
          context: api.context.rootPath,
        }, options)
        compilerRun = run
        compilerClose = close
        compilerUpdateAlias = updateAlias

        config.dev ??= {}
        config.dev.setupMiddlewares ??= []
        config.dev.setupMiddlewares.push((middlewares) => {
          mockMiddleware(middlewares as any)
        })
      })

      api.onAfterCreateCompiler(({ compiler }) => {
        if (compilerUpdateAlias) {
          if ('compilers' in compiler) {
            compiler.compilers.forEach((compiler) => {
              compilerUpdateAlias?.(compiler.options.resolve?.alias || {})
            })
          }
          else {
            compilerUpdateAlias?.(compiler.options.resolve?.alias || {})
          }
        }
      })

      api.onAfterStartDevServer(() => compilerRun?.())
      api.onAfterStartProdServer(() => compilerRun?.())
      api.onExit(() => compilerClose?.())
    },
  }
}
