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
import { toArray } from '@pengzhanbo/utils'
import color from 'picocolors'
import type { MockOptions } from '../types'
import { lookupFile, normalizePath } from './utils'
import { loadFromCode } from './loadFromCode'
import { transformMockData, transformRawData } from './transform'
import { resolveRspackOptions } from './resolveRspackOptions'

export interface MockCompilerOptions {
  alias?: Record<string, false | string | (string | false)[]>
  plugins: RspackPluginInstance[]
  cwd?: string
  include: string | string[]
  exclude: string | string[]
}

const vfs = createFsFromVolume(new Volume())

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

  private watchInfo?: {
    filepath: string
    type: 'add' | 'change' | 'unlink'
  }

  compiler?: Compiler | null

  constructor(public options: MockCompilerOptions) {
    super()
    this.cwd = options.cwd || process.cwd()
    const { include, exclude } = this.options

    this.fileFilter = createFilter(include, exclude, { resolve: false })

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
      const name = '[rspack:mock]'
      const logError = stats?.compilation.getLogger(name).error
        || ((...args: string[]) => console.error(color.red(name), ...args))

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
        return
      }

      // if (stats) {
      //   console.log('json name', stats.toJson().modules?.map(m => m.name).filter(name => name.startsWith('external')))
      // }

      const content = vfs.readFileSync(`/${this.outputFile}`, 'utf-8') as string
      try {
        const result = await loadFromCode({
          filepath: this.outputFile,
          code: content,
          isESM: this.moduleType === 'esm',
          cwd: this.cwd,
        })
        this._mockData = transformMockData(transformRawData(result))
        this.emit('update', this.watchInfo || {})
      }
      catch (e) {
        logError(e)
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
    const [firstGlob, ...otherGlob] = toArray(include)
    const watcher = (this.mockWatcher = chokidar.watch(firstGlob, {
      ignoreInitial: true,
      cwd: this.cwd,
    }))

    if (otherGlob.length > 0)
      otherGlob.forEach(glob => watcher.add(glob))

    watcher.on('add', (filepath) => {
      if (this.fileFilter(filepath)) {
        this.watchInfo = { filepath, type: 'add' }
        this.updateMockEntry()
      }
    })

    watcher.on('change', (filepath) => {
      if (this.fileFilter(filepath)) {
        this.watchInfo = { filepath, type: 'change' }
      }
    })

    watcher.on('unlink', async (filepath) => {
      this.watchInfo = { filepath, type: 'unlink' }
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
    const code = `${importers.join('\n')}\n\nexport default [\n  ${exporters.join(',\n  ')}\n]`
    const dirname = path.dirname(this.entryFile)

    if (!fs.existsSync(dirname)) {
      await fsp.mkdir(dirname, { recursive: true })
    }
    await fsp.writeFile(this.entryFile, code, 'utf8')
  }

  createCompiler(callback: (e: Error | null, stats?: rspackCore.Stats) => void) {
    const { plugins, alias } = this.options
    const options = resolveRspackOptions({
      isEsm: this.moduleType === 'esm',
      cwd: this.cwd,
      plugins,
      entryFile: this.entryFile,
      outputFile: this.outputFile,
      alias,
      watch: true,
    })

    this.compiler = rspackCore.rspack(options, callback)

    if (this.compiler)
      this.compiler.outputFileSystem = vfs
  }
}
