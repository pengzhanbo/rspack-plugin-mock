import type { Server } from 'node:http'
import type { Http2SecureServer } from 'node:http2'
import type { WebSocket } from 'ws'
import type { MockCompiler } from '../compiler'
import type {
  MockRequest,
  MockServerPluginOptions,
  MockWebsocketItem,
  WebSocketSetupContext,
} from '../types'
import type { Logger } from '../utils'
import ansis from 'ansis'
import { WebSocketServer } from 'ws'
import { Cookies } from '../cookies'
import { doesProxyContextMatchUrl, isPathMatch, urlParse } from '../utils'
import { parseRequestParams } from './request'

type PoolMap = Map<string, WSSMap>
type WSSMap = Map<string, WebSocketServer>
type WSSContextMap = WeakMap<WebSocketServer, WSSContext>

interface Connection {
  req: MockRequest
  ws: WebSocket
}

interface WSSContext {
  cleanupList: (() => void)[]
  context: WebSocketSetupContext
  connectionList: Connection[]
}

export interface MockSocketOptions {
  wsProxies: (string | ((pathname: string, req: any) => boolean))[]
  cookiesOptions: MockServerPluginOptions['cookiesOptions']
  logger: Logger
}

export function mockWebSocket(
  compiler: MockCompiler,
  httpServer: Server | Http2SecureServer,
  {
    wsProxies: proxies,
    cookiesOptions,
    logger,
  }: MockSocketOptions,
): void {
  // 热更新文件映射
  const hmrMap = new Map<string, Set<string>>()
  // 连接池
  const poolMap: PoolMap = new Map()
  const wssContextMap: WSSContextMap = new WeakMap()

  const getWssMap = (mockUrl: string): WSSMap => {
    let wssMap = poolMap.get(mockUrl)
    if (!wssMap)
      poolMap.set(mockUrl, (wssMap = new Map()))

    return wssMap
  }

  const addHmr = (filepath: string, mockUrl: string) => {
    let urlList = hmrMap.get(filepath)
    if (!urlList)
      hmrMap.set(filepath, (urlList = new Set()))
    urlList.add(mockUrl)
  }

  const setupWss = (
    wssMap: WSSMap,
    wss: WebSocketServer,
    mock: MockWebsocketItem,
    context: WebSocketSetupContext,
    pathname: string,
    filepath: string,
  ) => {
    try {
      mock.setup?.(wss, context)
      wss.on('close', () => wssMap.delete(pathname))
      wss.on('error', (e) => {
        logger.error(
          `${ansis.red(
            `WebSocket mock error at ${wss.path}`,
          )}\n${e}\n  at setup (${filepath})`,
          mock.log,
        )
      })
    }
    catch (e) {
      logger.error(
        `${ansis.red(
          `WebSocket mock error at ${wss.path}`,
        )}\n${e}\n  at setup (${filepath})`,
        mock.log,
      )
    }
  }

  const restartWss = (
    wssMap: WSSMap,
    wss: WebSocketServer,
    mock: MockWebsocketItem,
    pathname: string,
    filepath: string,
  ) => {
    const { cleanupList, connectionList, context } = wssContextMap.get(wss)!
    // 重启/热更新时， 需要重新执行 setup()，在执行前，需要清除旧的循环/自动任务/监听
    // 多个客户端 ws 连接，每个 ws连接都需要清除旧的监听，并手动触发一次 connection 监听
    cleanupRunner(cleanupList)
    connectionList.forEach(({ ws }) => ws.removeAllListeners())
    wss.removeAllListeners()

    setupWss(wssMap, wss, mock, context, pathname, filepath)
    connectionList.forEach(({ ws, req }) =>
      emitConnection(wss, ws, req, connectionList),
    )
  }

  // 检测 ws 相关的 mock 文件更新
  // 如果 当前的 ws 配置已 建立 wss 连接，则重启该 wss 连接
  compiler.on('update', ({ filepath }) => {
    if (!hmrMap.has(filepath))
      return
    const mockUrlList = hmrMap.get(filepath)
    if (!mockUrlList)
      return
    for (const mockUrl of mockUrlList.values()) {
      for (const mock of compiler.mockData[mockUrl]) {
        if (!mock.ws || (mock as any).__filepath__ !== filepath)
          return
        const wssMap = getWssMap(mockUrl)
        for (const [pathname, wss] of wssMap.entries())
          restartWss(wssMap, wss, mock, pathname, filepath)
      }
    }
  })
  httpServer?.on('upgrade', (req, socket, head) => {
    const { pathname, query } = urlParse(req.url!)
    if (
      !pathname
      || proxies.length === 0
      || !proxies.some(context => doesProxyContextMatchUrl(context, req.url!, req))
    ) {
      return
    }
    const mockData = compiler.mockData
    const mockUrl = Object.keys(mockData).find(key => isPathMatch(key, pathname))
    if (!mockUrl)
      return

    const mock = mockData[mockUrl].find((mock) => {
      return mock.url && mock.ws && isPathMatch(mock.url, pathname)
    }) as MockWebsocketItem

    if (!mock)
      return

    const filepath = (mock as any).__filepath__

    addHmr(filepath, mockUrl)

    const wssMap = getWssMap(mockUrl)
    const wss = getWss(wssMap, pathname)

    let wssContext = wssContextMap.get(wss)!
    if (!wssContext) {
      const cleanupList: (() => void)[] = []
      const context: WebSocketSetupContext = {
        onCleanup: cleanup => cleanupList.push(cleanup),
      }
      wssContext = { cleanupList, context, connectionList: [] }
      wssContextMap.set(wss, wssContext)

      setupWss(wssMap, wss, mock, context, pathname, filepath)
    }

    const request = req as MockRequest
    const cookies = new Cookies(req, req as any, cookiesOptions)
    const { query: refererQuery } = urlParse(req.headers.referer || '')

    request.query = query
    request.refererQuery = refererQuery
    request.params = parseRequestParams(mockUrl, pathname)
    request.getCookie = cookies.get.bind(cookies)

    wss.handleUpgrade(request, socket, head, (ws) => {
      logger.info(
        `${ansis.magenta(ansis.bold('WebSocket'))} ${ansis.green(
          req.url,
        )} connected ${ansis.dim(`(${filepath})`)}`,
        mock.log,
      )
      wssContext.connectionList.push({ req: request, ws })

      emitConnection(wss, ws, request, wssContext.connectionList)
    })
  })

  httpServer?.on('close', () => {
    for (const wssMap of poolMap.values()) {
      for (const wss of wssMap.values()) {
        const wssContext = wssContextMap.get(wss)!
        cleanupRunner(wssContext.cleanupList)
        wss.close()
      }
      wssMap.clear()
    }
    poolMap.clear()
    hmrMap.clear()
  })
}

function getWss(wssMap: WSSMap, pathname: string): WebSocketServer {
  let wss = wssMap.get(pathname)
  if (!wss)
    wssMap.set(pathname, (wss = new WebSocketServer({ noServer: true })))

  return wss
}

function emitConnection(wss: WebSocketServer, ws: WebSocket, req: MockRequest, connectionList: Connection[]) {
  wss.emit('connection', ws, req)
  ws.on('close', () => {
    const i = connectionList.findIndex(item => item.ws === ws)
    if (i !== -1)
      connectionList.splice(i, 1)
  })
}

function cleanupRunner(cleanupList: WSSContext['cleanupList']) {
  let cleanup: (() => void) | undefined
  // eslint-disable-next-line no-cond-assign
  while ((cleanup = cleanupList.shift()))
    cleanup?.()
}
