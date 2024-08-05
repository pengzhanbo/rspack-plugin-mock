import process from 'node:process'
import type { Server } from 'node:http'
import path from 'node:path'
import type { Compiler, RspackPluginInstance } from '@rspack/core'
import rspack from '@rspack/core'
import { isString, toArray } from '@pengzhanbo/utils'
import type { MockServerPluginOptions } from './types'
import { createMockMiddleware } from './core/mockMiddleware'
import { rewriteRequest } from './core/requestRecovery'
import {
  type ResolvePluginOptions,
  resolvePluginOptions as resolvePluginOptionsRaw,
} from './core/resolvePluginOptions'
import { createMockCompiler } from './core/mockCompiler'
import { mockWebSocket } from './core/mockWebsocket'
import { waitingFor } from './core/utils'
import { buildMockServer } from './core/build'

const PLUGIN_NAME = 'rspack-plugin-mock'

export class MockServerPlugin implements RspackPluginInstance {
  constructor(public options: MockServerPluginOptions = {}) {}

  apply(compiler: Compiler) {
    const compilerOptions = compiler.options
    const options = resolvePluginOptions(compiler, this.options)

    if (process.env.NODE_ENV !== 'production') {
      const mockCompiler = createMockCompiler(options)

      const mockMiddleware = createMockMiddleware(mockCompiler, options)
      const setupMiddlewares = compilerOptions.devServer?.setupMiddlewares
      const waitServer = waitingFor<Server>((server) => {
        mockWebSocket(mockCompiler, server, options)
      })

      compilerOptions.devServer = {
        ...compilerOptions.devServer,
        setupMiddlewares: (middlewares, devServer) => {
          middlewares = setupMiddlewares?.(middlewares, devServer) || middlewares
          const reload = () => {
            if (devServer.webSocketServer?.clients)
              devServer.sendMessage(devServer.webSocketServer.clients, 'static-changed')
          }
          middlewares = mockMiddleware(middlewares, reload) || middlewares
          /**
           * 在 @rspack/dev-server -> webpack-dev-server 中, setupMiddlewares 优先于 createServer
           * 执行，需要等待 server 启动后再注入 mock websocket
           */
          waitServer(() => devServer.server)
          return middlewares
        },
      }

      const proxy = compilerOptions.devServer?.proxy || []
      const wsPrefix = toArray(options.wsPrefix)
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
        }).filter((item) => {
          if (typeof item !== 'function' && item.ws === true && wsPrefix.length) {
            return !toArray(item.context).filter(isString).some(context => wsPrefix.includes(context))
          }
          return true
        })
      }

      compiler.hooks.watchRun.tap(PLUGIN_NAME, () => mockCompiler.run())
      compiler.hooks.watchClose.tap(PLUGIN_NAME, () => mockCompiler.close())
    }
    else if (options.build !== false) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => buildMockServer(
        options,
        compilerOptions.output.path || path.resolve(process.cwd(), 'dist'),
      ))
    }
  }
}

export function resolvePluginOptions(compiler: Compiler, options: MockServerPluginOptions): ResolvePluginOptions {
  const compilerOptions = compiler.options
  const alias = compilerOptions.resolve?.alias || {}
  const context = compilerOptions.context

  const definePluginInstance = compilerOptions.plugins?.find(
    plugin => plugin instanceof rspack.DefinePlugin,
  )
  const proxies = (compilerOptions.devServer?.proxy || []).flatMap((item) => {
    if (typeof item !== 'function' && item.context && !item.ws) {
      return item.context
    }
    return []
  })

  return resolvePluginOptionsRaw(options, {
    alias,
    context,
    plugins: toArray(definePluginInstance),
    proxies,
  })
}
