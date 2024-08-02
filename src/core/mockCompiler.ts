import EventEmitter from 'node:events'
import type { FSWatcher } from 'node:fs'
import fs, { promises as fsp } from 'node:fs'
import process from 'node:process'
import path from 'node:path'
import type { Compiler, RspackPluginInstance } from '@rspack/core'
import fastGlob from 'fast-glob'
import chokidar from 'chokidar'
import { createFilter } from '@rollup/pluginutils'
import * as rspackCore from '@rspack/core'
import { Volume, createFsFromVolume } from 'memfs'
import type { MockOptions } from '../types'
import { getDirname, lookupFile, normalizePath } from './utils'
import { loadFromCode } from './loadFromCode'
import { transformMockData } from './transform'

export interface MockCompilerOptions {
  alias?: Record<string, false | string | (string | false)[]>
  plugins: RspackPluginInstance[]
  cwd?: string
  include: string[]
  exclude: string[]
}

const vfs = createFsFromVolume(new Volume())

const _dirname = getDirname(import.meta.url)

export function createMockCompiler(options: MockCompilerOptions) {
  return new MockCompiler(options)
}

export class MockCompiler extends EventEmitter {
  cwd: string
  mockWatcher!: FSWatcher
  moduleType: 'cjs' | 'esm' = 'cjs'
  entryFile!: string
  outputFile!: string
  private _mockData: Record<string, MockOptions> = {}
  private fileFilter!: (file: string) => boolean

  compiler?: Compiler | null

  constructor(public options: MockCompilerOptions) {
    super()
    this.cwd = options.cwd || process.cwd()
    const { include, exclude } = this.options

    this.fileFilter = createFilter(include, exclude, {
      resolve: false,
    })

    try {
      const pkg = lookupFile(this.cwd, ['package.json'])
      this.moduleType
        = !!pkg && JSON.parse(pkg).type === 'module' ? 'esm' : 'cjs'
    }
    catch {}
    this.entryFile = path.resolve(process.cwd(), 'node_modules/.cache/mock-server/mock-server.ts')
    this.outputFile = 'mock.bundle.js'
  }

  get mockData() {
    return this._mockData
  }

  async run() {
    await this.updateMockEntry()
    this.watchMockFiles()

    this.createCompiler(async (err, stats) => {
      if (err) {
        console.error('[rspack:mock-server]', err.stack || err)
        if ('details' in err) {
          console.error('[rspack:mock-server]', err.details)
        }
        return
      }

      if (stats?.hasErrors()) {
        console.error('[rspack:mock-server]', stats.toString({ colors: true }))
        return
      }

      const content = vfs.readFileSync(`/${this.outputFile}`, 'utf-8') as string
      try {
        const result = await loadFromCode({
          filepath: this.outputFile,
          code: content,
          isESM: this.moduleType === 'esm',
          cwd: this.cwd,
        })
        this._mockData = transformMockData(result)
        this.emit('update')
      }
      catch (e) {
        console.error('[rspack:mock-server]', e)
      }
    })
  }

  close() {
    this.mockWatcher.close()
    this.compiler?.close(() => {})
    this.emit('close')
  }

  updateAlias(alias: Record<string, false | string | (string | false)[]>) {
    this.options.alias = {
      ...this.options.alias,
      ...alias,
    }
  }

  async updateMockEntry() {
    const files = await this.getMockFiles()
    await this.resolveEntryFile(files)
  }

  async getMockFiles(): Promise<string[]> {
    const { include } = this.options
    const files = await fastGlob(include, { cwd: this.cwd })
    return files.filter(this.fileFilter)
  }

  watchMockFiles() {
    const { include } = this.options
    const [firstGlob, ...otherGlob] = include
    const watcher = (this.mockWatcher = chokidar.watch(firstGlob, {
      ignoreInitial: true,
      cwd: this.cwd,
    }))

    if (otherGlob.length > 0)
      otherGlob.forEach(glob => watcher.add(glob))

    watcher.on('add', () => {
      this.updateMockEntry()
    })

    watcher.on('unlink', async () => {
      this.updateMockEntry()
    })
  }

  async resolveEntryFile(fileList: string[]) {
    const importers: string[] = []
    const exporters: string[] = []
    for (const [index, filepath] of fileList.entries()) {
      const file = normalizePath(path.join(this.cwd, filepath))
      importers.push(`import * as m${index} from '${file}'`)
      exporters.push(`[m${index}, '${filepath}']`)
    }
    const code = `\
${importers.join('\n')}\n
const exporters = [
  ${exporters.join(',\n  ')}
] as (readonly [any, string])[]\n
export default exporters.map(([raw, __filepath__]) => {
  if (!raw) return
  let mockConfig
  if (raw.default) {
    if (Array.isArray(raw.default)) {
      mockConfig = raw.default.map(item => ({ ...item, __filepath__ }))
    } else {
      mockConfig = { ...raw.default, __filepath__ }
    }
  } else if ('url' in raw) {
    mockConfig = { ...raw, __filepath__ }
  } else {
    mockConfig = []
    Object.keys(raw || {}).forEach((key) => {
      if (Array.isArray(raw[key])) {
        mockConfig.push(...raw[key].map(item => ({ ...item, __filepath__ })))
      } else {
        mockConfig.push({ ...raw[key], __filepath__ })
      }
    })
  }
  return mockConfig
})`
    const dirname = path.dirname(this.entryFile)

    if (!fs.existsSync(dirname)) {
      await fsp.mkdir(dirname, { recursive: true })
    }
    await fsp.writeFile(this.entryFile, code, 'utf8')
  }

  createCompiler(callback: (e: Error | null, res?: rspackCore.Stats) => void) {
    const isEsm = this.moduleType === 'esm'
    const targets = ['node >= 18.0.0']
    this.compiler = rspackCore.rspack({
      mode: 'production',
      context: this.cwd,
      entry: this.entryFile,
      watch: true,
      target: 'node18.0',
      externalsType: isEsm ? 'module' : 'commonjs2',
      externals: /^[^./].*/,
      resolve: {
        alias: this.options.alias,
        extensions: ['.js', '.ts', '.cjs', '.mjs', '.json5', '.json'],
      },
      plugins: [...this.options.plugins],
      output: {
        library: { type: !isEsm ? 'commonjs2' : 'module' },
        filename: this.outputFile,
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
    }, callback)

    if (this.compiler)
      this.compiler.outputFileSystem = vfs

    return this.compiler
  }
}
