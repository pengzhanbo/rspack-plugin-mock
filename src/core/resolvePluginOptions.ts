import process from 'node:process'
import type { RspackPluginInstance } from '@rspack/core'
import { isBoolean, toArray, uniq } from '@pengzhanbo/utils'
import type { MockServerPluginOptions } from '../types'
import { type Logger, createLogger } from './logger'

export interface ResolvedCompilerOptions {
  alias: Record<string, false | string | (string | false)[]>
  proxies: (string | ((pathname: string, req: any) => boolean))[]
  wsProxies: (string | ((pathname: string, req: any) => boolean))[]
  plugins: RspackPluginInstance[]
  context?: string
}

export type ResolvePluginOptions = Required<MockServerPluginOptions>
  & ResolvedCompilerOptions
  & {
    logger: Logger
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
    proxies,
    wsProxies: toArray(wsPrefix),
    logger,
  }
}
