import process from 'node:process'
import type { MockServerPluginOptions } from '../types'

export function resolvePluginOptions({
  prefix = [],
  // wsPrefix = [],
  cwd,
  include = ['mock/**/*.mock.{js,ts,cjs,mjs,json,json5}'],
  exclude = ['**/node_modules/**', '**/.vscode/**', '**/.git/**'],
  // reload = false,
  log = 'info',
  cors = true,
  formidableOptions = {},
  // build = false,
  cookiesOptions = {},
  bodyParserOptions = {},
  priority = {},
}: MockServerPluginOptions = {}, context?: string): Required<MockServerPluginOptions> {
  const pluginOptions: Required<MockServerPluginOptions> = {
    prefix,
    // wsPrefix,
    cwd: cwd || context || process.cwd(),
    include,
    exclude,
    // reload,
    cors,
    cookiesOptions,
    log,
    formidableOptions: {
      multiples: true,
      ...formidableOptions,
    },
    bodyParserOptions,
    priority,
    // build: build
    //   ? Object.assign(
    //     {
    //       serverPort: 8080,
    //       dist: 'mockServer',
    //       log: 'error',
    //     },
    //     typeof build === 'object' ? build : {},
    //   )
    //   : false,
  }
  return pluginOptions
}
