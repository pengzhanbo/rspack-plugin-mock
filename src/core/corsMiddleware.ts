import type { CorsOptions } from 'cors'
import type http from 'node:http'
import type { MockCompiler } from '../compiler/mockCompiler'
import type { ResolvePluginOptions } from '../options'
import type { Middleware } from './types'
import cors from 'cors'
import { doesProxyContextMatchUrl, isPathMatch, urlParse } from '../utils'

export function createCorsMiddleware(
  compiler: MockCompiler,
  options: ResolvePluginOptions,
): Middleware | undefined {
  let corsOptions: CorsOptions = {}

  // enable cors by default
  const enabled = options.cors !== false

  if (enabled) {
    corsOptions = {
      ...corsOptions,
      ...(typeof options.cors === 'boolean' ? {} : options.cors),
    }
  }

  const proxies = options.proxies

  return !enabled
    ? undefined
    : function (req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void) {
      const { pathname } = urlParse(req.url!)
      if (
        !pathname
        || proxies.length === 0
        || !proxies.some(context =>
          doesProxyContextMatchUrl(context, req.url!, req),
        )
      ) {
        return next()
      }

      const mockData = compiler.mockData

      const mockUrl = Object.keys(mockData).find(key => isPathMatch(key, pathname))

      if (!mockUrl)
        return next()

      cors(corsOptions)(req, res, next)
    }
}
