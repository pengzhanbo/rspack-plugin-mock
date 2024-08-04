import type * as http from 'node:http'
import process from 'node:process'
import { createServer } from 'node:http'
import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core'
import { isArray, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import color from 'picocolors'
import { getPortPromise } from 'portfinder'
import type { ProxyDetail } from '@rsbuild/core/dist-types/types'
import type { MockServerPluginOptions } from './types'
import { rewriteRequest } from './core/requestRecovery'
import { createMockMiddleware } from './core/mockMiddleware'
import type { ResolvePluginOptions } from './core/resolvePluginOptions'
import { resolvePluginOptions } from './core/resolvePluginOptions'
import type { MockCompiler } from './core/mockCompiler'
import { createMockCompiler } from './core/mockCompiler'
import { mockWebSocket } from './core/mockWebsocket'

export function pluginMockServer(options: MockServerPluginOptions = {}): RsbuildPlugin {
  return {
    name: 'plugin-mock-server',

    setup(api) {
      if (process.env.NODE_ENV === 'production')
        return

      let port = 3079
      api.modifyRsbuildConfig(async (config) => {
        const defaultPort = (config.server?.port || port) + 1
        port = await getPortPromise({ port: defaultPort })
      })

      let mockCompiler: MockCompiler | null = null
      let resolvedOptions!: ResolvePluginOptions

      api.modifyRsbuildConfig(updateServerProxyConfig)

      api.modifyRsbuildConfig((config) => {
        config.server ??= {}
        resolvedOptions = resolvePluginOptions(options, {
          proxies: resolveConfigProxies(config, options.wsPrefix || [], port),
          alias: {},
          context: api.context.rootPath,
          plugins: [new rspack.DefinePlugin(config.source?.define || {})],
        })

        mockCompiler = createMockCompiler(resolvedOptions)
        const mockMiddleware = createMockMiddleware(mockCompiler, resolvedOptions)

        config.dev ??= {}
        config.dev.setupMiddlewares ??= []
        config.dev.setupMiddlewares.push((middlewares, server) => {
          mockMiddleware(middlewares as any, () => server.sockWrite('static-changed'))
        })
      })

      api.onAfterCreateCompiler(({ compiler }) => {
        if ('compilers' in compiler) {
          compiler.compilers.forEach((compiler) => {
            mockCompiler?.updateAlias(compiler.options.resolve?.alias || {})
          })
        }
        else {
          mockCompiler?.updateAlias(compiler.options.resolve?.alias || {})
        }
      })

      function startMockServer() {
        if (!mockCompiler)
          return

        mockCompiler.run()
        const server = createServer()
        mockWebSocket(mockCompiler, server, resolvedOptions)
        server.listen(port)
      }

      api.onAfterStartDevServer(startMockServer)
      api.onAfterStartProdServer(startMockServer)
      api.onExit(() => mockCompiler?.close())
    },
  }
}

function updateServerProxyConfig(config: RsbuildConfig) {
  if (!config.server?.proxy)
    return

  const onProxyError = (
    err: Error,
    _req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    console.error(color.red(err?.stack || err.message))
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

type Proxies = (string | ((pathname: string, req: any) => boolean))[]

function resolveConfigProxies(
  config: RsbuildConfig,
  wsPrefix: string | string[],
  port: number,
): Proxies {
  const proxy = (config.server!.proxy ??= {})
  const proxies: Proxies = []
  const wsTarget = `ws://localhost:${port}`
  const prefix = toArray(wsPrefix)
  const has = (context: unknown) => typeof context === 'string' && prefix.includes(context)
  const used = new Set<string>()

  function updateProxy(item: ProxyDetail) {
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
      if (typeof item !== 'function' && item.context) {
        if (!item.ws) {
          proxies.push(...toArray(item.context))
        }
        else {
          updateProxy(item)
        }
      }
    }
    prefix.filter(context => !used.has(context)).forEach((context) => {
      proxy.push({ context, target: wsTarget })
    })
  }
  else if ('target' in proxy) {
    if (!proxy.ws) {
      proxies.push(...toArray(proxy.context as any))
    }
    else {
      updateProxy(proxy)
      const list = (config.server!.proxy = [proxy])
      prefix.filter(context => !used.has(context)).forEach((context) => {
        list.push({ context, target: wsTarget })
      })
    }
  }
  else {
    Object.entries(proxy).forEach(([context, opt]) => {
      if (typeof opt === 'string' || !opt.ws) {
        proxies.push(context)
      }
      if (typeof opt !== 'string' && opt.ws) {
        updateProxy(opt)
      }
    })
    prefix.filter(context => !used.has(context)).forEach((context) => {
      (proxy as Record<string, ProxyDetail>)[context] = { target: wsTarget, ws: true }
    })
  }
  return proxies
}
