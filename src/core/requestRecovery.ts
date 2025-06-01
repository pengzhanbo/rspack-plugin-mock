import type * as http from 'node:http'
/**
 * 请求复原
 *
 * 由于 parseReqBody 在解析请求时，会将请求流消费，
 * 导致当接口不需要被 mock，继而由 vite http-proxy 转发时，请求流无法继续。
 * 为此，我们在请求流中记录请求数据，当当前请求无法继续时，可以从备份中恢复请求流
 */
import { Buffer } from 'node:buffer'

export const requestCollectCache: WeakMap<http.IncomingMessage, Buffer> = new WeakMap()

// 备份请求数据
export function collectRequest(req: http.IncomingMessage): void {
  const chunks: Buffer[] = []
  req.addListener('data', (chunk) => {
    chunks.push(Buffer.from(chunk))
  })
  req.addListener('end', () => {
    if (chunks.length)
      requestCollectCache.set(req, Buffer.concat(chunks))
  })
}

export function rewriteRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage): void {
  const buffer = requestCollectCache.get(req)
  if (buffer) {
    requestCollectCache.delete(req)
    if (!proxyReq.headersSent)
      proxyReq.setHeader('Content-Length', buffer.byteLength)

    if (!proxyReq.writableEnded)
      proxyReq.write(buffer)
  }
}
