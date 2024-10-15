import type { Compiler, RspackOptions, RspackPluginInstance } from '@rspack/core'
import { createRequire } from 'node:module'
import * as rspackCore from '@rspack/core'
import isCore from 'is-core-module'
import color from 'picocolors'
import { vfs } from './utils'

const require = createRequire(import.meta.url)

export interface CompilerOptions {
  cwd: string
  isEsm?: boolean
  entryFile: string
  plugins: RspackPluginInstance[]
  alias?: Record<string, false | string | (string | false)[]>
  watch?: boolean
}

export function createCompiler(
  options: CompilerOptions,
  callback: (result: { code: string, externals: string[] }) => Promise<void> | void,
): Compiler | null {
  const rspackOptions = resolveRspackOptions(options)
  const isWatch = rspackOptions.watch === true

  async function handler(err: Error | null, stats?: rspackCore.Stats) {
    const name = '[rspack:mock]'
    const logError = (...args: any[]) => {
      if (stats) {
        stats.compilation.getLogger(name).error(...args)
      }
      else {
        console.error(color.red(name), ...args)
      }
    }

    if (err) {
      logError(err.stack || err)
      if ('details' in err) {
        logError(err.details)
      }
      return
    }

    if (stats?.hasErrors()) {
      const info = stats.toJson()
      logError(info.errors)
    }

    const code = vfs.readFileSync('/output.js', 'utf-8') as string
    const externals: string[] = []

    if (!isWatch) {
      const modules = stats?.toJson().modules || []
      const aliasList = Object.keys(options.alias || {}).map(key => key.replace(/\$$/g, ''))
      for (const { name } of modules) {
        if (name?.startsWith('external')) {
          const packageName = normalizePackageName(name)
          if (!isCore(packageName) && !aliasList.includes(packageName))
            externals.push(normalizePackageName(name))
        }
      }
    }

    await callback({ code, externals })
  }

  const compiler = rspackCore.rspack(rspackOptions, isWatch ? handler : undefined)

  if (compiler)
    compiler.outputFileSystem = vfs as unknown as rspackCore.OutputFileSystem

  if (!isWatch) {
    compiler?.run(async (...args) => {
      await handler(...args)
      compiler!.close(() => {})
    })
  }
  return compiler
}

export function transformWithRspack(options: Omit<CompilerOptions, 'watch'>): Promise<{ code: string, externals: string[] }> {
  return new Promise((resolve) => {
    createCompiler({ ...options, watch: false }, (result) => {
      resolve(result)
    })
  })
}

function normalizePackageName(name: string): string {
  const filepath = name.replace('external ', '').slice(1, -1)
  const [scope, packageName] = filepath.split('/')
  if (filepath[0] === '@') {
    return `${scope}/${packageName}`
  }
  return scope
}

function resolveRspackOptions({
  cwd,
  isEsm = true,
  entryFile,
  plugins,
  alias,
  watch = false,
}: CompilerOptions): RspackOptions {
  const targets = ['node >= 18.0.0']
  if (alias && '@swc/helpers' in alias) {
    delete alias['@swc/helpers']
  }

  return {
    mode: 'production',
    context: cwd,
    entry: entryFile,
    watch,
    target: 'node18.0',
    externalsType: isEsm ? 'module' : 'commonjs2',
    resolve: {
      alias,
      extensions: ['.js', '.ts', '.cjs', '.mjs', '.json5', '.json'],
    },
    plugins,
    output: {
      library: { type: !isEsm ? 'commonjs2' : 'module' },
      filename: 'output.js',
      path: '/',
    },
    experiments: { outputModule: isEsm },
    optimization: { minimize: !watch },
    module: {
      rules: [
        {
          test: /\.json5?$/,
          loader: require.resolve('#json5-loader'),
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
