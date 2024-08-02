import process from 'node:process'
import type { Compiler, RspackPluginInstance } from '@rspack/core'
import rspack from '@rspack/core'
import { toArray } from '@pengzhanbo/utils'
import type { MockServerPluginOptions } from './types'
import type { MiddlewareOptions } from './core/mockMiddleware'
import { createManuallyMockMiddleware } from './core/mockMiddleware'
import { rewriteRequest } from './core/requestRecovery'

const PLUGIN_NAME = 'rspack-plugin-mock'

export class MockServerPlugin implements RspackPluginInstance {
  constructor(public options: MockServerPluginOptions = {}) {}

  apply(compiler: Compiler) {
    const compilerOptions = compiler.options

    if (process.env.NODE_ENV !== 'production') {
      const { mockMiddleware, run, close } = createManuallyMockMiddleware(
        resolveMiddleOptions(compiler),
        this.options,
      )

      const setupMiddlewares = compilerOptions.devServer?.setupMiddlewares

      compilerOptions.devServer = {
        ...compilerOptions.devServer,
        setupMiddlewares: (middlewares, devServer) => {
          middlewares = setupMiddlewares?.(middlewares, devServer) || middlewares
          middlewares = mockMiddleware(middlewares) || middlewares
          return middlewares
        },
      }

      const proxy = compilerOptions.devServer?.proxy || []
      if (proxy.length) {
        compilerOptions.devServer!.proxy = proxy.map((item) => {
          if (typeof item !== 'function' && !item.ws) {
            const onProxyReq = item.onProxyReq
            item.onProxyReq = (proxyReq, req, ...args) => {
              onProxyReq?.(proxyReq, req, ...args)
              rewriteRequest(proxyReq, req)
            }
          }
          return item
        })
      }

      compiler.hooks.watchRun.tap(PLUGIN_NAME, () => run())
      compiler.hooks.watchClose.tap(PLUGIN_NAME, () => close())
    }
  }
}

export function resolveMiddleOptions(compiler: Compiler): MiddlewareOptions {
  const compilerOptions = compiler.options
  const alias = compilerOptions.resolve?.alias || {}
  const context = compilerOptions.context

  const definePluginInstance = compilerOptions.plugins?.find(
    plugin => plugin instanceof rspack.DefinePlugin,
  )
  const proxies = (compilerOptions.devServer?.proxy || []).map((item) => {
    if (typeof item !== 'function' && !item.ws && item.context) {
      return item.context
    }
    return []
  }).flat()
  return { alias, context, plugins: toArray(definePluginInstance), proxies }
}
