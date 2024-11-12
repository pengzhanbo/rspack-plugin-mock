import type { ProxyOptions, RsbuildConfig, RsbuildPlugin } from '@rsbuild/core'
import type * as http from 'node:http'
import type { MockServerPluginOptions } from './types'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { isArray, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import color from 'picocolors'
import { getPortPromise } from 'portfinder'
import { buildMockServer } from './core/build'
import { createMockCompiler } from './core/mockCompiler'
import { createMockMiddleware } from './core/mockMiddleware'
import { mockWebSocket } from './core/mockWebsocket'
import { rewriteRequest } from './core/requestRecovery'
import { resolvePluginOptions } from './core/resolvePluginOptions'

export * from './types'

export function pluginMockServer(options: MockServerPluginOptions = {}): RsbuildPlugin {
  return {
    name: 'plugin-mock-server',

    setup(api) {
      const rsbuildConfig = api.getRsbuildConfig()
      const resolvedOptions = resolvePluginOptions(options, {
        proxies: resolveConfigProxies(rsbuildConfig),
        alias: {},
        context: api.context.rootPath,
        plugins: [new rspack.DefinePlugin(rsbuildConfig.source?.define || {})],
      })

      // 在构建生产包时，额外输出一个可部署的 mock 服务
      if (process.env.NODE_ENV === 'production') {
        if (resolvedOptions.build) {
          api.onAfterBuild(async () => {
            const config = api.getNormalizedConfig()
            await buildMockServer(
              resolvedOptions,
              path.resolve(process.cwd(), config.output.distPath.root || 'dist'),
            )
          })
        }
        return
      }

      const mockCompiler = createMockCompiler(resolvedOptions)

      api.modifyRsbuildConfig((config) => {
        updateServerProxyConfigByHttpMock(config)
        const mockMiddleware = createMockMiddleware(mockCompiler, resolvedOptions)

        config.dev ??= {}
        config.dev.setupMiddlewares ??= []
        config.dev.setupMiddlewares.push((middlewares, server) => {
          mockMiddleware(middlewares as any, () => server.sockWrite('static-changed'))
        })
      })

      let port = 3079
      const shouldMockWs = toArray(resolvedOptions.wsPrefix).length > 0
      if (shouldMockWs) {
        api.modifyRsbuildConfig(async (config) => {
          const defaultPort = (config.server?.port || port) + 1
          port = await getPortPromise({ port: defaultPort })
          updateServerProxyConfigByWSMock(config, options.wsPrefix || [], port)
        })
      }

      let server: http.Server
      function startMockServer() {
        mockCompiler.run()
        if (shouldMockWs) {
          server = createServer()
          mockWebSocket(mockCompiler, server, resolvedOptions)
          server.listen(port)
        }
      }

      function close() {
        mockCompiler.close()
        server?.close()
      }

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

      api.onAfterStartDevServer(startMockServer)
      api.onAfterStartProdServer(startMockServer)
      api.onExit(close)
    },
  }
}

function onProxyError(err: Error, _req: http.IncomingMessage, res: http.ServerResponse) {
  console.error(color.red(err?.stack || err.message))
  res.statusCode = 500
  res.end()
}

function updateServerProxyConfigByHttpMock(config: RsbuildConfig) {
  if (!config.server?.proxy)
    return

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
        onProxyReq: (
          proxyReq: http.ClientRequest,
          req: http.IncomingMessage,
          ...args: any[]
        ) => {
          onProxyReq?.(proxyReq, req, ...args)
          rewriteRequest(proxyReq, req)
        },
        onError: onError || onProxyError,
      }
    })
  }
}

function updateServerProxyConfigByWSMock(config: RsbuildConfig, wsPrefix: string | string[], port: number) {
  config.server ??= {}
  const proxy = (config.server!.proxy ??= {})
  const wsTarget = `ws://localhost:${port}`
  const prefix = toArray(wsPrefix)
  const has = (context: unknown) => typeof context === 'string' && prefix.includes(context)
  const used = new Set<string>()

  function updateProxy(item: ProxyOptions) {
    if (isArray(item.context)) {
      item.context = item.context.filter(has)
    }
    else if (has(item.context)) {
      used.add(item.context as string)
      item.target = wsTarget
    }
  }

  if (isArray(proxy)) {
    for (const item of proxy) {
      if (typeof item !== 'function' && item.context && item.ws) {
        updateProxy(item)
      }
    }
    prefix.filter(context => !used.has(context))
      .forEach(context => proxy.push({ context, target: wsTarget }))
  }
  else if ('target' in proxy) {
    if (proxy.ws) {
      updateProxy(proxy)
      const list = (config.server!.proxy = [proxy])
      prefix.filter(context => !used.has(context))
        .forEach(context => list.push({ context, target: wsTarget }))
    }
  }
  else {
    Object.entries(proxy).forEach(([, opt]) => {
      if (typeof opt !== 'string' && opt.ws) {
        updateProxy(opt)
      }
    })
    prefix.filter(context => !used.has(context)).forEach((context) => {
      (proxy as Record<string, ProxyOptions>)[context] = { target: wsTarget, ws: true }
    })
  }
}

type Proxies = (string | ((pathname: string, req: any) => boolean))[]

function resolveConfigProxies(config: RsbuildConfig): Proxies {
  config.server ??= {}
  const proxy = (config.server!.proxy ??= {})
  const proxies: Proxies = []

  if (isArray(proxy)) {
    for (const item of proxy) {
      if (typeof item !== 'function' && item.context && !item.ws) {
        proxies.push(...toArray(item.context))
      }
    }
  }
  else if ('target' in proxy) {
    if (!proxy.ws)
      proxies.push(...toArray(proxy.context as any))
  }
  else {
    Object.entries(proxy).forEach(([context, opt]) => {
      if (typeof opt === 'string' || !opt.ws)
        proxies.push(context)
    })
  }
  return proxies
}
