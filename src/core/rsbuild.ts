import type { ProxyOptions, RsbuildConfig, RsbuildDevServer, RsbuildPlugin, RsbuildServerBase } from '@rsbuild/core'
import type { MockServerPluginOptions, PathFilter } from '../types'
import path from 'node:path'
import process from 'node:process'
import { isArray, objectEntries, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import { buildMockServer } from '../build'
import { createMockCompiler } from '../compiler'
import { createMockMiddleware, rewriteRequest } from '../mockHttp'
import { mockWebSocket } from '../mockWebsocket'
import { Recorder } from '../recorder'
import { resolvePluginOptions } from './options'

export function pluginMockServer(options: MockServerPluginOptions = {}): RsbuildPlugin {
  return {
    name: 'plugin-mock-server',

    setup(api) {
      // 禁用 mock 服务
      if (options.enabled === false)
        return

      const rsbuildConfig = api.getRsbuildConfig()
      const resolvedOptions = resolvePluginOptions(options, {
        proxies: resolveConfigProxies(rsbuildConfig),
        alias: {},
        context: api.context.rootPath,
        plugins: [new rspack.DefinePlugin(rsbuildConfig.source?.define || {})],
      })

      // 在构建生产包时，额外输出一个可部署的 mock 服务
      if (api.context.action === 'build') {
        if (resolvedOptions.build) {
          api.onAfterBuild(async () => {
            const config = api.getNormalizedConfig()
            await buildMockServer(
              resolvedOptions,
              path.resolve(process.cwd(), config.output.distPath.root || 'dist'),
            )
          })
        }
        // 仅在开发环境 和 预览环境 下启动 mock 服务
        return
      }

      const mockCompiler = createMockCompiler(resolvedOptions)

      // 合并 alias
      api.onAfterCreateCompiler(({ compiler }) => {
        if ('compilers' in compiler) {
          compiler.compilers.forEach((compiler) => {
            mockCompiler.updateAlias(compiler.options.resolve?.alias || {})
          })
        }
        else {
          mockCompiler.updateAlias(compiler.options.resolve?.alias || {})
        }
      })

      let recorder: Recorder | null = null
      if (resolvedOptions.record.enabled) {
        recorder = new Recorder(resolvedOptions.record)
      }

      function wrapProxyOptions(options: ProxyOptions): ProxyOptions {
        const plugins = (options.plugins ??= [])
        // 恢复代理请求数据流
        plugins.push(proxyServer => proxyServer.on('proxyReq', rewriteRequest))
        // 记录请求
        if (resolvedOptions.record.enabled && recorder) {
          plugins.push(recorder.getPlugin())
        }
        return options
      }

      api.modifyRsbuildConfig((config) => {
        if (!config.server?.proxy)
          return

        if (isArray(config.server.proxy)) {
          config.server.proxy = config.server.proxy.map(item => item.ws ? item : wrapProxyOptions(item))
        }
        else if (config.server.proxy) {
          const proxy = config.server.proxy
          Object.keys(proxy).forEach((key) => {
            const target = proxy[key]
            const options = typeof target === 'string' ? { target } : target
            if (options.ws)
              return
            proxy[key] = wrapProxyOptions(options)
          })
        }
      })

      function initMockServer(server: RsbuildServerBase | RsbuildDevServer) {
        server.middlewares.use(createMockMiddleware(mockCompiler, resolvedOptions))
        if (resolvedOptions.reload && api.context.action === 'dev')
          mockCompiler.on('update', () => (server as RsbuildDevServer).sockWrite('static-changed'))

        const shouldMockWs = toArray(resolvedOptions.wsPrefix).length > 0
        if (shouldMockWs)
          mockWebSocket(mockCompiler, server.httpServer, resolvedOptions)

        mockCompiler.run()
      }

      api.onBeforeStartDevServer(({ server }) => initMockServer(server))
      api.onBeforeStartPreviewServer(({ server }) => initMockServer(server))
      api.onExit(() => mockCompiler.close())
    },
  }
}

function resolveConfigProxies(config: RsbuildConfig): PathFilter[] {
  config.server ??= {}
  const proxy = (config.server!.proxy ??= {})
  const proxies: PathFilter[] = []

  if (isArray(proxy)) {
    for (const item of proxy) {
      if (item.pathFilter && !item.ws) {
        proxies.push(...toArray(item.pathFilter))
      }
    }
  }
  else {
    objectEntries(proxy).forEach(([pathFilter, opt]) => {
      if (typeof opt === 'string' || !opt.ws)
        proxies.push(pathFilter)
    })
  }
  return proxies
}
