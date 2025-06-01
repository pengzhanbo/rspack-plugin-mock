import type { Compiler, RspackPluginInstance } from '@rspack/core'
import type { FSWatcher } from 'node:fs'
import type { MockOptions } from '../types'
import type { CompilerOptions } from './createRspackCompiler'
import type { Logger } from './logger'
import EventEmitter from 'node:events'
import path from 'node:path'
import process from 'node:process'
import { toArray } from '@pengzhanbo/utils'
import { createFilter } from '@rollup/pluginutils'
import chokidar from 'chokidar'
import fastGlob from 'fast-glob'
import { writeMockEntryFile } from './build'
import { createCompiler } from './createRspackCompiler'
import { loadFromCode } from './loadFromCode'
import { transformMockData, transformRawData } from './transform'
import { lookupFile } from './utils'

export interface MockCompilerOptions {
  alias?: Record<string, false | string | (string | false)[]>
  plugins: RspackPluginInstance[]
  cwd?: string
  include: string | string[]
  exclude: string | string[]
  logger: Logger
}

export function createMockCompiler(options: MockCompilerOptions): MockCompiler {
  return new MockCompiler(options)
}

export class MockCompiler extends EventEmitter {
  cwd: string
  mockWatcher!: FSWatcher
  moduleType: 'cjs' | 'esm' = 'cjs'
  entryFile!: string
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
  }

  get mockData(): Record<string, MockOptions> {
    return this._mockData
  }

  async run(): Promise<void> {
    await this.updateMockEntry()
    this.watchMockFiles()

    const { plugins, alias } = this.options
    const options: CompilerOptions = {
      isEsm: this.moduleType === 'esm',
      cwd: this.cwd,
      plugins,
      entryFile: this.entryFile,
      alias,
      watch: true,
    }

    this.compiler = createCompiler(options, async ({ code }) => {
      try {
        const result = await loadFromCode({
          filepath: 'mock.bundle.js',
          code,
          isESM: this.moduleType === 'esm',
          cwd: this.cwd,
        })
        this._mockData = transformMockData(transformRawData(result))
        this.emit('update', this.watchInfo || {})
      }
      catch (e: any) {
        this.options.logger.error(e.stack || e.message)
      }
    })
  }

  close(): void {
    this.mockWatcher.close()
    this.compiler?.close(() => {})
    this.emit('close')
  }

  updateAlias(alias: Record<string, false | string | (string | false)[]>): void {
    this.options.alias = {
      ...this.options.alias,
      ...alias,
    }
  }

  async updateMockEntry(): Promise<void> {
    const files = await this.getMockFiles()
    await writeMockEntryFile(this.entryFile, files, this.cwd)
  }

  async getMockFiles(): Promise<string[]> {
    const { include } = this.options
    const files = await fastGlob(include, { cwd: this.cwd })
    return files.filter(this.fileFilter)
  }

  watchMockFiles(): void {
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
}
