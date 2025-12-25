import type { Compiler } from '@rspack/core'
import type { FSWatcher } from 'chokidar'
import type { Matcher } from 'picomatch'
import type { ResolvePluginOptions } from '../options'
import type { MockOptions } from '../types'
import type { CompilerOptions } from './createRspackCompiler'
import EventEmitter from 'node:events'
import path from 'node:path'
import process from 'node:process'
import { uniq } from '@pengzhanbo/utils'
import chokidar from 'chokidar'
import { loadPackageJSONSync } from 'local-pkg'
import { glob } from 'tinyglobby'
import { writeMockEntryFile } from '../build'
import { createMatcher, normalizePath } from '../utils'
import { createCompiler } from './createRspackCompiler'
import { loadFromCode } from './loadFromCode'
import { processMockData, processRawData } from './processData'

export function createMockCompiler(options: ResolvePluginOptions): MockCompiler {
  return new MockCompiler(options)
}

export class MockCompiler extends EventEmitter {
  cwd: string
  mockWatcher!: FSWatcher
  entryFile!: string
  deps: string[] = []
  isESM: boolean = false
  private _mockData: Record<string, MockOptions> = {}

  private watchInfo?: {
    filepath: string
    type: 'add' | 'change' | 'unlink'
  }

  compiler?: Compiler | null

  constructor(public options: ResolvePluginOptions) {
    super()
    this.cwd = options.cwd || process.cwd()

    try {
      const pkg = loadPackageJSONSync(this.cwd)
      this.isESM = pkg?.type === 'module'
    }
    catch {}
    this.entryFile = path.resolve(process.cwd(), 'node_modules/.cache/mock-server/mock-server.ts')
  }

  get mockData(): Record<string, MockOptions> {
    return this._mockData
  }

  async run(): Promise<void> {
    const { include, exclude } = this.options
    const { pattern, ignore, isMatch } = createMatcher(include, exclude)
    const files = await glob(pattern, { ignore, cwd: path.join(this.cwd, this.options.dir) })
    this.deps = files.map(file => normalizePath(file))
    this.updateMockEntry()
    this.watchMockFiles(isMatch)

    const { plugins, alias } = this.options
    const options: CompilerOptions = {
      isEsm: this.isESM,
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
          isESM: this.isESM,
          cwd: this.cwd,
        })
        this._mockData = processMockData(processRawData(result))
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
    await writeMockEntryFile(this.entryFile, this.deps, this.cwd, this.options.dir)
  }

  watchMockFiles(isMatch: Matcher): void {
    const watcher = (this.mockWatcher = chokidar.watch(this.options.dir, {
      ignoreInitial: true,
      cwd: this.cwd,
      ignored: (filepath, stats) => {
        if (filepath.includes('node_modules'))
          return true
        return !!stats?.isFile() && !isMatch(filepath)
      },
    }))

    watcher.on('add', (filepath) => {
      filepath = normalizePath(filepath)
      if (isMatch(filepath)) {
        this.watchInfo = { filepath, type: 'add' }
        this.deps = uniq([...this.deps, filepath])
        this.updateMockEntry()
      }
    })

    watcher.on('change', (filepath) => {
      filepath = normalizePath(filepath)
      if (isMatch(filepath)) {
        this.watchInfo = { filepath, type: 'change' }
      }
    })

    watcher.on('unlink', async (filepath) => {
      filepath = normalizePath(filepath)
      if (isMatch(filepath)) {
        this.watchInfo = { filepath, type: 'unlink' }
        this.deps = this.deps.filter(dep => dep !== filepath)
        this.updateMockEntry()
      }
    })
  }
}
