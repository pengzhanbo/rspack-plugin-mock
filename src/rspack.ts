import type { Compiler, RspackPluginInstance } from '@rspack/core'
import type { Server } from 'node:http'
import type { ResolvePluginOptions } from './core/resolvePluginOptions'
import type { MockServerPluginOptions } from './types'
import path from 'node:path'
import process from 'node:process'
import { isString, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import { buildMockServer } from './core/build'
import { createMockCompiler } from './core/mockCompiler'
import { createMockMiddleware } from './core/mockMiddleware'
import { mockWebSocket } from './core/mockWebsocket'
import { rewriteRequest } from './core/requestRecovery'
import { resolvePluginOptions as resolvePluginOptionsRaw } from './core/resolvePluginOptions'
import { waitingFor } from './core/utils'

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
      const waitServerForMockWebSocket = waitingFor<Server>((server) => {
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
          waitServerForMockWebSocket(() => devServer.server)
          return middlewares
        },
      }

      const wsPrefix = toArray(options.wsPrefix)
      if (compilerOptions.devServer?.proxy?.length) {
        const proxy = compilerOptions.devServer.proxy
        compilerOptions.devServer.proxy = proxy
          // 排除 proxy 中的 与 wsPrefix 相关的 ws 代理配置，避免 request upgrade 冲突
          .filter((item) => {
            if (typeof item !== 'function' && item.ws === true && wsPrefix.length) {
              return !toArray(item.context).filter(isString).some(context => wsPrefix.includes(context))
            }
            return true
          })
          // 恢复代理请求数据流
          .map((item) => {
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
