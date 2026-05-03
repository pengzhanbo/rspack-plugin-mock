import type { RspackPluginInstance } from '@rspack/core'
import type { MockCompiler } from '../compiler/mockCompiler'
import type { ResolvePluginOptions } from '../options'
import type { Middleware } from './types'
import { baseMiddleware } from './mockMiddleware'

export interface MiddlewareOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: any) => boolean))[]
  context?: string
  plugins: RspackPluginInstance[]
}

export function initMockMiddleware(
  compiler: MockCompiler,
  options: ResolvePluginOptions,
): (middlewares: Middleware[], reload?: () => void) => Middleware[] {
  return function mockMiddleware(middlewares, reload) {
    middlewares.unshift(baseMiddleware(compiler, options))

    if (options.reload) {
      compiler.on('update', () => reload?.())
    }

    return middlewares
  }
}
