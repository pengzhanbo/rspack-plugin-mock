import type { RspackPluginInstance } from '@rspack/core'
import type { CorsOptions } from 'cors'
import type http from 'node:http'
import type { MockServerPluginOptions, ServerBuildOption } from './types'
import type { Logger } from './utils'
import process from 'node:process'
import { isBoolean, isPlainObject, toArray } from '@pengzhanbo/utils'
import ansis from 'ansis'
import { createLogger } from './utils'

export interface ResolvedCompilerOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: http.IncomingMessage) => boolean))[]
  wsProxies: (string | ((pathname: string, req: http.IncomingMessage) => boolean))[]
  plugins: RspackPluginInstance[]
  context?: string
  cors: false | CorsOptions
}

export type ResolvePluginOptions = Required<Omit<MockServerPluginOptions, 'build'>>
  & ResolvedCompilerOptions
  & {
    logger: Logger
    build: false | ServerBuildOption
  }

export function resolvePluginOptions(
  {
    prefix = [],
    wsPrefix = [],
    cwd,
    dir = 'mock',
    include = ['**/*.mock.{js,ts,cjs,mjs,json,json5}'],
    exclude = [],
    reload = false,
    log = 'info',
    cors = true,
    formidableOptions = {},
    build = false,
    cookiesOptions = {},
    bodyParserOptions = {},
    priority = {},
  }: MockServerPluginOptions,
  { alias, context, plugins, proxies: rawProxies }: Omit<ResolvedCompilerOptions, 'wsProxies' | 'cors'>,
): ResolvePluginOptions {
  const logger = createLogger(
    'rspack:mock',
    isBoolean(log) ? (log ? 'info' : 'error') : log,
  )

  const proxies = [...toArray(prefix), ...rawProxies]
  const wsProxies = toArray(wsPrefix)

  if (!proxies.length && !wsProxies.length)
    logger.warn(`No proxy was configured, mock server will not work. See ${ansis.cyan('https://vite-plugin-mock-dev-server.netlify.app/guide/usage')}`)

  // enable cors by default
  const enabled = !!cors
  let corsOptions: CorsOptions = {}

  if (enabled && isPlainObject(cors)) {
    corsOptions = {
      ...corsOptions,
      ...cors,
    }
  }

  return {
    prefix,
    wsPrefix,
    cwd: cwd || context || process.cwd(),
    dir,
    include,
    exclude,
    reload,
    cors: enabled ? corsOptions : false,
    cookiesOptions,
    log,
    formidableOptions: {
      multiples: true,
      ...formidableOptions,
    },
    bodyParserOptions,
    priority,
    build: build
      ? {
          serverPort: 8080,
          dist: 'mockServer',
          log: 'error',
          ...typeof build === 'object' ? build : {},
        }
      : false,
    alias,
    plugins,
    proxies,
    wsProxies,
    logger,
  }
}
