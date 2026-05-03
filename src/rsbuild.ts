import type { ProxyOptions, RsbuildConfig, RsbuildPlugin } from '@rsbuild/core'
import type * as http from 'node:http'
import type { MockServerPluginOptions } from './types'
import { createServer } from 'node:http'
import { Socket } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { isArray, toArray } from '@pengzhanbo/utils'
import rspack from '@rspack/core'
import ansis from 'ansis'
import { getPortPromise } from 'portfinder'
import { buildMockServer } from './build'
import { createMockCompiler } from './compiler'
import { baseMiddleware, mockWebSocket, rewriteRequest } from './core'
import { resolvePluginOptions } from './options'

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

        // 注册 mock 中间件
        config.server ??= {}
        config.server.setup = toArray(config.server.setup)
        config.server.setup.push(({ server, action }) => {
          server.middlewares.use(baseMiddleware(mockCompiler, resolvedOptions))
          if (resolvedOptions.reload && action === 'dev') {
            mockCompiler.on('update', () => server.sockWrite('static-changed'))
          }
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
      api.onAfterStartPreviewServer(startMockServer)
      api.onExit(close)
    },
  }
}

function onProxyError(err: Error, _req: http.IncomingMessage, res: http.ServerResponse | Socket) {
  console.error(ansis.red(err?.stack || err.message))
  if (!(res instanceof Socket))
    res.statusCode = 500
  res.end()
}

function updateServerProxyConfigByHttpMock(config: RsbuildConfig) {
  if (!config.server?.proxy)
    return

  if (isArray(config.server.proxy)) {
    config.server.proxy = config.server.proxy.map((item) => {
      if (typeof item !== 'function' && !item.ws) {
        const on = (item.on ??= {})
        const onProxyReq = on.proxyReq
        const onError = on.error
        return {
          ...item,
          on: {
            ...on,
            error: onError || onProxyError,
            proxyReq: (proxyReq, req, ...args) => {
              onProxyReq?.(proxyReq, req, ...args)
              rewriteRequest(proxyReq, req)
            },
          },
        }
      }
      return item
    })
  }
  else if (config.server.proxy) {
    const proxy = config.server.proxy
    Object.keys(proxy).forEach((key) => {
      const target = proxy[key]
      const options = typeof target === 'string' ? { target } : target
      if (options.ws)
        return

      const { on, ...rest } = options

      proxy[key] = {
        ...rest,
        on: {
          ...on,
          proxyReq: (proxyReq, req, ...args) => {
            on?.proxyReq?.(proxyReq, req, ...args)
            rewriteRequest(proxyReq, req)
          },
          error: on?.error || onProxyError,
        },
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
    if (isArray(item.pathFilter)) {
      item.pathFilter = item.pathFilter.filter(has)
    }
    else if (has(item.pathFilter)) {
      used.add(item.pathFilter as string)
      item.target = wsTarget
    }
  }

  if (isArray(proxy)) {
    for (const item of proxy) {
      if (typeof item !== 'function' && item.pathFilter && item.ws) {
        updateProxy(item)
      }
    }
    prefix.filter(pathFilter => !used.has(pathFilter))
      .forEach(pathFilter => proxy.push({ pathFilter, target: wsTarget }))
  }
  else if ('target' in proxy) {
    if (proxy.ws) {
      updateProxy(proxy)
      const list = (config.server!.proxy = [proxy])
      prefix.filter(pathFilter => !used.has(pathFilter))
        .forEach(pathFilter => list.push({ pathFilter, target: wsTarget }))
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
      if (typeof item !== 'function' && item.pathFilter && !item.ws) {
        proxies.push(...toArray(item.pathFilter))
      }
    }
  }
  else {
    Object.entries(proxy).forEach(([pathFilter, opt]) => {
      if (typeof opt === 'string' || !opt.ws)
        proxies.push(pathFilter)
    })
  }
  return proxies
}
