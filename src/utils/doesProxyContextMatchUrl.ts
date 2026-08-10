import type http from 'node:http'
import type { PathFilter } from '../types/index.js'

const PATTERN_CACHE = new Map<string, RegExp>()

export function doesProxyContextMatchUrl(context: PathFilter, req: http.IncomingMessage): boolean {
  const url = req.url!
  if (typeof context === 'function') {
    return !!context(url, req)
  }
  if (context[0] === '^') {
    let pattern = PATTERN_CACHE.get(context)
    if (!pattern) {
      PATTERN_CACHE.set(context, (pattern = new RegExp(context)))
    }
    return pattern.test(url)
  }
  return url.startsWith(context)
}
