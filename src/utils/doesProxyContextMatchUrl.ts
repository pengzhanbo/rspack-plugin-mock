import type http from 'node:http'

export function doesProxyContextMatchUrl(
  context: string | ((pathname: string, req: http.IncomingMessage) => boolean),
  url: string,
  req: http.IncomingMessage,
): boolean {
  if (typeof context === 'function') {
    return context(url, req)
  }
  return (
    (context[0] === '^' && new RegExp(context).test(url))
    || url.startsWith(context)
  )
}
