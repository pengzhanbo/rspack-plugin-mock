import type { Compiler, DevServer, RspackPluginInstance } from '@rspack/core'
import type { Server } from 'node:http'
import type { MockCompiler } from '../compiler'
import type { MockServerPluginOptions } from '../types'
import type { ResolvePluginOptions } from './options'
import path from 'node:path'
import process from 'node:process'
import { isFunction, isString, toArray, toTruthy } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import { buildMockServer } from '../build'
import { createMockCompiler } from '../compiler'
import { createMockMiddleware, rewriteRequest } from '../mockHttp'
import { mockWebSocket } from '../mockWebsocket'
import { Recorder } from '../recorder'
import { waitingFor } from '../utils'
import { resolvePluginOptions as resolvePluginOptionsRaw } from './options'

const PLUGIN_NAME = 'rspack-plugin-mock'

export class MockServerPlugin implements RspackPluginInstance {
  constructor(public options: MockServerPluginOptions = {}) {}

  apply(compiler: Compiler): void {
    // 禁用 mock 服务
    if (this.options.enabled === false)
      return

    const compilerOptions = compiler.options
    const options = this.resolvePluginOptions(compiler, this.options)
    const isProd = process.env.NODE_ENV === 'production'

    // 构建 mock 服务
    if (isProd && options.build !== false) {
      compiler.hooks.afterEmit.tap(
        PLUGIN_NAME,
        () => buildMockServer(
          options,
          compilerOptions.output.path || path.resolve(process.cwd(), 'dist'),
        ),
      )
    }

    // 生产环境下，无需开启 mock 服务
    if (isProd)
      return

    // 明确禁用 devServer 时，无需开启 mock 服务
    if (compilerOptions.devServer === false) {
      options.logger.warn(`Not find devServer, ${PLUGIN_NAME} was disabled`)
      return
    }

    const devServer = (compilerOptions.devServer ||= {})
    const mockCompiler = createMockCompiler(options)

    this.provideMiddleware(mockCompiler, devServer, options)
    this.provideProxyConfig(options, devServer!)

    compiler.hooks.watchRun.tap(PLUGIN_NAME, () => mockCompiler.run())
    compiler.hooks.watchClose.tap(PLUGIN_NAME, () => mockCompiler.close())
  }

  provideMiddleware(mockCompiler: MockCompiler, devServer: DevServer, options: ResolvePluginOptions): void {
    const setupMiddlewares = devServer.setupMiddlewares
    const waitServerForMockWebSocket = waitingFor<Server>((server) => {
      mockWebSocket(mockCompiler, server, options)
    })

    // 注入 mock 中间件
    devServer.setupMiddlewares = function (middlewares, devServer) {
      middlewares = setupMiddlewares?.(middlewares, devServer) || middlewares
      middlewares.unshift(createMockMiddleware(mockCompiler, options))
      // 开启热更新时，mock 更新后通知页面刷新
      if (options.reload) {
        mockCompiler.on('update', () => {
          if (devServer.webSocketServer?.clients)
            devServer.sendMessage(devServer.webSocketServer.clients, 'static-changed')
        })
      }
      /**
       * 在 @rspack/dev-server 中, setupMiddlewares 优先于 createServer
       * 执行，需要等待 server 启动后再注入 mock websocket
       */
      waitServerForMockWebSocket(() => devServer.server)
      return middlewares
    }
  }

  provideProxyConfig(options: ResolvePluginOptions, devServer: DevServer): void {
    if (!devServer.proxy?.length)
      return

    const wsPrefix = toArray(options.wsPrefix)

    // 初始化请求录制器
    let recorder: Recorder | null = null
    if (options.record.enabled) {
      recorder = new Recorder(options.record)
    }

    const proxy = devServer.proxy
    devServer.proxy = proxy
      // 排除 proxy 中的 与 wsPrefix 相关的 ws 代理配置，避免 request upgrade 冲突
      .filter((item) => {
        if (!isFunction(item) && item.ws === true && wsPrefix.length) {
          return !toArray(item.pathFilter || item.context).filter(isString).some(context => wsPrefix.includes(context))
        }
        return true
      })
      .map((item) => {
        if (!isFunction(item) && !item.ws) {
          const plugins = (item.plugins ??= [])
          // 恢复代理请求数据流
          plugins.push(proxyServer => proxyServer.on('proxyReq', rewriteRequest))
          // 记录请求
          if (options.record.enabled && recorder) {
            plugins.push(recorder.getPlugin())
          }
        }
        return item
      })
  }

  resolvePluginOptions(compiler: Compiler, options: MockServerPluginOptions = {}): ResolvePluginOptions {
    const compilerOptions = compiler.options
    const alias = compilerOptions.resolve?.alias || {}
    const context = compilerOptions.context

    const definePluginInstance = compilerOptions.plugins?.find(
      plugin => plugin instanceof rspack.DefinePlugin,
    )
    const devServer = compilerOptions.devServer || {}
    const proxies = (devServer.proxy || []).flatMap((item) => {
      if (!isFunction(item) && !item.ws) {
        return item.pathFilter || item.context
      }
      return []
    }).filter(toTruthy)

    return resolvePluginOptionsRaw(options, {
      alias,
      context,
      plugins: toArray(definePluginInstance),
      proxies,
    })
  }
}
