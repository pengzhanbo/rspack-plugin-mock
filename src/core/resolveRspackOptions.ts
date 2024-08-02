import path from 'node:path'
import type { RspackOptions, RspackPluginInstance } from '@rspack/core'
import { getDirname } from './utils'

const _dirname = getDirname(import.meta.url)

export interface ResolveRspackOptions {
  cwd: string
  isEsm: boolean
  entryFile: string
  outputFile: string
  plugins: RspackPluginInstance[]
  alias?: Record<string, false | string | (string | false)[]>
  watch?: boolean
}
export function resolveRspackOptions({
  cwd,
  isEsm,
  entryFile,
  outputFile,
  plugins,
  alias,
  watch = false,
}: ResolveRspackOptions): RspackOptions {
  const targets = ['node >= 18.0.0']
  return {
    mode: 'production',
    context: cwd,
    entry: entryFile,
    watch,
    target: 'node18.0',
    externalsType: isEsm ? 'module' : 'commonjs2',
    externals: /^[^./].*/,
    resolve: {
      alias,
      extensions: ['.js', '.ts', '.cjs', '.mjs', '.json5', '.json'],
    },
    plugins,
    output: {
      library: { type: !isEsm ? 'commonjs2' : 'module' },
      filename: outputFile,
      path: '/',
    },
    experiments: { outputModule: isEsm },
    module: {
      rules: [
        {
          test: /\.json5?$/,
          loader: path.join(_dirname, 'json5-loader.cjs'),
          type: 'javascript/auto',
        },
        {
          test: /\.[cm]?js$/,
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: { parser: { syntax: 'ecmascript' } },
                env: { targets },
              },
            },
          ],
        },
        {
          test: /\.[cm]?ts$/,
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: { parser: { syntax: 'typescript' } },
                env: { targets },
              },
            },
          ],
        },
      ],
    },
  }
}
