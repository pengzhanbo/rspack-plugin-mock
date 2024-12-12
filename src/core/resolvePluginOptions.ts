import type { RspackPluginInstance } from '@rspack/core'
import type { MockServerPluginOptions, ServerBuildOption } from '../types'
import process from 'node:process'
import { isBoolean, toArray } from '@pengzhanbo/utils'
import { createLogger, type Logger } from './logger'

export interface ResolvedCompilerOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: any) => boolean))[]
  wsProxies: (string | ((pathname: string, req: any) => boolean))[]
  plugins: RspackPluginInstance[]
  context?: string
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
    include = ['mock/**/*.mock.{js,ts,cjs,mjs,json,json5}'],
    exclude = ['**/node_modules/**', '**/.vscode/**', '**/.git/**'],
    reload = false,
    log = 'info',
    cors = true,
    formidableOptions = {},
    build = false,
    cookiesOptions = {},
    bodyParserOptions = {},
    priority = {},
  }: MockServerPluginOptions = {},
  { alias, context, plugins, proxies }: Omit<ResolvedCompilerOptions, 'wsProxies'>,
): ResolvePluginOptions {
  const logger = createLogger(
    'rspack:mock',
    isBoolean(log) ? (log ? 'info' : 'error') : log,
  )
  prefix = toArray(prefix)

  return {
    prefix,
    wsPrefix,
    cwd: cwd || context || process.cwd(),
    include,
    exclude,
    reload,
    cors,
    cookiesOptions,
    log,
    formidableOptions: {
      multiples: true,
      ...formidableOptions,
    },
    bodyParserOptions,
    priority,
    build: build
      ? Object.assign(
          {
            serverPort: 8080,
            dist: 'mockServer',
            log: 'error',
          },
          typeof build === 'object' ? build : {},
        )
      : false,
    alias,
    plugins,
    proxies: [...proxies, ...prefix],
    wsProxies: toArray(wsPrefix),
    logger,
  }
}
