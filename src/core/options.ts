import type { Arrayable } from '@pengzhanbo/utils'
import type { RspackPluginInstance } from '@rspack/core'
import type { CorsOptions } from 'cors'
import type { MockServerPluginOptions, PathFilter, RecordOptions, ResolvedRecordOptions, ServerBuildOption } from '../types'
import type { Logger } from './logger'
import path from 'node:path'
import process from 'node:process'
import { isBoolean, isPlainObject, toArray } from '@pengzhanbo/utils'
import ansis from 'ansis'
import { createLogger } from '.'

export interface ResolvedCompilerOptions {
  alias: Record<string, Arrayable<false | string>>
  proxies: PathFilter[]
  wsProxies: PathFilter[]
  plugins: RspackPluginInstance[]
  context?: string
}

export type ResolvePluginOptions = Required<Omit<MockServerPluginOptions, 'build'>>
  & ResolvedCompilerOptions
  & {
    logger: Logger
    build: false | ServerBuildOption
    cors: false | CorsOptions
    record: ResolvedRecordOptions
    activeScene: string[]
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
    activeScene = [],
    record = false,
    replay,
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
  cwd = cwd || context || process.cwd()
  const resolvedRecord = resolveRecordOptions(cwd, dir, record)

  return {
    enabled: true,
    prefix,
    wsPrefix,
    cwd,
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
    activeScene: toArray(activeScene),
    record: resolvedRecord,
    replay: replay ?? resolvedRecord.enabled ?? false,
  }
}

/**
 * Resolve record options
 *
 * 解析录制配置
 *
 * @param cwd - Current working directory / 当前工作目录
 * @param dir - Mock context directory / 模拟上下文目录
 * @param record - Record options / 录制配置
 * @returns Resolved record options / 解析后的录制配置
 */
export function resolveRecordOptions(cwd: string, dir: string, record?: boolean | RecordOptions): ResolvedRecordOptions {
  // Parse record configuration
  const recordOptions = typeof record === 'boolean'
    ? { enabled: record }
    : record
  const expires = recordOptions?.expires ?? 0
  return {
    enabled: recordOptions?.enabled ?? false,
    cwd,
    dir: path.join(dir, recordOptions?.dir || '.recordings'),
    overwrite: recordOptions?.overwrite ?? true,
    status: toArray(recordOptions?.status).map(Number),
    expires: expires === 0 ? Number.MAX_SAFE_INTEGER : expires * 1000,
    gitignore: recordOptions?.gitignore ?? true,
    filter: recordOptions?.filter || (() => true),
  }
}
